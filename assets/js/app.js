/* ============================================================
   Primelaze Unified Dashboard — application
   Renders entirely from window.APP_DATA (assets/js/data.js).
   No dependencies, no build step.
   ============================================================ */
(function () {
  "use strict";

  // Populated after the password decrypts the data payload (see the gate below).
  let D = null;

  /* ---------------- helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const isNum = (v) => typeof v === "number" && !isNaN(v);

  // Indian-grouped integer/decimal formatting
  function inr(v, opts = {}) {
    if (!isNum(v)) return v == null || v === "" ? "—" : esc(v);
    const n = opts.decimals != null ? Number(v.toFixed(opts.decimals)) : Math.round(v);
    return n.toLocaleString("en-IN");
  }
  const rupee = (v, opts) => (isNum(v) ? "₹" + inr(v, opts) : v == null || v === "" ? "—" : esc(v));

  // Lakhs → human (₹X.XX Cr or ₹X L)
  function lakh(v) {
    if (!isNum(v)) return v == null || v === "" ? "—" : esc(v);
    if (v >= 100) return "₹" + (v / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " Cr";
    return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " L";
  }

  function statusBadge(text) {
    const t = (text || "").toLowerCase();
    let cls = "b-neutral", label = text || "—";
    if (t.includes("done") || t.includes("✅")) cls = "b-good";
    else if (t.includes("draft") || t.includes("🟡")) cls = "b-warn";
    else if (t.includes("decision") || t.includes("🔵")) cls = "b-info";
    return `<span class="badge ${cls}">${esc(label)}</span>`;
  }

  function roleClass(name, role) {
    const n = (name || "").toLowerCase();
    if (n.startsWith("vacant")) return { cls: "b-bad", label: "Vacant" };
    const r = (role || "").toLowerCase();
    if (r.includes("trainee") || r.includes("mt")) return { cls: "b-teal", label: "Trainee" };
    return { cls: "b-good", label: "Active" };
  }

  function statusFromNotes(p) {
    const n = (p.name || "").toLowerCase();
    if (n.startsWith("vacant")) return "vacant";
    const notes = (p.notes || "").toLowerCase();
    if (notes.includes("joining") || notes.includes("to join") || notes.includes("to-join")) return "tojoin";
    return "active";
  }

  const table = (head, bodyRows) =>
    `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;

  /* ---------------- tab registry ---------------- */
  const TABS = [
    { id: "overview", label: "Overview", render: renderOverview },
    { id: "team", label: "Team Roster", render: renderTeam },
    { id: "targets", label: "HQ Targets", render: renderTargets },
    { id: "incentives", label: "Incentives", render: renderIncentives },
    { id: "prices", label: "Price Book", render: renderPrices },
    { id: "esthemax", label: "Esthemax Market", render: renderEsthemax },
    { id: "order", label: "Order Planner", render: renderOrder },
    { id: "review", label: "Review Log", render: renderReview },
  ];

  // rupees → short ₹ Cr / ₹ L / ₹ form
  function rupeeShort(v) {
    if (!isNum(v)) return "—";
    if (v >= 1e7) return "₹" + (v / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " Cr";
    if (v >= 1e5) return "₹" + (v / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + " L";
    return "₹" + inr(v);
  }

  /* ================= OVERVIEW ================= */
  function renderOverview() {
    const k = D.kpis;
    const kpis = [
      { cls: "", label: "Devices / yr", value: k.devices, note: k.devicesNote },
      { cls: "k-teal", label: "Celluma units / yr", value: k.celluma, note: k.cellumaNote },
      { cls: "k-good", label: "Active reps", value: k.activeReps, note: k.repsNote },
      { cls: "k-warn", label: "Vacant positions", value: k.vacant, note: k.vacantNote },
    ].map((x) => `
      <div class="card kpi ${x.cls}">
        <div class="kpi-label">${esc(x.label)}</div>
        <div class="kpi-value">${inr(x.value)}</div>
        <div class="kpi-note">${esc(x.note || "")}</div>
      </div>`).join("");

    // zone rollups
    const zoneCards = D.zones.map((z) => {
      let dev = 0, cel = 0, people = 0;
      z.hqs.forEach((hq) => hq.people.forEach((p) => {
        if (isNum(p.devices)) dev += p.devices;
        if (isNum(p.celluma)) cel += p.celluma;
        people += 1;
      }));
      const zoneName = z.name.split("—")[0].trim();
      const terr = (z.name.split("—")[1] || "").trim();
      return `
        <div class="card zone-card">
          <h3>${esc(zoneName)}</h3>
          <div class="zone-hqs">${esc(terr)}</div>
          <div class="zone-metrics">
            <div class="mini"><b>${dev}</b><span>Devices</span></div>
            <div class="mini"><b>${cel}</b><span>Celluma</span></div>
            <div class="mini"><b>${people}</b><span>Roles</span></div>
          </div>
        </div>`;
    }).join("");

    // device distribution by zone (bar)
    const zoneDev = D.zones.map((z) => {
      let dev = 0;
      z.hqs.forEach((hq) => hq.people.forEach((p) => { if (isNum(p.devices)) dev += p.devices; }));
      return { name: z.name.split("—")[0].trim(), value: dev };
    });
    const maxDev = Math.max(...zoneDev.map((z) => z.value), 1);
    const bars = zoneDev.map((z) => `
      <div class="bar-row">
        <span class="bar-label">${esc(z.name)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(z.value / maxDev) * 100}%"></span></span>
        <span class="bar-val">${z.value}</span>
      </div>`).join("");

    // HQ target value ranking
    const hqVals = D.hqTargets.map((h) => {
      const sv = (h.summary.find && h.summary.find((s) => /Std Value/i.test(s.label))) || null;
      return { name: h.title.split("—")[0].trim(), value: sv && isNum(sv.value) ? sv.value : 0 };
    }).filter((h) => h.value > 0).sort((a, b) => b.value - a.value);
    const maxHq = Math.max(...hqVals.map((h) => h.value), 1);
    const hqBars = hqVals.map((h) => `
      <div class="bar-row">
        <span class="bar-label">${esc(h.name)}</span>
        <span class="bar-track"><span class="bar-fill teal" style="width:${(h.value / maxHq) * 100}%"></span></span>
        <span class="bar-val">${lakh(h.value)}</span>
      </div>`).join("");

    return `
      <div class="section-head">
        <h1>Master Dashboard</h1>
        <p>Per-salesperson device &amp; Celluma allocations organised by Zone → HQ for ${esc(D.meta.fiscalYear)}. Counts only — monetary values live in the Incentives and Price Book tabs.</p>
      </div>
      <div class="grid kpi-grid">${kpis}</div>

      <div class="block">
        <h2>Zones at a glance</h2>
        <div class="grid zone-grid">${zoneCards}</div>
      </div>

      <div class="block two-col">
        <div class="card">
          <h2 style="margin-bottom:14px">Device targets by zone</h2>
          <div class="bars">${bars}</div>
        </div>
        <div class="card">
          <h2 style="margin-bottom:14px">HQ standard value (FY26-27)</h2>
          <div class="bars">${hqBars}</div>
        </div>
      </div>

      <div class="block">
        <h2>Grand total</h2>
        <div class="card">
          <div class="stat-row">
            <div class="stat"><b>${inr(D.kpis.devices)}</b><span>Devices / yr (all zones)</span></div>
            <div class="stat"><b>${inr(D.kpis.celluma)}</b><span>Celluma units / yr</span></div>
            <div class="stat"><b>${D.roster.people.length}</b><span>Total roster</span></div>
            <div class="stat"><b>${D.hqTargets.length}</b><span>Regional HQs</span></div>
            <div class="stat"><b>${D.incentives.device.salesperson.length}</b><span>Device models</span></div>
            <div class="stat"><b>${D.incentives.celluma.length}</b><span>Celluma models</span></div>
          </div>
        </div>
      </div>`;
  }

  /* ================= TEAM ROSTER ================= */
  let teamFilter = "all", teamSearch = "";
  function renderTeam() {
    const people = D.roster.people;
    const summary = D.roster.summary || {};
    const summaryCards = Object.entries(summary).map(([k, v]) => `
      <div class="stat"><b>${inr(v)}</b><span>${esc(k)}</span></div>`).join("");

    const view = () => {
      const rows = people.filter((p) => {
        const st = statusFromNotes(p);
        if (teamFilter !== "all" && teamFilter !== st) return false;
        if (teamSearch) {
          const hay = `${p.name} ${p.designation} ${p.baseHQ} ${p.zone} ${p.reportsTo} ${p.notes || ""}`.toLowerCase();
          if (!hay.includes(teamSearch.toLowerCase())) return false;
        }
        return true;
      }).map((p) => {
        const rc = roleClass(p.name, p.designation);
        const st = statusFromNotes(p);
        const badge = st === "vacant" ? `<span class="badge b-bad">Vacant</span>`
          : st === "tojoin" ? `<span class="badge b-info">To join</span>`
          : `<span class="badge ${rc.cls}">${rc.label}</span>`;
        return `<tr>
          <td class="num t-muted">${p.num}</td>
          <td class="t-name">${esc(p.name)}</td>
          <td>${esc(p.designation)}</td>
          <td>${esc(p.baseHQ)}</td>
          <td>${esc(p.reportsTo)}</td>
          <td>${esc(p.zone)}</td>
          <td>${badge}</td>
          <td class="cell-note">${esc(p.notes || "")}</td>
        </tr>`;
      }).join("");
      return rows || `<tr><td colspan="8" class="empty">No matching personnel.</td></tr>`;
    };

    const head = ["#", "Name", "Designation", "Base HQ", "Reports To", "Zone", "Status", "Notes"]
      .map((h, i) => `<th class="${i === 0 ? "num" : ""}">${h}</th>`).join("");

    setTimeout(() => {
      const search = $("#teamSearch");
      if (search) search.oninput = (e) => { teamSearch = e.target.value; $("#teamBody").innerHTML = view(); };
      document.querySelectorAll("[data-tfilter]").forEach((b) => {
        b.onclick = () => {
          teamFilter = b.dataset.tfilter;
          document.querySelectorAll("[data-tfilter]").forEach((x) => x.classList.toggle("active", x === b));
          $("#teamBody").innerHTML = view();
        };
      });
    }, 0);

    return `
      <div class="section-head">
        <h1>Team Roster</h1>
        <p>All sales personnel across zones for ${esc(D.meta.fiscalYear)}, including vacant positions and new joinees. Reporting line rolls up to Arjun.</p>
      </div>
      <div class="card" style="margin-bottom:20px"><div class="stat-row">${summaryCards}</div></div>
      <div class="controls">
        <input id="teamSearch" class="search" type="search" placeholder="Search name, HQ, zone, notes…" />
        <div class="seg">
          <button data-tfilter="all" class="${teamFilter === "all" ? "active" : ""}">All</button>
          <button data-tfilter="active" class="${teamFilter === "active" ? "active" : ""}">Active</button>
          <button data-tfilter="tojoin" class="${teamFilter === "tojoin" ? "active" : ""}">To join</button>
          <button data-tfilter="vacant" class="${teamFilter === "vacant" ? "active" : ""}">Vacant</button>
        </div>
      </div>
      <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody id="teamBody">${view()}</tbody></table></div>`;
  }

  /* ================= HQ TARGETS ================= */
  let hqIndex = 0;
  function renderTargets() {
    const opts = D.hqTargets.map((h, i) =>
      `<option value="${i}" ${i === hqIndex ? "selected" : ""}>${esc(h.title.split("—")[0].trim())}</option>`).join("");

    setTimeout(() => {
      const sel = $("#hqSelect");
      if (sel) sel.onchange = (e) => { hqIndex = +e.target.value; $("#hqDetail").innerHTML = hqDetail(D.hqTargets[hqIndex]); };
    }, 0);

    return `
      <div class="section-head">
        <h1>Regional HQ Targets</h1>
        <p>FY26-27 device &amp; Celluma plans per regional headquarters, with quarterly splits and plan highlights.</p>
      </div>
      <div class="controls">
        <select id="hqSelect" class="select">${opts}</select>
      </div>
      <div id="hqDetail">${hqDetail(D.hqTargets[hqIndex])}</div>`;
  }

  function hqDetail(h) {
    const summary = (h.summary || []).map((s) => `
      <div class="stat">
        <b>${isNum(s.value) ? inr(s.value) : esc(s.value)}</b>
        <span>${esc(s.label)}${s.note ? " · " + esc(s.note) : ""}</span>
      </div>`).join("");

    const plans = (h.plans && h.plans.length ? h.plans : []).map((pl) => {
      const head = ["Product", "FY25-26", "FY26-27", "Device Value (L)", "Total Value (L)", "Notes"]
        .map((x, i) => `<th class="${i >= 1 && i <= 4 ? "num" : ""}">${x}</th>`).join("");
      const rows = pl.rows.map((r) => {
        if (r.isTotal) return `<tr class="total-row">
          <td>TOTAL</td><td class="num">${r.fy2526 ?? "—"}</td><td class="num">${r.fy2627 ?? "—"}</td>
          <td class="num"></td><td class="num">${isNum(r.totalValue) ? inr(r.totalValue) : "—"}</td><td></td></tr>`;
        return `<tr>
          <td class="t-name">${esc(r.product)}</td>
          <td class="num">${r.fy2526 ?? "—"}</td>
          <td class="num">${r.fy2627 ?? "—"}</td>
          <td class="num">${isNum(r.deviceValue) ? inr(r.deviceValue) : "—"}</td>
          <td class="num">${isNum(r.totalValue) ? inr(r.totalValue) : "—"}</td>
          <td class="cell-note">${esc(r.notes || "")}</td></tr>`;
      }).join("");
      return `${pl.label ? `<div class="subplan-title">${esc(pl.label)}</div>` : ""}${table(head, rows)}`;
    }).join("");

    const quarters = (h.quarterly || []).map((q) => `
      <div class="card">
        <div class="q-label" style="margin-bottom:8px;font-weight:700;color:var(--text-2)">${esc(q.basis)} · Annual ${isNum(q.annual) ? inr(q.annual) : q.annual}</div>
        <div class="grid quarter-grid">
          ${["q1", "q2", "q3", "q4"].map((qq, i) => `
            <div class="quarter"><div class="q-label">Q${i + 1}</div><div class="q-val">${isNum(q[qq]) ? inr(q[qq]) : q[qq] ?? "—"}</div></div>`).join("")}
        </div>
      </div>`).join("");

    const highlights = (h.highlights || []).map((x) => `<li>${esc(x)}</li>`).join("");

    return `
      <div class="callout">${esc(h.title)}${h.subtitle ? `<div class="muted-note" style="margin-top:6px">${esc(h.subtitle)}</div>` : ""}</div>
      ${summary ? `<div class="card" style="margin-bottom:22px"><div class="stat-row">${summary}</div></div>` : ""}
      ${plans || `<div class="empty">No product plan — placeholder HQ pending hire.</div>`}
      ${quarters ? `<div class="block"><h2>Quarterly split</h2><div class="grid" style="gap:14px">${quarters}</div></div>` : ""}
      ${highlights ? `<div class="block"><h2>Plan highlights</h2><ul class="hq-highlights" style="padding:0;margin:0">${highlights}</ul></div>` : ""}`;
  }

  /* ================= INCENTIVES ================= */
  let incView = "device";
  function renderIncentives() {
    setTimeout(() => {
      document.querySelectorAll("[data-inc]").forEach((b) => {
        b.onclick = () => {
          incView = b.dataset.inc;
          document.querySelectorAll("[data-inc]").forEach((x) => x.classList.toggle("active", x === b));
          $("#incBody").innerHTML = incBody();
        };
      });
      wireAccordion();
    }, 0);

    return `
      <div class="section-head">
        <h1>Incentive Plans</h1>
        <p>Device value-slab, Celluma per-model and Esthemax tier-based incentive structures, plus the master terms &amp; conditions. All figures excl. GST; incentives paid on the Standard/selling basis.</p>
      </div>
      <div class="controls">
        <div class="seg">
          <button data-inc="device" class="${incView === "device" ? "active" : ""}">Devices</button>
          <button data-inc="celluma" class="${incView === "celluma" ? "active" : ""}">Celluma</button>
          <button data-inc="esthemax" class="${incView === "esthemax" ? "active" : ""}">Esthemax</button>
          <button data-inc="terms" class="${incView === "terms" ? "active" : ""}">Terms &amp; Conditions</button>
        </div>
      </div>
      <div id="incBody">${incBody()}</div>`;
  }

  function incBody() {
    if (incView === "device") return deviceIncentive();
    if (incView === "celluma") return cellumaIncentive();
    if (incView === "esthemax") return esthemaxIncentive();
    return termsView();
  }

  function deviceIncentive() {
    const mk = (rows, isMgr) => {
      const head = ["Device", "Quotation (L)", "Standard (L)", "Minimum (L)", "Std Incentive", "Min Incentive", "Above-Std"]
        .map((x, i) => `<th class="${i >= 1 && i <= 5 ? "num" : ""}">${x}</th>`).join("");
      const body = rows.map((r) => `<tr>
        <td class="t-name">${esc(r.device)}</td>
        <td class="num">${r.quotation ?? "—"}</td>
        <td class="num">${r.standard ?? "—"}</td>
        <td class="num">${r.minimum ?? "—"}</td>
        <td class="num">${rupee(r.stdIncentive)}</td>
        <td class="num">${rupee(r.minIncentive)}</td>
        <td class="cell-note">${esc(r.aboveStd || "—")}</td></tr>`).join("");
      return table(head, body);
    };
    return `
      <div class="callout">Standard = selling price (pricelist + ₹50K FY26-27 uplift). Sell above Standard → +10% of the excess (Sales Person only). Below Standard → 70% of Std. Manager earns a flat 50% of Std on reportee sales, full SP rates on direct sales.</div>
      <div class="block"><h2>Sales Person plan</h2>${mk(D.incentives.device.salesperson, false)}</div>
      <div class="block"><h2>Sales Manager plan <span class="pill-inline">flat 50% of Std</span></h2>${mk(D.incentives.device.manager, true)}</div>`;
  }

  function cellumaIncentive() {
    const head = ["Model", "Selling Price (excl. GST)", "Salesperson Incentive", "Sales Manager Incentive"]
      .map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
    const body = D.incentives.celluma.map((r) => `<tr>
      <td class="t-name">${esc(r.model)}</td>
      <td class="num">${rupee(r.sellingPrice)}</td>
      <td class="num">${rupee(r.salespersonIncentive)}</td>
      <td class="num">${rupee(r.managerIncentive)}</td></tr>`).join("");
    return `
      <div class="callout teal">Single Standard (selling) price per model; no minimum. Manager incentive is a flat 50% of the salesperson standard. Target rule: 1 Celluma / IC / month (12/yr), 10 units per HQ per year at HQ level.</div>
      ${table(head, body)}`;
  }

  function esthemaxIncentive() {
    const mk = (tiers) => {
      const head = ["Tier", "Boxes/Month (Min)", "Boxes/Month (Max)", "Incentive ₹/Box", "Tier Label"]
        .map((x, i) => `<th class="${i >= 1 && i <= 3 ? "num" : ""}">${x}</th>`).join("");
      const body = tiers.map((t) => `<tr>
        <td class="t-name">${esc(t.tier)}</td>
        <td class="num">${t.min}</td>
        <td class="num">${esc(t.max)}</td>
        <td class="num">${rupee(t.incentive)}</td>
        <td>${esc(t.label)}</td></tr>`).join("");
      return table(head, body);
    };
    return `
      <div class="callout">Hydrojelly 6-tier per-box slab. Threshold = monthly box achievement; incentive applied per box, retrospective to box 1. Payment terms: full incentive if paid within 45 days, 50% within 60 days, none after 60 days.</div>
      <div class="block"><h2>Sales Person slab</h2>${mk(D.incentives.esthemax.salesperson)}</div>
      <div class="block"><h2>Sales Manager slab</h2>${mk(D.incentives.esthemax.manager)}</div>`;
  }

  function termsView() {
    const items = D.incentives.terms.map((sec, i) => `
      <div class="acc-item ${i === 0 ? "open" : ""}">
        <button class="acc-head">${esc(sec.title)}<span class="chev">›</span></button>
        <div class="acc-body">
          <dl>${sec.items.map((it) => `<dt>${esc(it.term)}</dt><dd>${esc(it.detail)}</dd>`).join("")}</dl>
        </div>
      </div>`).join("");
    return `<div class="accordion">${items}</div>`;
  }

  function wireAccordion() {
    document.querySelectorAll(".acc-head").forEach((h) => {
      h.onclick = () => h.parentElement.classList.toggle("open");
    });
  }

  /* ================= PRICE BOOK ================= */
  let priceView = "device";
  function renderPrices() {
    setTimeout(() => {
      document.querySelectorAll("[data-price]").forEach((b) => {
        b.onclick = () => {
          priceView = b.dataset.price;
          document.querySelectorAll("[data-price]").forEach((x) => x.classList.toggle("active", x === b));
          $("#priceBody").innerHTML = priceBody();
        };
      });
    }, 0);
    return `
      <div class="section-head">
        <h1>Price Book</h1>
        <p>Landing cost, quotation, standard and minimum selling prices across devices, Celluma models and Esthemax skincare. All values excl. GST.</p>
      </div>
      <div class="controls">
        <div class="seg">
          <button data-price="device" class="${priceView === "device" ? "active" : ""}">Devices</button>
          <button data-price="celluma" class="${priceView === "celluma" ? "active" : ""}">Celluma</button>
          <button data-price="esthemax" class="${priceView === "esthemax" ? "active" : ""}">Esthemax</button>
        </div>
      </div>
      <div id="priceBody">${priceBody()}</div>`;
  }

  function priceBody() {
    if (priceView === "device") {
      const head = ["Device", "Landing Cost (L)", "Quotation (L)", "Standard (L)", "Minimum (L)"]
        .map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
      const body = D.costs.device.map((r) => `<tr>
        <td class="t-name">${esc(r.device)}</td>
        <td class="num">${r.landingCost ?? "—"}</td>
        <td class="num">${r.quotation ?? "—"}</td>
        <td class="num">${r.standard ?? "—"}</td>
        <td class="num">${r.minimum ?? "—"}</td></tr>`).join("");
      return `<div class="callout">Landing = EXW + ~30% (customs + transport). Values in ₹ Lakhs, excl. GST.</div>${table(head, body)}`;
    }
    if (priceView === "celluma") {
      const head = ["Model", "Quotation (₹)", "Selling Price (₹)"]
        .map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
      const body = D.costs.celluma.map((r) => `<tr>
        <td class="t-name">${esc(r.model)}</td>
        <td class="num">${rupee(r.quotation)}</td>
        <td class="num">${rupee(r.selling)}</td></tr>`).join("");
      return `<div class="callout teal">Quotation includes the +₹50K FY26-27 uplift. Selling = standard customer price. Excl. GST.</div>${table(head, body)}`;
    }
    // esthemax
    const sec = (title, rows) => {
      if (!rows || !rows.length) return "";
      const head = ["Variant", "Pack", "Landing Cost", "Standard (Total)", "MRP", "New MRP", "Min (EXW)"]
        .map((x, i) => `<th class="${i >= 2 ? "num" : ""}">${x}</th>`).join("");
      const body = rows.map((r) => `<tr>
        <td class="t-name">${esc(r.variant)}</td>
        <td class="t-muted">${esc(r.pack)}</td>
        <td class="num">${rupee(r.landingCost)}</td>
        <td class="num">${rupee(r.standardTotal)}</td>
        <td class="num">${rupee(r.mrp)}</td>
        <td class="num">${rupee(r.newMrp)}</td>
        <td class="num">${rupee(r.minEXW)}</td></tr>`).join("");
      return `<div class="block"><h2>${esc(title)}</h2>${table(head, body)}</div>`;
    };
    const e = D.costs.esthemax;
    return `<div class="callout">Landing = EXW + 44% customs + transport. Standard (Total) = landing + marketing + profit. Min (EXW) = Primelaze ex-works price. Per box, excl. GST.</div>
      ${sec("Hydrojelly Mask (850 ml)", e.hydrojelly)}
      ${sec("Retail Hydrojelly (2 masks / box)", e.retail)}
      ${sec("Collagen Foot Mask", e.footMask)}`;
  }

  /* ================= ESTHEMAX MARKET ================= */
  let mkt = "salon", mktGroup = "HYDROJELLYMASK";
  function renderEsthemax() {
    setTimeout(() => {
      document.querySelectorAll("[data-mkt]").forEach((b) => {
        b.onclick = () => { mkt = b.dataset.mkt; document.querySelectorAll("[data-mkt]").forEach((x) => x.classList.toggle("active", x === b)); $("#mktBody").innerHTML = mktBody(); };
      });
      document.querySelectorAll("[data-grp]").forEach((b) => {
        b.onclick = () => { mktGroup = b.dataset.grp; document.querySelectorAll("[data-grp]").forEach((x) => x.classList.toggle("active", x === b)); $("#mktBody").innerHTML = mktBody(); };
      });
    }, 0);
    return `
      <div class="section-head">
        <h1>Esthemax Market Pricing</h1>
        <p>Salon and doctor market pricing on the New Structure (+15% MRP hike), with bulk offer tiers and effective net prices (incl. GST) per box.</p>
      </div>
      <div class="controls">
        <div class="seg">
          <button data-mkt="salon" class="${mkt === "salon" ? "active" : ""}">Salon Market</button>
          <button data-mkt="doctor" class="${mkt === "doctor" ? "active" : ""}">Doctor Market</button>
        </div>
        <div class="seg">
          <button data-grp="HYDROJELLYMASK" class="${mktGroup === "HYDROJELLYMASK" ? "active" : ""}">Hydrojelly</button>
          <button data-grp="RETAIL HYDROJELLYMASK" class="${mktGroup === "RETAIL HYDROJELLYMASK" ? "active" : ""}">Retail</button>
        </div>
      </div>
      <div id="mktBody">${mktBody()}</div>`;
  }

  function mktBody() {
    const m = D.esthemaxPrices[mkt];
    const cols = m.columns;
    const rows = (m.groups[mktGroup] || []);
    if (!rows.length) return `<div class="empty">No rows in this group.</div>`;

    // Only the "New Structure @15% Hike in MRP" columns are shown — the old
    // structure is dropped. Pack Size (index 2) is product info, kept.
    const band = m.band || [];
    let newStart = band.findIndex((b, i) => i > 2 && String(b).toLowerCase().includes("new"));
    if (newStart < 0) newStart = Math.floor(cols.length / 2);

    const colIdx = [];
    if (String(cols[2] || "").trim() !== "") colIdx.push(2); // Pack Size
    cols.forEach((c, i) => { if (i >= newStart && String(c).trim() !== "") colIdx.push(i); });

    const headCells = ["<th>Sr</th>", "<th>Name</th>"].concat(
      colIdx.map((i) => {
        const label = String(cols[i]).replace(/\n/g, " ").trim();
        return `<th class="${i === 2 ? "" : "num"}" title="${esc(label)}">${esc(label)}</th>`;
      })
    ).join("");

    const body = rows.map((r) => {
      const cells = colIdx.map((i) => {
        const v = r.values[i];
        if (i === 2) return `<td class="t-muted">${v == null ? "—" : esc(v)}</td>`;
        return `<td class="num">${isNum(v) ? inr(v) : (v == null ? "—" : esc(v))}</td>`;
      }).join("");
      return `<tr><td class="num t-muted">${r.srNo}</td><td class="t-name">${esc(r.name)}</td>${cells}</tr>`;
    }).join("");

    return `
      <div class="callout teal">${esc(mkt === "salon" ? "Salon Market" : "Doctor Market")} · ${mktGroup === "HYDROJELLYMASK" ? "Hydrojelly Mask (850ml)" : "Retail Hydrojelly (2 masks/box)"} — New Structure (+15% MRP hike). Offer columns show bill/MRP value and effective net price (incl. GST) per box.</div>
      ${table(headCells, body)}
      <div class="muted-note">Scroll horizontally to see all offer tiers. Effective net prices are per box, inclusive of GST.</div>`;
  }

  /* ================= REVIEW LOG ================= */
  function renderReview() {
    const rows = D.comments.map((c) => `<tr>
      <td class="num t-muted">${c.num}</td>
      <td><span class="badge b-neutral">${esc(c.raisedBy)}</span></td>
      <td class="t-muted">${esc(c.location)}</td>
      <td class="t-name">${esc(c.topic)}</td>
      <td class="cell-note">${esc(c.comment)}</td>
      <td class="cell-note">${esc(c.resolution)}</td>
      <td>${statusBadge(c.status)}</td></tr>`).join("");
    const head = ["#", "Raised By", "Location", "Topic", "Comment", "Resolution", "Status"]
      .map((h, i) => `<th class="${i === 0 ? "num" : ""}">${h}</th>`).join("");

    const done = D.comments.filter((c) => /done|✅/i.test(c.status || "")).length;
    const draft = D.comments.filter((c) => /draft|🟡/i.test(c.status || "")).length;
    const decision = D.comments.filter((c) => /decision|🔵/i.test(c.status || "")).length;

    return `
      <div class="section-head">
        <h1>Review Resolution Log</h1>
        <p>Every comment raised by Surya, HR and management for ${esc(D.meta.fiscalYear)}, with location, resolution and status.</p>
      </div>
      <div class="card" style="margin-bottom:20px"><div class="stat-row">
        <div class="stat"><b>${D.comments.length}</b><span>Total comments</span></div>
        <div class="stat"><b style="color:var(--good)">${done}</b><span>Done</span></div>
        <div class="stat"><b style="color:var(--warn)">${draft}</b><span>Draft (pending)</span></div>
        <div class="stat"><b style="color:var(--info)">${decision}</b><span>Decision</span></div>
      </div></div>
      ${table(head, rows)}`;
  }

  /* ================= ORDER PLANNER ================= */
  // Interactive Esthemax procurement planner. Required Stock is authoritative
  // from the workbook (accessories carry manual targets); we recompute
  //   toBuy   = max(0, requiredStock − currentStock)
  //   landing = unitUSD × usdInr × (1 + customs) + transport
  //   money   = toBuy × landing
  // live as the user edits FX / customs / current stock.
  const orderState = { usdInr: null, customs: null, stock: {}, cat: "All", q: "" };

  function orderInit() {
    const p = D.esthemaxOrder.params;
    if (orderState.usdInr == null) orderState.usdInr = p.usdInr;
    if (orderState.customs == null) orderState.customs = p.customsRate;
  }

  function orderCompute() {
    const usd = orderState.usdInr, cus = orderState.customs;
    return D.esthemaxOrder.items.map((it, i) => {
      const current = orderState.stock[i] != null ? orderState.stock[i] : it.currentStock;
      const toBuy = Math.max(0, Math.round((it.requiredStock - current) * 100) / 100);
      const landing = it.unitUSD * usd * (1 + cus) + it.transport;
      const money = toBuy * landing;
      return { it, i, current, toBuy, landing, money };
    });
  }

  function sparkline(monthly) {
    const vals = monthly.map((v) => (isNum(v) ? v : 0));
    const max = Math.max(...vals, 1);
    const w = 84, h = 22, n = vals.length;
    const pts = vals.map((v, i) => `${((i / (n - 1)) * w).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`).join(" ");
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /></svg>`;
  }

  function renderOrder() {
    orderInit();
    setTimeout(() => {
      const wire = (id, key, factor) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) { orderState[key] = factor ? v / 100 : v; orderPaint(); }
        };
      };
      wire("ordUsd", "usdInr", false);
      wire("ordCustoms", "customs", true);
      const s = document.getElementById("ordSearch");
      if (s) s.oninput = (e) => { orderState.q = e.target.value.toLowerCase(); orderPaint(); };
      document.querySelectorAll("[data-ocat]").forEach((b) => {
        b.onclick = () => {
          orderState.cat = b.dataset.ocat;
          document.querySelectorAll("[data-ocat]").forEach((x) => x.classList.toggle("active", x === b));
          orderPaint();
        };
      });
      const reset = document.getElementById("ordReset");
      if (reset) reset.onclick = () => {
        const p = D.esthemaxOrder.params;
        orderState.usdInr = p.usdInr; orderState.customs = p.customsRate; orderState.stock = {};
        renderTab("order");
      };
      orderPaint();
    }, 0);

    const cats = ["All"].concat(Array.from(new Set(D.esthemaxOrder.items.map((x) => x.category))));
    const catSeg = cats.map((c) => `<button data-ocat="${esc(c)}" class="${orderState.cat === c ? "active" : ""}">${esc(c)}</button>`).join("");
    const p = D.esthemaxOrder.params;

    return `
      <div class="section-head">
        <h1>Esthemax Order Planner</h1>
        <p>Reorder plan from 15 months of sales (Apr-25 → Jun-26). Required stock covers ${esc(p.dermaMonths)} derma + ${esc(p.salonMonths)} salon months. Adjust FX, customs and current stock to recompute the buy quantity and money required live.</p>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="order-params">
          <label class="ord-field"><span>USD → INR</span><input id="ordUsd" type="number" step="0.01" value="${orderState.usdInr}"></label>
          <label class="ord-field"><span>Customs rate (%)</span><input id="ordCustoms" type="number" step="1" value="${+(orderState.customs * 100).toFixed(2)}"></label>
          <div class="ord-field"><span>Coverage</span><b>${esc(p.dermaMonths)} derma + ${esc(p.salonMonths)} salon mo</b></div>
          <button id="ordReset" class="ghost-btn" type="button">Reset</button>
        </div>
      </div>

      <div id="orderKpis" class="grid kpi-grid" style="margin-bottom:18px"></div>

      <div class="controls">
        <input id="ordSearch" class="search" type="search" placeholder="Search item…" value="${esc(orderState.q)}" />
        <div class="seg">${catSeg}</div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Item</th><th>Category</th><th class="num">6-mo avg</th><th>Trend</th>
            <th class="num">Required</th><th class="num">Current</th><th class="num">To Buy</th>
            <th class="num">Landing/Unit</th><th class="num">Money Required</th>
          </tr></thead>
          <tbody id="orderBody"></tbody>
        </table>
      </div>
      <div class="muted-note">Current stock is editable — type a new value to re-plan. Money Required = To Buy × Landing/Unit. Landing = (Unit USD × FX) + customs + transport.</div>`;
  }

  function orderPaint() {
    const rows = orderCompute();
    const q = orderState.q, cat = orderState.cat;
    const filtered = rows.filter((r) =>
      (cat === "All" || r.it.category === cat) &&
      (!q || r.it.name.toLowerCase().includes(q)));

    // KPIs from the *filtered* set so category views make sense
    const toOrder = filtered.filter((r) => r.toBuy > 0).length;
    const units = filtered.reduce((s, r) => s + r.toBuy, 0);
    const money = filtered.reduce((s, r) => s + r.money, 0);
    const kpis = [
      { cls: "", label: "SKUs to order", value: inr(toOrder), note: `of ${filtered.length} shown` },
      { cls: "k-teal", label: "Units to buy", value: inr(Math.round(units)), note: "across shown items" },
      { cls: "k-warn", label: "Money required", value: rupeeShort(money), note: "landed cost, excl. GST" },
    ].map((x) => `<div class="card kpi ${x.cls}"><div class="kpi-label">${x.label}</div><div class="kpi-value">${x.value}</div><div class="kpi-note">${esc(x.note)}</div></div>`).join("");
    const kEl = document.getElementById("orderKpis");
    if (kEl) kEl.innerHTML = kpis;

    const sorted = filtered.slice().sort((a, b) => b.money - a.money || b.toBuy - a.toBuy);
    const body = sorted.map((r) => {
      const catCls = { JAR: "b-accent", RETAIL: "b-teal", Accessory: "b-neutral", SAMPLE: "b-warn" }[r.it.category] || "b-neutral";
      return `<tr>
        <td class="t-name">${esc(r.it.name)}</td>
        <td><span class="badge ${catCls}">${esc(r.it.category)}</span></td>
        <td class="num">${isNum(r.it.sixMoAvg) ? r.it.sixMoAvg.toFixed(1) : "—"}</td>
        <td class="spark-cell">${sparkline(r.it.monthly)}</td>
        <td class="num">${inr(r.it.requiredStock)}</td>
        <td class="num"><input class="stock-input" type="number" data-idx="${r.i}" value="${r.current}" /></td>
        <td class="num ${r.toBuy > 0 ? "buy-pos" : ""}">${inr(Math.round(r.toBuy))}</td>
        <td class="num">${rupee(r.landing, { decimals: 0 })}</td>
        <td class="num t-name">${r.money > 0 ? rupee(r.money, { decimals: 0 }) : "—"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="9" class="empty">No matching items.</td></tr>`;
    const bEl = document.getElementById("orderBody");
    if (bEl) { bEl.innerHTML = body; orderBindStockInputs(); }
  }

  function orderBindStockInputs() {
    document.querySelectorAll(".stock-input").forEach((inp) => {
      inp.onchange = (e) => {
        const idx = +e.target.dataset.idx;
        const v = parseFloat(e.target.value);
        orderState.stock[idx] = isNaN(v) ? 0 : v;
        orderPaint();
      };
    });
  }

  /* ---------------- shell / routing ---------------- */
  function renderTab(id) { go(id); }

  function mountTabs() {
    const nav = $("#tabs");
    nav.innerHTML = TABS.map((t) => `<button class="tab" data-tab="${t.id}" role="tab">${t.label}</button>`).join("");
    nav.querySelectorAll(".tab").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
  }

  function go(id) {
    const tab = TABS.find((t) => t.id === id) || TABS[0];
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab.id));
    $("#view").innerHTML = tab.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (location.hash.slice(1) !== tab.id) history.replaceState(null, "", "#" + tab.id);
  }

  function initTheme() {
    const saved = localStorage.getItem("pl-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      document.documentElement.setAttribute("data-theme", "dark");
    $("#themeToggle").onclick = () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", cur);
      localStorage.setItem("pl-theme", cur);
    };
  }

  function bootApp() {
    $("#fyPill").textContent = D.meta.fiscalYear;
    mountTabs();
    go(location.hash.slice(1) || "overview");
  }

  /* ---------------- login gate / decryption ---------------- */
  const EXPECTED_USER = "primelaze";

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function decryptData(password) {
    const E = window.APP_DATA_ENC;
    if (!E) throw new Error("Encrypted data not found. Run scripts/encrypt_data.js.");
    if (!(window.crypto && window.crypto.subtle)) {
      throw new Error("This browser blocks Web Crypto here. Open the site over https:// or http://localhost.");
    }
    const salt = b64ToBytes(E.salt), iv = b64ToBytes(E.iv), ct = b64ToBytes(E.ct);
    const baseKey = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: E.iter, hash: E.hash || "SHA-256" },
      baseKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function initGate() {
    const screen = $("#lockScreen");
    const app = $("#app");
    const form = $("#lockForm");
    const errEl = $("#lockError");
    const btn = $("#lockBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const user = ($("#lockUser").value || "").trim();
      const pass = $("#lockPass").value || "";
      if (user.toLowerCase() !== EXPECTED_USER) {
        errEl.textContent = "Invalid username or password.";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Unlocking…";
      try {
        D = await decryptData(pass); // GCM auth fails on a wrong password
        bootApp();
        screen.remove();
        app.hidden = false;
      } catch (err) {
        errEl.textContent = "Invalid username or password.";
        btn.disabled = false;
        btn.textContent = "Unlock";
        $("#lockPass").value = "";
        $("#lockPass").focus();
      }
    });
  }

  // boot: theme applies immediately; data stays locked until decrypted.
  initTheme();
  initGate();
})();
