# Dispatch WhatsApp / SMS — setup & deploy guide

This makes the dashboard **automatically send a WhatsApp message and/or SMS to
the customer** when a Casovil lead is moved to the **Dispatched** stage — with
the courier and AWB/tracking number filled in. It replaces the "one-tap deep
link" (which just opens WhatsApp pre-filled) with a real, hands-free send.

**Architecture**

```
Dashboard (browser)  ──callable──▶  Cloud Function (asia-south1)
  moves lead → Dispatched            sendDispatchNotification
                                       ├─▶ Meta WhatsApp Cloud API  (WhatsApp)
                                       ├─▶ MSG91 flow API           (SMS)
                                       └─▶ Firestore /notifications (audit log)
```

All API keys live in the Cloud Function (never in the browser). Only a
signed-in dashboard user can trigger a send.

> **Costs:** this requires the Firebase **Blaze (pay-as-you-go)** plan, plus
> per-message charges from Meta (WhatsApp) and MSG91 (SMS). Both are small
> per-message. There is a free tier on Cloud Functions that covers this volume.

---

## 0. Prerequisites (one time)

1. Install the Firebase CLI and log in on your machine:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Upgrade the Firebase project **primelaze-fd050** to the **Blaze** plan:
   Firebase Console → ⚙ → Usage and billing → Modify plan → Blaze.
3. Install function dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

---

## 1. WhatsApp — Meta WhatsApp Cloud API

You need an **approved template message** (WhatsApp does not allow free-form
business-initiated messages; they must use a pre-approved template).

1. Create a Meta app: <https://developers.facebook.com/> → Create App →
   **Business** → add the **WhatsApp** product.
2. In **WhatsApp → API setup**, note the **Phone number ID** (a long number —
   this is `WHATSAPP_PHONE_ID`, **not** the phone number itself). Add and verify
   your business sending number.
3. Create a **permanent access token** (System User token with
   `whatsapp_business_messaging` permission). This is `WHATSAPP_TOKEN`.
4. In **WhatsApp → Message templates**, create a template:
   - **Name:** `order_dispatched` (lowercase, underscores)
   - **Category:** Utility
   - **Language:** English (`en`)
   - **Body:**
     ```
     Hi {{1}}, your Casovil order has been dispatched via {{2}}. Tracking / AWB: {{3}}. Thank you for choosing Casovil!
     ```
   - Submit and wait for **Approved** (usually minutes to a few hours).
   - The three variables map, in order, to **name / courier / AWB**.
   - If you use a different template name or language, update
     `WHATSAPP_TEMPLATE` / `WHATSAPP_LANG` in `functions/.env`.

> Prefer **Gupshup** or **Twilio** for WhatsApp instead of Meta directly? The
> send logic is isolated in `sendWhatsApp()` in `functions/index.js` — swap the
> URL/headers/body for that provider's API and keep everything else.

---

## 2. SMS — MSG91 (DLT-registered)

Indian SMS requires **DLT registration** (TRAI rule): the sender header and the
message template must be pre-approved on a DLT portal, then added in MSG91.

1. Sign up at <https://msg91.com/> and complete DLT: register your **Header /
   Sender ID** (6 letters, e.g. `CSOVIL`) and a **content template**:
   ```
   Hi ##name##, your Casovil order is dispatched via ##courier##. AWB: ##awb## - Casovil
   ```
2. In MSG91 → **Flows**, create a flow from that template. Note its **Template
   ID** (`MSG91_TEMPLATE_ID`) and make sure the variable names are exactly
   **name**, **courier**, **awb** (that's what the function sends).
3. From MSG91 → **Settings → API**, copy your **Auth Key** (`MSG91_AUTHKEY`).

> Prefer **Twilio** for SMS? Swap the logic in `sendSms()` in
> `functions/index.js`.

---

## 3. Configure the function

**Non-secret config** — create `functions/.env` from the template:

```bash
cd functions
cp .env.example .env
# then edit .env and fill in:
#   WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE, WHATSAPP_LANG
#   MSG91_TEMPLATE_ID, MSG91_SENDER
```

**Secrets** — set the two sensitive tokens (stored encrypted by Firebase, never
in the repo):

```bash
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set MSG91_AUTHKEY
```

(Each command prompts you to paste the value.)

> Only setting up **one** channel for now? That's fine — configure just that
> channel. The function sends only on channels that are configured; the other
> returns `..._not_configured` and is skipped. Also set
> `MESSAGING.channels` in `assets/js/app.js` to the channel(s) you want, e.g.
> `["whatsapp"]`.

---

## 4. Deploy

```bash
firebase deploy --only functions,firestore:rules
```

(The updated `firestore.rules` adds a read-only `notifications` audit
collection.)

Verify it deployed to **asia-south1**:
Firebase Console → Functions → you should see `sendDispatchNotification`.

---

## 5. Turn it on in the dashboard

In `assets/js/app.js`, near the top, flip the flag:

```js
const MESSAGING = {
  enabled: true,                 // ← was false
  region: "asia-south1",
  channels: ["whatsapp", "sms"], // or ["whatsapp"] / ["sms"]
};
```

Bump the `app.js?v=` query in `index.html`, commit, and push (Netlify redeploys).

While `enabled` is `false`, the dashboard keeps working with the one-tap
WhatsApp/SMS deep links — nothing breaks before the backend is live.

---

## 6. How it behaves

- **Move a lead → Dispatched** (with courier + AWB): the function fires
  automatically and sends WhatsApp + SMS (per `MESSAGING.channels`). A summary
  alert shows what sent.
- **Lead detail popup** (dispatched/delivered leads): the **WhatsApp** / **SMS**
  buttons re-send on demand. When server messaging is on they send via the
  gateway; if a send fails they fall back to opening the app.
- Every send is logged to Firestore **`notifications`** (who sent it, to whom,
  courier/AWB, per-channel result) — admins can audit it.

## 7. Troubleshooting

- **`unauthenticated`** — the user isn't signed in; reload and sign in.
- **`whatsapp_not_configured` / `sms_not_configured`** — that channel's env/secret
  isn't set. Re-check step 3 and redeploy.
- **WhatsApp error `template ... does not exist` / `not approved`** — the
  template name/language in `.env` must match an **Approved** Meta template.
- **MSG91 failures** — usually DLT template mismatch: the flow's variable names
  must be exactly `name`, `courier`, `awb`, and the sender must be your approved
  header.
- **Logs:** `firebase functions:log` or Console → Functions → Logs.
