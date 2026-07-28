/* ============================================================
   Primelaze Unified Dashboard — application
   Renders entirely from window.APP_DATA (assets/js/data.js).
   No dependencies, no build step.
   ============================================================ */
(function () {
  "use strict";

  // Populated after the password decrypts the data payload (see the gate below).
  let D = null;

  // Access mode. "view" = read-only, landing/lending prices hidden, no editing.
  // "admin" = everything visible and editable. (Interim client-side gate; full
  // per-user accounts & permissions will move to Firebase.)
  let appMode = "view";
  let currentTab = "overview";
  const isAdmin = () => appMode === "admin";
  const roAttr = () => (isAdmin() ? "" : "disabled");

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
    { id: "order", label: "Inventory", render: renderOrder },
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
  let teamFilter = "all", teamSearch = "", teamDivision = "all";
  function renderTeam() {
    const people = D.roster.people;
    const summary = D.roster.summary || {};
    const summaryCards = Object.entries(summary).map(([k, v]) => `
      <div class="stat"><b>${inr(v)}</b><span>${esc(k)}</span></div>`).join("");

    const view = () => {
      const rows = people.filter((p) => {
        const st = statusFromNotes(p);
        if (teamFilter !== "all" && teamFilter !== st) return false;
        if (teamDivision !== "all" && (p.division || "Derma") !== teamDivision) return false;
        if (teamSearch) {
          const hay = `${p.name} ${p.designation} ${p.baseHQ} ${p.zone} ${p.reportsTo} ${p.division || ""} ${p.notes || ""}`.toLowerCase();
          if (!hay.includes(teamSearch.toLowerCase())) return false;
        }
        return true;
      }).map((p) => {
        const rc = roleClass(p.name, p.designation);
        const st = statusFromNotes(p);
        const badge = st === "vacant" ? `<span class="badge b-bad">Vacant</span>`
          : st === "tojoin" ? `<span class="badge b-info">To join</span>`
          : `<span class="badge ${rc.cls}">${rc.label}</span>`;
        const div = p.division || "Derma";
        const divBadge = `<span class="badge ${div === "Salon/Spa" ? "b-teal" : "b-accent"}">${esc(div)}</span>`;
        return `<tr>
          <td class="num t-muted">${p.num}</td>
          <td class="t-name">${esc(p.name)}</td>
          <td>${esc(p.designation)}</td>
          <td>${divBadge}</td>
          <td>${esc(p.baseHQ)}</td>
          <td>${esc(p.reportsTo)}</td>
          <td>${esc(p.zone)}</td>
          <td>${badge}</td>
        </tr>`;
      }).join("");
      return rows || `<tr><td colspan="8" class="empty">No matching personnel.</td></tr>`;
    };

    const head = ["#", "Name", "Designation", "Division", "Base HQ", "Reports To", "Zone", "Status"]
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
      document.querySelectorAll("[data-tdiv]").forEach((b) => {
        b.onclick = () => {
          teamDivision = b.dataset.tdiv;
          document.querySelectorAll("[data-tdiv]").forEach((x) => x.classList.toggle("active", x === b));
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
        <input id="teamSearch" class="search" type="search" placeholder="Search name, HQ, zone, division…" />
        <div class="seg">
          <button data-tfilter="all" class="${teamFilter === "all" ? "active" : ""}">All</button>
          <button data-tfilter="active" class="${teamFilter === "active" ? "active" : ""}">Active</button>
          <button data-tfilter="tojoin" class="${teamFilter === "tojoin" ? "active" : ""}">To join</button>
          <button data-tfilter="vacant" class="${teamFilter === "vacant" ? "active" : ""}">Vacant</button>
        </div>
        <div class="seg">
          <button data-tdiv="all" class="${teamDivision === "all" ? "active" : ""}">All div.</button>
          <button data-tdiv="Derma" class="${teamDivision === "Derma" ? "active" : ""}">Derma</button>
          <button data-tdiv="Salon/Spa" class="${teamDivision === "Salon/Spa" ? "active" : ""}">Salon/Spa</button>
        </div>
      </div>
      <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody id="teamBody">${view()}</tbody></table></div>`;
  }

  /* ================= HQ TARGETS ================= */
  let hqIndex = 0;
  const hqEdits = {}; // `${sheet}#${planIdx}#${rowIdx}` -> edited FY26-27 value
  const idfor = (s) => s.replace(/[^a-z0-9]/gi, "_");

  function renderTargets() {
    const opts = D.hqTargets.map((h, i) =>
      `<option value="${i}" ${i === hqIndex ? "selected" : ""}>${esc(h.title.split("—")[0].trim())}</option>`).join("");

    setTimeout(() => {
      const sel = $("#hqSelect");
      if (sel) sel.onchange = (e) => { hqIndex = +e.target.value; mountHqDetail(D.hqTargets[hqIndex]); };
      const dl = document.getElementById("hqDownload");
      if (dl) dl.onclick = () => downloadHqPdf(D.hqTargets[hqIndex]);
      wireHqDetail();
    }, 0);

    return `
      <div class="section-head">
        <h1>Regional HQ Targets</h1>
        <p>FY26-27 device &amp; Celluma plans per regional headquarters. FY26-27 quantities are editable — totals recompute live. Download a PDF of the plan with the matching incentive tables and terms.</p>
      </div>
      <div class="controls">
        <select id="hqSelect" class="select">${opts}</select>
        <div class="hq-actions"><button id="hqDownload" class="dl-btn" type="button">⤓ Download PDF</button></div>
      </div>
      <div id="hqDetail">${hqDetail(D.hqTargets[hqIndex])}</div>`;
  }

  function mountHqDetail(h) {
    $("#hqDetail").innerHTML = hqDetail(h);
    wireHqDetail();
  }

  function wireHqDetail() {
    document.querySelectorAll(".tgt-input").forEach((inp) => {
      inp.oninput = () => {
        const v = parseFloat(inp.value);
        hqEdits[inp.dataset.pk + "#" + inp.dataset.ri] = isNaN(v) ? null : v;
        recomputeHqPlan(inp.dataset.pk);
      };
    });
  }

  // Only rows with a numeric Device Value count toward the plan TOTAL (matches
  // the source: Celluma and demo-only rows are excluded from the device total).
  function recomputeHqPlan(pk) {
    const pid = idfor(pk);
    let units = 0, value = 0;
    document.querySelectorAll(".tgt-input").forEach((inp) => {
      if (inp.dataset.pk !== pk) return;
      const v = parseFloat(inp.value) || 0;
      const dv = parseFloat(inp.dataset.dv);
      const tvCell = document.getElementById(`tv_${pid}_${inp.dataset.ri}`);
      if (!isNaN(dv)) {
        units += v; value += v * dv;
        if (tvCell) tvCell.textContent = inr(v * dv);
      }
    });
    const uEl = document.getElementById(`totu_${pid}`);
    const vEl = document.getElementById(`totv_${pid}`);
    if (uEl) uEl.textContent = inr(units);
    if (vEl) vEl.textContent = inr(value);
  }

  function hqDetail(h) {
    const summary = (h.summary || []).map((s) => `
      <div class="stat">
        <b>${isNum(s.value) ? inr(s.value) : esc(s.value)}</b>
        <span>${esc(s.label)}${s.note ? " · " + esc(s.note) : ""}</span>
      </div>`).join("");

    const effVal = (pk, ri, orig) => {
      const e = hqEdits[pk + "#" + ri];
      return e != null ? e : orig;
    };

    const plans = (h.plans && h.plans.length ? h.plans : []).map((pl, pi) => {
      const pk = h.sheet + "#" + pi;
      const pid = idfor(pk);
      const head = ["Product", "FY25-26", "FY26-27", "Device Value (L)", "Total Value (L)", "Notes"]
        .map((x, i) => `<th class="${i >= 1 && i <= 4 ? "num" : ""}">${x}</th>`).join("");
      // running totals over device rows (numeric deviceValue) using edited values
      let tu = 0, tv = 0;
      pl.rows.forEach((r, ri) => {
        if (r.isTotal || !isNum(r.deviceValue)) return;
        const v = effVal(pk, ri, r.fy2627);
        if (isNum(v)) { tu += v; tv += v * r.deviceValue; }
      });
      const rows = pl.rows.map((r, ri) => {
        if (r.isTotal) return `<tr class="total-row">
          <td>TOTAL</td><td class="num">${r.fy2526 ?? "—"}</td><td class="num" id="totu_${pid}">${inr(tu)}</td>
          <td class="num"></td><td class="num" id="totv_${pid}">${inr(tv)}</td><td></td></tr>`;
        const editable = isNum(r.fy2627);
        const v = effVal(pk, ri, r.fy2627);
        const fyCell = editable
          ? `<input class="tgt-input" type="number" data-pk="${esc(pk)}" data-ri="${ri}" data-dv="${isNum(r.deviceValue) ? r.deviceValue : ""}" value="${v}" ${roAttr()} />`
          : (r.fy2627 ?? "—");
        const rowTv = (isNum(v) && isNum(r.deviceValue)) ? v * r.deviceValue : (isNum(r.totalValue) ? r.totalValue : null);
        return `<tr>
          <td class="t-name">${esc(r.product)}</td>
          <td class="num">${r.fy2526 ?? "—"}</td>
          <td class="num">${fyCell}</td>
          <td class="num">${isNum(r.deviceValue) ? inr(r.deviceValue) : "—"}</td>
          <td class="num" id="tv_${pid}_${ri}">${isNum(rowTv) ? inr(rowTv) : "—"}</td>
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

  /* ---- HQ target PDF (targets + incentives + T&C) ---- */
  function pTable(headers, bodyRows) {
    const h = headers.map((x) => `<th class="${x.num ? "num" : ""}">${esc(x.label)}</th>`).join("");
    return `<table><thead><tr>${h}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  }

  function buildHqPrint(h) {
    const stamp = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

    const summary = (h.summary || []).map((s) =>
      `<tr><td>${esc(s.label)}</td><td class="num">${isNum(s.value) ? inr(s.value) : esc(s.value)}</td><td>${esc(s.note || "")}</td></tr>`).join("");

    const plansHtml = (h.plans || []).map((pl, pi) => {
      const pk = h.sheet + "#" + pi;
      let tu = 0, tv = 0;
      const body = pl.rows.filter((r) => !r.isTotal).map((r, ri) => {
        const v = hqEdits[pk + "#" + ri] != null ? hqEdits[pk + "#" + ri] : r.fy2627;
        const rowTv = (isNum(v) && isNum(r.deviceValue)) ? v * r.deviceValue : (isNum(r.totalValue) ? r.totalValue : null);
        if (isNum(v) && isNum(r.deviceValue)) { tu += v; tv += v * r.deviceValue; }
        return `<tr><td>${esc(r.product)}</td><td class="num">${r.fy2526 ?? "—"}</td><td class="num">${isNum(v) ? inr(v) : esc(v ?? "—")}</td><td class="num">${isNum(r.deviceValue) ? inr(r.deviceValue) : "—"}</td><td class="num">${isNum(rowTv) ? inr(rowTv) : "—"}</td></tr>`;
      }).join("");
      const headers = [{ label: "Product" }, { label: "FY25-26", num: 1 }, { label: "FY26-27", num: 1 }, { label: "Device Value (L)", num: 1 }, { label: "Total Value (L)", num: 1 }];
      return `<h3>${esc(pl.label || "Product plan")}</h3>${pTable(headers, body + `<tr><td><b>TOTAL</b></td><td></td><td class="num"><b>${inr(tu)}</b></td><td></td><td class="num"><b>${inr(tv)}</b></td></tr>`)}`;
    }).join("");

    const qHtml = (h.quarterly || []).length
      ? `<h3>Quarterly split</h3>${pTable([{ label: "Basis" }, { label: "Annual", num: 1 }, { label: "Q1", num: 1 }, { label: "Q2", num: 1 }, { label: "Q3", num: 1 }, { label: "Q4", num: 1 }],
          h.quarterly.map((q) => `<tr><td>${esc(q.basis)}</td><td class="num">${isNum(q.annual) ? inr(q.annual) : esc(q.annual)}</td>${["q1", "q2", "q3", "q4"].map((k) => `<td class="num">${isNum(q[k]) ? inr(q[k]) : esc(q[k] ?? "—")}</td>`).join("")}</tr>`).join(""))}`
      : "";

    // ---- Incentives ----
    const dev = D.incentives.device;
    const devTbl = (rows) => pTable(
      [{ label: "Device" }, { label: "Std Sell (L)", num: 1 }, { label: "Min (L)", num: 1 }, { label: "Std Incentive", num: 1 }, { label: "Min Incentive", num: 1 }, { label: "Above-Std" }],
      rows.map((r) => `<tr><td>${esc(r.device)}</td><td class="num">${r.standard ?? "—"}</td><td class="num">${r.minimum ?? "—"}</td><td class="num">${rupee(r.stdIncentive)}</td><td class="num">${rupee(r.minIncentive)}</td><td>${esc(r.aboveStd || "—")}</td></tr>`).join(""));
    const cel = pTable(
      [{ label: "Celluma model" }, { label: "Selling", num: 1 }, { label: "SP Incentive", num: 1 }, { label: "Mgr Incentive", num: 1 }],
      D.incentives.celluma.map((r) => `<tr><td>${esc(r.model)}</td><td class="num">${rupee(r.sellingPrice)}</td><td class="num">${rupee(r.salespersonIncentive)}</td><td class="num">${rupee(r.managerIncentive)}</td></tr>`).join(""));
    const esthTiers = (t) => pTable(
      [{ label: "Tier" }, { label: "Boxes min", num: 1 }, { label: "Boxes max", num: 1 }, { label: "₹/Box", num: 1 }, { label: "Label" }],
      t.map((x) => `<tr><td>${esc(x.tier)}</td><td class="num">${x.min}</td><td class="num">${esc(x.max)}</td><td class="num">${rupee(x.incentive)}</td><td>${esc(x.label)}</td></tr>`).join(""));

    const terms = (D.incentives.terms || []).map((sec) =>
      `<h3>${esc(sec.title)}</h3><dl>${sec.items.map((it) => `<dt>${esc(it.term)}</dt><dd>${esc(it.detail)}</dd>`).join("")}</dl>`).join("");

    return `
      <div class="p-section">
        <h1>${esc(D.meta.company)} — ${esc(h.title.split("—")[0].trim())} — FY 2026-27 Targets</h1>
        <div class="p-sub">${esc(h.subtitle || h.title)}</div>
        <p class="p-meta">Generated ${esc(stamp)} · Figures excl. GST · FY26-27 quantities as edited in the dashboard.</p>
        ${summary ? `<h2>Summary</h2>${pTable([{ label: "Metric" }, { label: "Value", num: 1 }, { label: "Note" }], summary)}` : ""}
        ${plansHtml}
        ${qHtml}
      </div>
      <div class="p-section p-break">
        <h2>Incentive reference — Devices (Sales Person)</h2>${devTbl(dev.salesperson)}
        <h2>Incentive reference — Devices (Sales Manager · flat 50% of Std)</h2>${devTbl(dev.manager)}
        <h2>Incentive reference — Celluma</h2>${cel}
        <h2>Incentive reference — Esthemax (Sales Person slab)</h2>${esthTiers(D.incentives.esthemax.salesperson)}
        <h2>Incentive reference — Esthemax (Sales Manager slab)</h2>${esthTiers(D.incentives.esthemax.manager)}
      </div>
      <div class="p-section p-break">
        <h2>Incentive terms &amp; conditions</h2>
        ${terms}
      </div>`;
  }

  function downloadHqPdf(h) {
    let area = document.getElementById("printArea");
    if (!area) { area = document.createElement("div"); area.id = "printArea"; document.body.appendChild(area); }
    area.innerHTML = buildHqPrint(h);
    document.body.classList.add("printing");
    const cleanup = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 40);
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
      const cols = ["Device"].concat(isAdmin() ? ["Landing Cost (L)"] : []).concat(["Quotation (L)", "Standard (L)", "Minimum (L)"]);
      const head = cols.map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
      const body = D.costs.device.map((r) => `<tr>
        <td class="t-name">${esc(r.device)}</td>
        ${isAdmin() ? `<td class="num">${r.landingCost ?? "—"}</td>` : ""}
        <td class="num">${r.quotation ?? "—"}</td>
        <td class="num">${r.standard ?? "—"}</td>
        <td class="num">${r.minimum ?? "—"}</td></tr>`).join("");
      return `<div class="callout">${isAdmin() ? "Landing = EXW + ~30% (customs + transport). " : "Landing cost is admin-only. "}Values in ₹ Lakhs, excl. GST.</div>${table(head, body)}`;
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
      const cols = ["Variant", "Pack"].concat(isAdmin() ? ["Landing Cost"] : []).concat(["Standard (Total)", "MRP", "New MRP", "Min (EXW)"]);
      const head = cols.map((x, i) => `<th class="${i >= 2 ? "num" : ""}">${x}</th>`).join("");
      const body = rows.map((r) => `<tr>
        <td class="t-name">${esc(r.variant)}</td>
        <td class="t-muted">${esc(r.pack)}</td>
        ${isAdmin() ? `<td class="num">${rupee(r.landingCost)}</td>` : ""}
        <td class="num">${rupee(r.standardTotal)}</td>
        <td class="num">${rupee(r.mrp)}</td>
        <td class="num">${rupee(r.newMrp)}</td>
        <td class="num">${rupee(r.minEXW)}</td></tr>`).join("");
      return `<div class="block"><h2>${esc(title)}</h2>${table(head, body)}</div>`;
    };
    const e = D.costs.esthemax;
    return `<div class="callout">${isAdmin() ? "Landing = EXW + 44% customs + transport. " : "Landing cost is admin-only. "}Standard (Total) = landing + marketing + profit. Min (EXW) = Primelaze ex-works price. Per box, excl. GST.</div>
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
  //   need    = max(0, requiredStock − currentStock)
  //   toBuy   = need rounded to the minimum order lot (JAR 25, Retail 50),
  //             round-to-nearest lot: round(need / lot) × lot
  //   landing = unitUSD × usdInr × (1 + customs) + transport
  //   money   = toBuy × landing
  // live as the user edits FX / customs / current stock / lot sizes.
  const MOQ_JAR = 25, MOQ_RETAIL = 50;
  const orderState = { usdInr: null, customs: null, moqJar: null, moqRetail: null, stock: {}, eta: {}, cat: "All", q: "" };
  // Which product line's inventory is shown. Only Esthemax has stock data today.
  const INVENTORY_LINES = [
    { id: "esthemax", label: "Esthemax", ready: true },
    { id: "celluma", label: "Celluma", ready: false },
    { id: "devices", label: "Devices", ready: false },
  ];
  let inventoryLine = "esthemax";

  function orderInit() {
    const p = D.esthemaxOrder.params;
    if (orderState.usdInr == null) orderState.usdInr = p.usdInr;
    if (orderState.customs == null) orderState.customs = p.customsRate;
    if (orderState.moqJar == null) orderState.moqJar = MOQ_JAR;
    if (orderState.moqRetail == null) orderState.moqRetail = MOQ_RETAIL;
  }

  function moqFor(cat) {
    if (cat === "JAR") return orderState.moqJar;
    if (cat === "RETAIL") return orderState.moqRetail;
    return 1; // accessories / samples: no lot rounding
  }

  function orderCompute() {
    const usd = orderState.usdInr, cus = orderState.customs;
    return D.esthemaxOrder.items.map((it, i) => {
      const current = orderState.stock[i] != null ? orderState.stock[i] : it.currentStock;
      const need = Math.max(0, Math.round((it.requiredStock - current) * 100) / 100);
      const lot = moqFor(it.category) || 1;
      // round-to-nearest lot: 37→25, 38→50 (jar); 51→50, 76→100 (retail)
      const toBuy = lot > 1 ? Math.round(need / lot) * lot : need;
      const landing = it.unitUSD * usd * (1 + cus) + it.transport;
      const money = toBuy * landing;
      const canSell = current >= it.requiredStock; // enough stock to sell / advertise
      return { it, i, current, need, lot, toBuy, landing, money, canSell };
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
    const lineOpts = INVENTORY_LINES.map((l) =>
      `<option value="${l.id}" ${l.id === inventoryLine ? "selected" : ""}>${esc(l.label)}${l.ready ? "" : " — no data yet"}</option>`).join("");
    const line = INVENTORY_LINES.find((l) => l.id === inventoryLine) || INVENTORY_LINES[0];

    setTimeout(() => {
      const lineSel = document.getElementById("invLine");
      if (lineSel) lineSel.onchange = (e) => { inventoryLine = e.target.value; renderTab("order"); };
      if (!line.ready) return; // placeholder view has no other controls to wire
      const wire = (id, key, factor) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) { orderState[key] = factor ? v / 100 : v; orderPaint(); }
        };
      };
      wire("ordUsd", "usdInr", false);
      wire("ordCustoms", "customs", true);
      wire("ordMoqJar", "moqJar", false);
      wire("ordMoqRetail", "moqRetail", false);
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
        orderState.usdInr = p.usdInr; orderState.customs = p.customsRate;
        orderState.moqJar = MOQ_JAR; orderState.moqRetail = MOQ_RETAIL; orderState.stock = {}; orderState.eta = {};
        renderTab("order");
      };
      orderPaint();
    }, 0);

    const lineSelector = `
      <div class="controls">
        <label class="inv-line"><span>Inventory line</span>
          <select id="invLine" class="select">${lineOpts}</select>
        </label>
      </div>`;

    if (!line.ready) {
      return `
      <div class="section-head">
        <h1>Inventory</h1>
        <p>Stock, reorder planning and sell-status across product lines. Select a line to view its inventory.</p>
      </div>
      ${lineSelector}
      <div class="card" style="text-align:center;padding:44px 20px">
        <div style="font-size:34px;margin-bottom:8px">📦</div>
        <h2 style="margin:0 0 6px">No inventory data yet for ${esc(line.label)}</h2>
        <p class="t-muted" style="max-width:52ch;margin:0 auto">Add ${esc(line.label)} stock &amp; sales data (like the Esthemax order sheet) to enable reorder planning and sell-status here.</p>
      </div>`;
    }

    const cats = ["All"].concat(Array.from(new Set(D.esthemaxOrder.items.map((x) => x.category))));
    const catSeg = cats.map((c) => `<button data-ocat="${esc(c)}" class="${orderState.cat === c ? "active" : ""}">${esc(c)}</button>`).join("");
    const p = D.esthemaxOrder.params;

    return `
      <div class="section-head">
        <h1>Inventory — Esthemax</h1>
        <p>Stock &amp; reorder plan from 15 months of sales (Apr-25 → Jun-26). Required stock covers ${esc(p.dermaMonths)} derma + ${esc(p.salonMonths)} salon months. Items with stock ≥ required are marked <b>Can sell</b>; others <b>Reorder</b>. Buy quantities round to the minimum order lot — JAR ${orderState.moqJar}, Retail ${orderState.moqRetail}. Adjust FX, customs, lot sizes and current stock live.</p>
      </div>
      ${lineSelector}

      <div class="card" style="margin-bottom:18px">
        <div class="order-params">
          <label class="ord-field"><span>USD → INR</span><input id="ordUsd" type="number" step="0.01" value="${orderState.usdInr}" ${roAttr()}></label>
          <label class="ord-field"><span>Customs rate (%)</span><input id="ordCustoms" type="number" step="1" value="${+(orderState.customs * 100).toFixed(2)}" ${roAttr()}></label>
          <label class="ord-field"><span>JAR min order</span><input id="ordMoqJar" type="number" step="1" min="1" value="${orderState.moqJar}" ${roAttr()}></label>
          <label class="ord-field"><span>Retail min order</span><input id="ordMoqRetail" type="number" step="1" min="1" value="${orderState.moqRetail}" ${roAttr()}></label>
          <div class="ord-field"><span>Coverage</span><b>${esc(p.dermaMonths)} derma + ${esc(p.salonMonths)} salon mo</b></div>
          <button id="ordReset" class="ghost-btn" type="button" ${roAttr()}>Reset</button>
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
            <th>Item</th><th>Category</th><th>Status</th><th class="num">6-mo avg</th><th>Trend</th>
            <th class="num">Required</th><th class="num">Current</th><th class="num">To Buy</th>
            <th>ETA (arrival)</th>${isAdmin() ? `<th class="num">Landing/Unit</th><th class="num">Money Required</th>` : ""}
          </tr></thead>
          <tbody id="orderBody"></tbody>
        </table>
      </div>
      <div class="muted-note">Current stock is editable — type a new value to re-plan. To Buy rounds the shortfall to the nearest minimum-order lot (JAR ${orderState.moqJar} / Retail ${orderState.moqRetail}); “need” shows the raw shortfall. Money Required = To Buy × Landing/Unit. Landing = (Unit USD × FX) + customs + transport.</div>`;
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
    const canSell = filtered.filter((r) => r.canSell).length;
    const kpis = [
      { cls: "k-good", label: "Can sell now", value: inr(canSell), note: `of ${filtered.length} shown` },
      { cls: "", label: "SKUs to reorder", value: inr(toOrder), note: "stock below required" },
      { cls: "k-teal", label: "Units to buy", value: inr(Math.round(units)), note: "min-order rounded" },
    ].concat(isAdmin() ? [{ cls: "k-warn", label: "Money required", value: rupeeShort(money), note: "landed cost, excl. GST" }] : [])
      .map((x) => `<div class="card kpi ${x.cls}"><div class="kpi-label">${x.label}</div><div class="kpi-value">${x.value}</div><div class="kpi-note">${esc(x.note)}</div></div>`).join("");
    const kEl = document.getElementById("orderKpis");
    if (kEl) kEl.innerHTML = kpis;

    const sorted = filtered.slice().sort((a, b) => b.money - a.money || b.toBuy - a.toBuy);
    const body = sorted.map((r) => {
      const catCls = { JAR: "b-accent", RETAIL: "b-teal", Accessory: "b-neutral", SAMPLE: "b-warn" }[r.it.category] || "b-neutral";
      const status = r.canSell
        ? `<span class="badge b-good">Can sell</span>`
        : `<span class="badge b-warn">Reorder</span>`;
      return `<tr>
        <td class="t-name">${esc(r.it.name)}</td>
        <td><span class="badge ${catCls}">${esc(r.it.category)}</span></td>
        <td>${status}</td>
        <td class="num">${isNum(r.it.sixMoAvg) ? r.it.sixMoAvg.toFixed(1) : "—"}</td>
        <td class="spark-cell">${sparkline(r.it.monthly)}</td>
        <td class="num">${inr(r.it.requiredStock)}</td>
        <td class="num"><input class="stock-input" type="number" data-idx="${r.i}" value="${r.current}" ${roAttr()} /></td>
        <td class="num ${r.toBuy > 0 ? "buy-pos" : ""}">${inr(Math.round(r.toBuy))}${r.toBuy !== r.need ? `<div class="cell-note" style="font-weight:600">need ${inr(Math.round(r.need))}</div>` : ""}</td>
        <td><input class="eta-input" type="date" data-idx="${r.i}" value="${esc(orderState.eta[r.i] || "")}" title="Expected arrival at Primelaze" ${roAttr()} /></td>
        ${isAdmin() ? `<td class="num">${rupee(r.landing, { decimals: 0 })}</td>
        <td class="num t-name">${r.money > 0 ? rupee(r.money, { decimals: 0 }) : "—"}</td>` : ""}
      </tr>`;
    }).join("") || `<tr><td colspan="${isAdmin() ? 11 : 9}" class="empty">No matching items.</td></tr>`;
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
    // ETA (expected arrival at Primelaze) — informational, no recompute needed.
    document.querySelectorAll(".eta-input").forEach((inp) => {
      inp.onchange = (e) => { orderState.eta[+e.target.dataset.idx] = e.target.value; };
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
    currentTab = tab.id;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab.id));
    $("#view").innerHTML = tab.render();
    enhanceTables();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (location.hash.slice(1) !== tab.id) history.replaceState(null, "", "#" + tab.id);
  }

  // Generic click-to-sort + per-table filter for every rendered table.
  function enhanceTables() {
    document.querySelectorAll("#view .table-wrap").forEach((wrap) => {
      if (wrap.dataset.enh) return;
      const table = wrap.querySelector("table");
      const tbody = table && table.querySelector("tbody");
      if (!tbody) return;
      wrap.dataset.enh = "1";

      // filter box above the table
      const tools = document.createElement("div");
      tools.className = "tbl-tools";
      const inp = document.createElement("input");
      inp.type = "search"; inp.className = "tbl-filter"; inp.placeholder = "Filter this table…";
      inp.oninput = () => {
        const q = inp.value.toLowerCase();
        tbody.querySelectorAll("tr").forEach((tr) => {
          if (tr.classList.contains("total-row")) return;
          tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
        });
      };
      tools.appendChild(inp);
      wrap.parentNode.insertBefore(tools, wrap);

      // sortable headers
      const ths = Array.from(table.querySelectorAll("thead th"));
      ths.forEach((th, ci) => {
        th.classList.add("sortable");
        th.addEventListener("click", () => {
          const dir = th.dataset.dir === "asc" ? "desc" : "asc";
          ths.forEach((h) => { h.dataset.dir = ""; h.classList.remove("sort-asc", "sort-desc"); });
          th.dataset.dir = dir; th.classList.add(dir === "asc" ? "sort-asc" : "sort-desc");
          const rowsAll = Array.from(tbody.querySelectorAll("tr"));
          const totals = rowsAll.filter((r) => r.classList.contains("total-row"));
          const rows = rowsAll.filter((r) => !r.classList.contains("total-row") && !r.querySelector(".empty"));
          const cellVal = (tr) => {
            const cell = tr.children[ci];
            if (!cell) return { t: "", num: NaN };
            const el = cell.querySelector("input");
            const t = (el ? el.value : cell.textContent).trim();
            const num = parseFloat(t.replace(/[₹,%]/g, "").replace(/[^0-9.\-]/g, ""));
            return { t, num };
          };
          rows.sort((a, b) => {
            const A = cellVal(a), B = cellVal(b);
            const bothNum = !isNaN(A.num) && A.t !== "" && !isNaN(B.num) && B.t !== "";
            const cmp = bothNum ? A.num - B.num : A.t.localeCompare(B.t, undefined, { numeric: true });
            return dir === "asc" ? cmp : -cmp;
          });
          rows.forEach((r) => tbody.appendChild(r));
          totals.forEach((r) => tbody.appendChild(r));
        });
      });
    });
  }

  async function initMode() {
    const btn = document.getElementById("modeToggle");
    if (!btn) return;
    const paint = () => {
      btn.textContent = isAdmin() ? "🔓 Admin" : "👁 View";
      btn.classList.toggle("admin-on", isAdmin());
    };
    paint();
    btn.onclick = async () => {
      if (isAdmin()) { appMode = "view"; paint(); go(currentTab); return; }
      // interim gate: re-enter the site password to enable editing
      const pass = window.prompt("Enter admin password to enable editing:");
      if (pass == null) return;
      try {
        await decryptData(pass); // succeeds only for the correct password
        appMode = "admin"; paint(); go(currentTab);
      } catch (e) {
        window.alert("Incorrect password — staying in view-only mode.");
      }
    };
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
    initMode();
    go(location.hash.slice(1) || "overview");
    // auto-enhance tables that sub-tabs render after the initial paint
    const viewEl = $("#view");
    if (viewEl) new MutationObserver(() => enhanceTables()).observe(viewEl, { childList: true, subtree: true });
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
