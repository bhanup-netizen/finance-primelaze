/**
 * Primelaze dashboard — dispatch notification Cloud Functions.
 *
 * Exposes a single callable function, `sendDispatchNotification`, that the
 * dashboard calls when a Casovil lead is moved to the "Dispatched" stage. It
 * sends the customer a WhatsApp message (Meta WhatsApp Cloud API) and/or an SMS
 * (MSG91) with the courier + AWB tracking details, and records every send in
 * the Firestore `notifications` collection for audit.
 *
 * Only a signed-in dashboard user can invoke it. All provider credentials live
 * in Functions secrets / env config — never in the browser.
 *
 * Region: asia-south1 (Mumbai) — closest to India for lowest latency.
 *
 * See MESSAGING-setup.md in the repo root for the full setup + deploy guide.
 */
"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const REGION = "asia-south1";

// ---- Secrets (set with: firebase functions:secrets:set NAME) --------------
// Sensitive tokens. Bound to the function via the `secrets` option below and
// exposed as process.env.<NAME> at runtime — never bundled into the client.
const WHATSAPP_TOKEN = defineSecret("WHATSAPP_TOKEN"); // Meta permanent access token
const MSG91_AUTHKEY = defineSecret("MSG91_AUTHKEY");   // MSG91 auth key

// ---- Non-secret config (set in functions/.env or as env vars) -------------
// WhatsApp (Meta Cloud API)
const WA_PHONE_ID = () => process.env.WHATSAPP_PHONE_ID || "";     // Phone number ID
const WA_TEMPLATE = () => process.env.WHATSAPP_TEMPLATE || "order_dispatched";
const WA_LANG = () => process.env.WHATSAPP_LANG || "en";
const WA_GRAPH_VERSION = () => process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
// SMS (MSG91 flow API v5)
const MSG91_TEMPLATE_ID = () => process.env.MSG91_TEMPLATE_ID || ""; // DLT-approved flow/template id
const MSG91_SENDER = () => process.env.MSG91_SENDER || "";           // 6-char DLT sender id

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// Normalise an Indian mobile to "91XXXXXXXXXX" (digits only). Returns null if
// it can't be made into a plausible 12-digit (91 + 10) number.
function normalizeMobile(raw) {
  let d = String(raw || "").replace(/[^0-9]/g, "");
  if (d.length === 10) d = "91" + d;
  else if (d.length === 12 && d.startsWith("91")) { /* ok */ }
  else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  else return null;
  return /^91[6-9][0-9]{9}$/.test(d) ? d : null;
}

// Send a WhatsApp template message via the Meta Cloud API.
// The template must be pre-approved in Meta with a 3-variable body, e.g.
//   "Hi {{1}}, your Casovil order has been dispatched via {{2}}. Tracking / AWB: {{3}}."
async function sendWhatsApp({ to, name, courier, awb }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = WA_PHONE_ID();
  if (!token || !phoneId) return { ok: false, error: "whatsapp_not_configured" };

  const url = `https://graph.facebook.com/${WA_GRAPH_VERSION()}/${phoneId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: WA_TEMPLATE(),
      language: { code: WA_LANG() },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: name || "Customer" },
            { type: "text", text: courier || "our courier partner" },
            { type: "text", text: awb || "N/A" },
          ],
        },
      ],
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      logger.error("WhatsApp send failed", { status: resp.status, json });
      return { ok: false, error: (json && json.error && json.error.message) || `http_${resp.status}` };
    }
    const id = json && json.messages && json.messages[0] && json.messages[0].id;
    return { ok: true, id: id || null };
  } catch (e) {
    logger.error("WhatsApp send error", e);
    return { ok: false, error: String(e && e.message || e) };
  }
}

// Send an SMS via MSG91 flow API v5.
// The DLT-approved template must expose variables named name / courier / awb,
// e.g. "Hi ##name##, your Casovil order is dispatched via ##courier##. AWB: ##awb## - Casovil"
async function sendSms({ to, name, courier, awb }) {
  const authkey = process.env.MSG91_AUTHKEY;
  const templateId = MSG91_TEMPLATE_ID();
  if (!authkey || !templateId) return { ok: false, error: "sms_not_configured" };

  const url = "https://control.msg91.com/api/v5/flow/";
  const recipient = { mobiles: to, name: name || "Customer", courier: courier || "our courier partner", awb: awb || "N/A" };
  const body = { template_id: templateId, short_url: "0", recipients: [recipient] };
  if (MSG91_SENDER()) body.sender = MSG91_SENDER();

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { authkey, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    // MSG91 returns { type: "success", ... } on success.
    const okType = json && (json.type === "success" || json.type === "SUCCESS");
    if (!resp.ok || !okType) {
      logger.error("SMS send failed", { status: resp.status, json });
      return { ok: false, error: (json && (json.message || json.type)) || `http_${resp.status}` };
    }
    return { ok: true, id: (json && (json.request_id || json.requestId)) || null };
  } catch (e) {
    logger.error("SMS send error", e);
    return { ok: false, error: String(e && e.message || e) };
  }
}

// --------------------------------------------------------------------------
// Callable: sendDispatchNotification
// --------------------------------------------------------------------------
exports.sendDispatchNotification = onCall(
  {
    region: REGION,
    secrets: [WHATSAPP_TOKEN, MSG91_AUTHKEY],
    cors: true,
    // Never let one lead's send fan out beyond a couple of messages.
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    // 1. Auth — only signed-in dashboard users.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to send messages.");
    }

    const data = request.data || {};
    const to = normalizeMobile(data.to);
    if (!to) {
      throw new HttpsError("invalid-argument", "A valid 10-digit Indian mobile number is required.");
    }

    const name = String(data.name || "").trim().slice(0, 60);
    const courier = String(data.courier || "").trim().slice(0, 60);
    const awb = String(data.awb || "").trim().slice(0, 60);
    const leadId = String(data.leadId || "").slice(0, 80);
    let channels = Array.isArray(data.channels) ? data.channels : ["whatsapp", "sms"];
    channels = channels.filter((c) => c === "whatsapp" || c === "sms");
    if (!channels.length) channels = ["whatsapp"];

    const payload = { to, name, courier, awb };
    const results = {};

    // 2. Send on each requested channel (in parallel).
    await Promise.all(channels.map(async (ch) => {
      results[ch] = ch === "sms" ? await sendSms(payload) : await sendWhatsApp(payload);
    }));

    // 3. Audit log (best-effort — never fails the call).
    try {
      await db.collection("notifications").add({
        type: "dispatch",
        leadId: leadId || null,
        to,
        name,
        courier,
        awb,
        channels,
        results,
        sentByUid: request.auth.uid,
        sentByEmail: (request.auth.token && request.auth.token.email) || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      logger.warn("notifications log write failed", e);
    }

    const anyOk = Object.values(results).some((r) => r && r.ok);
    return { ok: anyOk, results };
  }
);
