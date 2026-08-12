/* ============================================================
   Primelaze Unified Dashboard — application
   Renders entirely from window.APP_DATA (assets/js/data.js).
   No dependencies, no build step.
   ============================================================ */
(function () {
  "use strict";

  // Populated after the password decrypts the data payload (see the gate below).
  let D = null;

  // Session / permissions (populated from Firebase Auth + Firestore after login).
  let appMode = "view";                 // editing on/off (admins can toggle)
  let currentTab = "overview";
  let userRole = "view";                // "admin" | "view" (super maps to admin here)
  let userSuper = false;                // true = Super Admin (everything + user mgmt)
  let perms = { pages: "all", hqs: "all", landing: false, managerInc: false, editPages: [] };
  let sessionUser = null;               // firebase.User
  let auth = null, db = null;           // firebase handles

  // Super Admin can view & edit everything AND manage users (Admin tab).
  // Plain Admin edits every content page but cannot manage users.
  const isSuperAdmin = () => userSuper;
  const roleIsAdmin = () => userRole === "admin";
  // Pages the current user may administer users for ("all" or an id array).
  const myEditablePages = () => {
    if (isSuperAdmin() || roleIsAdmin() || perms.editPages === "all") return "all";
    return Array.isArray(perms.editPages) ? perms.editPages.slice() : [];
  };
  // A "page admin" is a view-role user with edit rights on ≥1 page. They get a
  // scoped user manager: add/edit/revoke VIEW users for their pages only.
  const isPageAdmin = () => { const e = myEditablePages(); return !roleIsAdmin() && (e === "all" || (Array.isArray(e) && e.length > 0)); };
  // A "view" user can be granted edit rights on specific pages (page admin).
  const canEditPage = (id) => {
    const ep = perms.editPages;
    return ep === "all" || (Array.isArray(ep) && ep.includes(id));
  };
  const hasAnyEditGrant = () => perms.editPages === "all" || (Array.isArray(perms.editPages) && perms.editPages.length > 0);
  // "editing enabled" for the CURRENT page: full admins (in admin mode), or a
  // view-user who was granted edit rights on this specific page.
  const isAdmin = () => roleIsAdmin() ? appMode === "admin" : canEditPage(currentTab);
  const canSeeLanding = () => roleIsAdmin() || perms.landing === true;
  const canSeeManagerInc = () => roleIsAdmin() || perms.managerInc === true;
  const roAttr = () => (isAdmin() ? "" : "disabled");
  const allowedPages = () => (roleIsAdmin() || perms.pages === "all") ? "all" : (perms.pages || []);
  const canSeePage = (id) => {
    if (id === "admin") {
      if (isSuperAdmin() && appMode === "admin") return true; // full user management
      if (isPageAdmin()) return true;                          // scoped page-admin manager
      return false;
    }
    if (canEditPage(id)) return true; // page editors can always see what they edit
    const p = allowedPages();
    return p === "all" || p.includes(id);
  };
  const allowedHQs = () => (roleIsAdmin() || perms.hqs === "all") ? "all" : (perms.hqs || []);

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
    { id: "overview", label: "Overview", group: "", render: renderOverview },
    { id: "team", label: "Team Roster", group: "People", render: renderTeam },
    { id: "targets", label: "HQ Targets", group: "Sales", render: renderTargets },
    { id: "incentives", label: "Incentives", group: "Sales", render: renderIncentives },
    { id: "prices", label: "Pricing", group: "Catalog", render: renderPricing },
    { id: "order", label: "Inventory", group: "Operations", render: renderOrder },
    { id: "demo", label: "Demo Machines", group: "Operations", render: renderDemo },
    { id: "challan", label: "Delivery Challan", group: "Operations", render: renderChallan },
    { id: "payments", label: "Payments", group: "Records", render: renderPayments },
    { id: "admin", label: "⚙ Admin", group: "Records", render: renderAdmin },
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
      const sv = (h.summary && h.summary.find((s) => /Std Value/i.test(s.label))) || null;
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
  let teamFilter = "all", teamSearch = "", teamDivision = "all", teamTab = "roster", orgDiv = "all";
  let orgTop = { name: "CTO", title: "Chief — position vacant" }; // editable top node
  const rosterEdits = {}; // `${num}#${field}` -> value
  const rosterAdds = [];  // [{_aid, name, designation, division, baseHQ, reportsTo, zone}]
  let rosterAddSeq = 0;
  const customHQs = [];   // admin-added base-HQ cities
  const customDesignations = []; // admin-added designations/roles
  const rosterRemovals = []; // nums of original roster people deleted by admin
  // Prompt + target list for the "＋ Add new…" option, keyed by roster field.
  const customListFor = (field) =>
    field === "designation"
      ? { label: "Add new designation / role:", list: customDesignations }
      : { label: "Add new HQ (city):", list: customHQs };
  const DIVISIONS = ["Derma", "Salon/Spa"];
  const isRemoved = (p) => p._aid == null && rosterRemovals.includes(p.num);
  function removePerson(p) {
    let nm = "";
    if (p._aid != null) {
      const i = rosterAdds.findIndex((x) => x._aid === p._aid);
      if (i >= 0) { nm = rosterAdds[i].name || ""; rosterAdds.splice(i, 1); }
    } else if (!rosterRemovals.includes(p.num)) {
      nm = ((D.roster.people || [])[p.num] || {}).name || "";
      rosterRemovals.push(p.num);
    }
    saveEdits("Removed person" + (nm ? " " + nm : ""));
  }
  // Living roster = original people (minus deletions) + admin-added rows.
  const roster = () => D.roster.people.filter((p) => !isRemoved(p)).concat(rosterAdds);
  const rval = (p, field) => {
    if (p._aid != null) return p[field] || "";
    const k = p.num + "#" + field;
    return rosterEdits[k] != null ? rosterEdits[k] : p[field];
  };
  const STATUS_OPTIONS = [
    { id: "active", label: "Active" },
    { id: "tojoin", label: "To join" },
    { id: "vacant", label: "Vacant" },
  ];
  // Effective status: an explicit admin override wins, else it's derived from
  // the name / notes (vacant positions, joinees).
  const estatus = (p) => {
    const ov = rval(p, "status");
    if (ov) return ov;
    return statusFromNotes({ name: rval(p, "name"), notes: p.notes });
  };

  /* ---- Vacancy planning (priority / remark / target-fill date) ---- */
  const PRIORITY_OPTIONS = [
    { id: "high", label: "High", cls: "b-bad", rank: 0 },
    { id: "medium", label: "Medium", cls: "b-warn", rank: 1 },
    { id: "low", label: "Low", cls: "b-neutral", rank: 2 },
  ];
  const vacancyEdits = {}; // `${vkey}` -> { priority, remark, fillBy }
  const vkey = (p) => (p._aid != null ? "a:" + p._aid : "n:" + p.num);
  const vget = (p, field) => {
    const v = vacancyEdits[vkey(p)];
    return (v && v[field] != null) ? v[field] : "";
  };
  const vset = (p, field, value) => {
    const k = vkey(p);
    (vacancyEdits[k] || (vacancyEdits[k] = {}))[field] = value;
  };
  const vacantPeople = () =>
    roster().filter((p) => estatus(p) === "vacant");

  // Distinct existing values for a roster field (for dropdowns), plus extras.
  const rosterOptions = (field, extra) => {
    const s = new Set();
    roster().forEach((p) => {
      const v = rval(p, field);
      if (v && v !== "—") s.add(String(v).trim());
    });
    (extra || []).forEach((v) => { if (v) s.add(String(v).trim()); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  };

  // Sales hierarchy rank (National → Zonal → Regional → Area → Executive → Trainee)
  function orgRank(desig) {
    const d = (desig || "").toLowerCase();
    if (d.includes("national")) return 0;
    if (d.includes("zonal")) return 1;
    if (d.includes("regional")) return 2;
    if (d.includes("area sales manager")) return 3;
    if (d.includes("area sales executive")) return 4;
    if (d.includes("executive")) return 4;
    if (d.includes("salon") || d.includes("spa")) return 4;
    if (d.includes("mt") || d.includes("trainee") || d.includes("management")) return 5;
    return 3;
  }

  // Build the reporting-hierarchy tree from Reports-To + designation data.
  // divFilter: "all" | "Derma" | "Salon/Spa" (Arjun is NSM of every division).
  function renderOrgChart(divFilter) {
    divFilter = divFilter || "all";
    const ARJUN = "Arjun";
    const isCto = (r) => /^cto$/i.test(r);
    const all = roster()
      .filter((p) => divFilter === "all" || (rval(p, "division") || "Derma") === divFilter)
      .map((p) => ({
      name: (rval(p, "name") || "").trim(),
      desig: rval(p, "designation") || "",
      rep: (rval(p, "reportsTo") || "").trim(),
      hq: rval(p, "baseHQ") || "",
      div: rval(p, "division") || "Derma",
      st: estatus(p),
    })).filter((x) => x.name);
    const byName = {}; all.forEach((x) => { byName[x.name] = x; });
    const childrenOf = (mgr) => all.filter((x) => x.rep === mgr && x.name !== mgr)
      .sort((a, b) => orgRank(a.desig) - orgRank(b.desig) || a.name.localeCompare(b.name));
    const rank = (a, b) => orgRank(a.desig) - orgRank(b.desig) || a.name.localeCompare(b.name);

    const node = (x, seen) => {
      if (seen.has(x.name)) return "";
      seen.add(x.name);
      const kids = childrenOf(x.name);
      const cls = x.st === "vacant" ? "org-vacant" : x.st === "tojoin" ? "org-tojoin" : (x.div === "Salon/Spa" ? "org-spa" : "");
      const hq = x.hq && x.hq !== "—" ? `<span class="org-hq">${esc(x.hq)}</span>` : "";
      return `<li class="org-node">
        <div class="org-card ${cls}">
          <span class="org-name">${esc(x.name)}</span>
          <span class="org-desig">${esc(x.desig)}</span>${hq}
        </div>
        ${kids.length ? `<ul class="org-children">${kids.map((k) => node(k, seen)).join("")}</ul>` : ""}
      </li>`;
    };

    const seen = new Set([ARJUN, "CTO"]);
    // Arjun's reports: reportsTo = "Arjun", or orphans (unknown manager, not CTO).
    const arjunKids = all.filter((x) => x.name !== ARJUN && !isCto(x.rep) && (x.rep === ARJUN || !byName[x.rep])).sort(rank);
    // Peers of Arjun that report straight to the (vacant) CTO.
    const ctoPeers = all.filter((x) => x.name !== ARJUN && isCto(x.rep)).sort(rank);

    const arjunNode = `<li class="org-node">
      <div class="org-card org-root"><span class="org-name">Arjun</span><span class="org-desig">National Sales Manager</span></div>
      <ul class="org-children">${arjunKids.map((k) => node(k, seen)).join("")}</ul>
    </li>`;

    return `<ul class="org-tree">
      <li class="org-node">
        <div class="org-card org-cto"><span class="org-name">${esc(orgTop.name || "CTO")}</span><span class="org-desig">${esc(orgTop.title || "")}</span></div>
        <ul class="org-children">${arjunNode}${ctoPeers.map((k) => node(k, seen)).join("")}</ul>
      </li>
    </ul>`;
  }

  function wireTeamSubnav() {
    document.querySelectorAll("[data-teamtab]").forEach((b) => {
      b.onclick = () => { teamTab = b.dataset.teamtab; go("team"); };
    });
  }
  const teamSubnav = () => `
    <div class="seg team-subnav" style="margin-bottom:16px">
      <button data-teamtab="roster" class="${teamTab === "roster" ? "active" : ""}">Team Roster</button>
      <button data-teamtab="vacancies" class="${teamTab === "vacancies" ? "active" : ""}">Vacancies</button>
    </div>`;

  function renderTeam() {
    if (teamTab === "vacancies") {
      setTimeout(wireTeamSubnav, 0);
      return teamSubnav() + renderVacancies();
    }
    const people = D.roster.people;
    const summary = D.roster.summary || {};
    const summaryCards = Object.entries(summary).map(([k, v]) => `
      <div class="stat"><b>${inr(v)}</b><span>${esc(k)}</span></div>`).join("");

    const view = () => {
      const ed = isAdmin();
      const idAttr = (p) => p._aid != null ? `data-aid="${p._aid}"` : `data-num="${p.num}"`;
      const cell = (p, field, cls) => {
        const val = rval(p, field) || "";
        return `<td class="${cls || ""}"${ed ? ' contenteditable="true"' : ""} ${idAttr(p)} data-field="${field}">${esc(val)}</td>`;
      };
      // Editable dropdown cell sourced from existing distinct values.
      const selCell = (p, field, opts, addNew) => {
        const cur = rval(p, field) || "";
        const options = opts.slice();
        if (cur && !options.includes(cur)) options.unshift(cur);
        let html = `<option value=""${cur === "" ? " selected" : ""}>—</option>`;
        html += options.map((o) => `<option value="${esc(o)}"${o === cur ? " selected" : ""}>${esc(o)}</option>`).join("");
        if (addNew) html += `<option value="__add__">＋ Add new…</option>`;
        return `<td><select class="roster-sel" ${idAttr(p)} data-field="${field}">${html}</select></td>`;
      };
      const all = people.filter((p) => !isRemoved(p)).concat(rosterAdds);
      const rows = all.filter((p) => {
        const name = rval(p, "name"), division = rval(p, "division") || "Derma";
        const st = estatus(p);
        if (teamFilter !== "all" && teamFilter !== st) return false;
        if (teamDivision !== "all" && division !== teamDivision) return false;
        if (teamSearch) {
          const hay = `${name} ${rval(p, "designation")} ${rval(p, "baseHQ")} ${rval(p, "zone")} ${rval(p, "reportsTo")} ${division} ${p.notes || ""}`.toLowerCase();
          if (!hay.includes(teamSearch.toLowerCase())) return false;
        }
        return true;
      }).map((p, i) => {
        const name = rval(p, "name"), division = rval(p, "division") || "Derma";
        const rc = roleClass(name, rval(p, "designation"));
        const st = estatus(p);
        const badge = st === "vacant" ? `<span class="badge b-bad">Vacant</span>`
          : st === "tojoin" ? `<span class="badge b-info">To join</span>`
          : `<span class="badge ${rc.cls}">${rc.label}</span>`;
        const statusCell = ed
          ? `<td><select class="roster-status" ${idAttr(p)} data-field="status">${
              STATUS_OPTIONS.map((o) => `<option value="${o.id}"${o.id === st ? " selected" : ""}>${o.label}</option>`).join("")
            }</select></td>`
          : `<td>${badge}</td>`;
        const divBadge = `<span class="badge ${division === "Salon/Spa" ? "b-teal" : "b-accent"}">${esc(division)}</span>`;
        const divCell = ed
          ? selCell(p, "division", DIVISIONS)
          : `<td>${divBadge}</td>`;
        const firstCell = ed
          ? `<td class="num t-muted"><button class="linkish roster-rm" ${idAttr(p)} title="Remove">✕</button></td>`
          : `<td class="num t-muted">${p.num != null ? p.num : ""}</td>`;
        return `<tr>
          ${firstCell}
          ${cell(p, "name", "t-name")}
          ${ed ? selCell(p, "designation", rosterOptions("designation", customDesignations), true) : cell(p, "designation")}
          ${divCell}
          ${ed ? selCell(p, "baseHQ", rosterOptions("baseHQ", customHQs), true) : cell(p, "baseHQ")}
          ${ed ? selCell(p, "reportsTo", rosterOptions("reportsTo", ["CTO", "Arjun"])) : cell(p, "reportsTo")}
          ${ed ? selCell(p, "zone", rosterOptions("zone")) : cell(p, "zone")}
          ${statusCell}
        </tr>`;
      }).join("");
      return rows || `<tr><td colspan="8" class="empty">No matching personnel.</td></tr>`;
    };

    const repaint = () => { $("#teamBody").innerHTML = view(); wireRosterEdit(); };

    const head = ["#", "Name", "Designation", "Division", "Base HQ", "Reports To", "Zone", "Status"]
      .map((h, i) => `<th class="${i === 0 ? "num" : ""}">${h}</th>`).join("");

    setTimeout(() => {
      const search = $("#teamSearch");
      if (search) search.oninput = (e) => { teamSearch = e.target.value; repaint(); };
      document.querySelectorAll("[data-tfilter]").forEach((b) => {
        b.onclick = () => {
          teamFilter = b.dataset.tfilter;
          document.querySelectorAll("[data-tfilter]").forEach((x) => x.classList.toggle("active", x === b));
          repaint();
        };
      });
      document.querySelectorAll("[data-tdiv]").forEach((b) => {
        b.onclick = () => {
          teamDivision = b.dataset.tdiv;
          document.querySelectorAll("[data-tdiv]").forEach((x) => x.classList.toggle("active", x === b));
          repaint();
        };
      });
      wireRosterEdit();
      wireTeamSubnav();
      document.querySelectorAll("[data-orgdiv]").forEach((b) => {
        b.onclick = () => {
          orgDiv = b.dataset.orgdiv;
          document.querySelectorAll("[data-orgdiv]").forEach((x) => x.classList.toggle("active", x === b));
          const box = document.getElementById("orgScroll");
          if (box) box.innerHTML = renderOrgChart(orgDiv);
        };
      });
      const orgTopBtn = document.getElementById("orgTopBtn");
      if (orgTopBtn) orgTopBtn.onclick = () => {
        const name = (window.prompt("Top position title (e.g. CTO, Managing Director):", orgTop.name || "CTO") || "").trim();
        if (!name) return;
        const title = (window.prompt("Subtitle / status (e.g. name or 'position vacant'):", orgTop.title || "") || "").trim();
        orgTop = { name, title };
        saveEdits("Renamed top position → " + name);
        const box = document.getElementById("orgScroll");
        if (box) box.innerHTML = renderOrgChart(orgDiv);
      };
      const orgAdd = document.getElementById("orgAddBtn");
      if (orgAdd) orgAdd.onclick = () => {
        const aid = "r" + (rosterAddSeq++);
        rosterAdds.push({ _aid: aid, name: "New position", designation: "", division: "Derma", baseHQ: "", reportsTo: "Arjun", zone: "", status: "tojoin" });
        saveEdits("Added a position");
        teamTab = "roster"; teamFilter = "all"; teamDivision = "all"; teamSearch = "";
        go("team");
        flashRow(aid);
      };
    }, 0);

    return teamSubnav() + `
      <div class="section-head">
        <h1>Team Roster</h1>
        <p>All sales personnel across zones for ${esc(D.meta.fiscalYear)}, including vacant positions and new joinees.${isAdmin() ? " Click any cell to edit — changes save for everyone." : ""}</p>
      </div>
      <div class="card" style="margin-bottom:20px"><div class="stat-row">${summaryCards}</div></div>
      <details class="card org-wrap" style="margin-bottom:20px" open>
        <summary class="org-summary">Reporting hierarchy</summary>
        <div class="controls" style="margin:12px 0 0">
          <div class="seg">
            <button data-orgdiv="all" class="${orgDiv === "all" ? "active" : ""}">All</button>
            <button data-orgdiv="Derma" class="${orgDiv === "Derma" ? "active" : ""}">Derma</button>
            <button data-orgdiv="Salon/Spa" class="${orgDiv === "Salon/Spa" ? "active" : ""}">Salon/Spa</button>
          </div>
          ${isAdmin() ? `<div class="hq-actions"><button id="orgTopBtn" class="ghost-btn" type="button">✎ Rename top</button><button id="orgAddBtn" class="dl-btn" type="button">＋ Add position</button></div>` : ""}
        </div>
        <div class="org-scroll" id="orgScroll">${renderOrgChart(orgDiv)}</div>
        ${isAdmin() ? `<div class="muted-note" style="margin-top:8px">Add a position, then set its name, designation and who it reports to (CTO, Arjun, or any manager) in the roster row that appears below.</div>` : ""}
      </details>
      <div class="controls">
        <input id="teamSearch" class="search" type="search" value="${esc(teamSearch)}" placeholder="Search name, HQ, zone, division…" />
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
        ${isAdmin() ? `<div class="hq-actions"><button id="rosterAddBtn" class="dl-btn" type="button">＋ Add person</button></div>` : ""}
      </div>
      <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody id="teamBody">${view()}</tbody></table></div>`;
  }

  // "Ravi Kumar · Base HQ → Pune" describing an edited roster field.
  function rosterWhat(num, aid, field, val) {
    let nm = "";
    if (aid) { const p = rosterAdds.find((x) => x._aid === aid); nm = (p && p.name) || ""; }
    else { const p = (D.roster.people || [])[+num]; nm = (p && p.name) || ""; }
    const label = { baseHQ: "Base HQ", reportsTo: "Reports To", designation: "Designation", division: "Division", zone: "Zone", status: "Status", name: "Name" }[field] || field;
    return `${nm ? nm + " · " : ""}${label} → ${val || "—"}`;
  }

  function wireRosterEdit() {
    if (!isAdmin()) return;
    document.querySelectorAll("#teamBody td[contenteditable]").forEach((td) => {
      td.onblur = () => {
        const val = td.textContent.trim(), field = td.dataset.field;
        if (td.dataset.aid) {
          const p = rosterAdds.find((x) => x._aid === td.dataset.aid);
          if (p) p[field] = val;
        } else {
          rosterEdits[td.dataset.num + "#" + field] = val;
        }
        saveEdits(rosterWhat(td.dataset.num, td.dataset.aid, field, val));
      };
    });
    document.querySelectorAll("#teamBody .roster-sel").forEach((sel) => {
      sel.onchange = () => {
        const field = sel.dataset.field;
        let val = sel.value;
        if (val === "__add__") {
          const cfg = customListFor(field);
          const name = (window.prompt(cfg.label) || "").trim();
          if (!name) { go("team"); return; }
          if (!cfg.list.includes(name)) cfg.list.push(name);
          val = name;
        }
        if (sel.dataset.aid) {
          const p = rosterAdds.find((x) => x._aid === sel.dataset.aid);
          if (p) p[field] = val;
        } else {
          rosterEdits[sel.dataset.num + "#" + field] = val;
        }
        saveEdits(rosterWhat(sel.dataset.num, sel.dataset.aid, field, val));
        // Re-render so a new HQ / designation / division reflects everywhere.
        go("team");
      };
    });
    document.querySelectorAll("#teamBody .roster-status").forEach((sel) => {
      sel.onchange = () => {
        const val = sel.value, field = sel.dataset.field;
        if (sel.dataset.aid) {
          const p = rosterAdds.find((x) => x._aid === sel.dataset.aid);
          if (p) p[field] = val;
        } else {
          rosterEdits[sel.dataset.num + "#" + field] = val;
        }
        saveEdits(rosterWhat(sel.dataset.num, sel.dataset.aid, field, val));
        // Re-render so the pill colour and status filter reflect the change.
        go("team");
      };
    });
    document.querySelectorAll("#teamBody .roster-rm").forEach((b) => {
      b.onclick = () => {
        if (!window.confirm("Remove this person from the roster?")) return;
        removePerson(b.dataset.aid != null ? { _aid: b.dataset.aid } : { num: +b.dataset.num });
        go("team");
      };
    });
    const add = document.getElementById("rosterAddBtn");
    if (add) add.onclick = () => {
      const aid = "r" + (rosterAddSeq++);
      rosterAdds.push({ _aid: aid, name: "New person", designation: "", division: "Derma", baseHQ: "", reportsTo: "", zone: "" });
      saveEdits("Added a person");
      // Reset filters/sub-tab so the freshly-added (Active) row is visible —
      // otherwise an active filter (e.g. "Vacant") hides it and it looks broken.
      teamTab = "roster"; teamFilter = "all"; teamDivision = "all"; teamSearch = "";
      go("team");
      flashRow(aid); // scroll it into view (table is a scroll box) and highlight
    };
  }

  // After adding a row, scroll the table to it and flash it so it's obvious.
  function flashRow(aid) {
    setTimeout(() => {
      const cell = document.querySelector(`#teamBody [data-aid="${aid}"]`);
      const tr = cell && cell.closest("tr");
      if (tr) { tr.scrollIntoView({ behavior: "smooth", block: "center" }); tr.classList.add("row-flash"); }
    }, 60);
  }

  /* ================= VACANCIES ================= */
  let vacancySort = "priority"; // "priority" | "fillBy"
  function renderVacancies() {
    const list = vacantPeople();
    const prMeta = (id) => PRIORITY_OPTIONS.find((o) => o.id === id) || PRIORITY_OPTIONS[1];
    // default priority Medium when not yet set
    const effPr = (p) => vget(p, "priority") || "medium";

    const sorted = list.slice().sort((a, b) => {
      if (vacancySort === "fillBy") {
        const fa = vget(a, "fillBy") || "9999-12-31", fb = vget(b, "fillBy") || "9999-12-31";
        return fa < fb ? -1 : fa > fb ? 1 : 0;
      }
      return prMeta(effPr(a)).rank - prMeta(effPr(b)).rank;
    });

    const ed = isAdmin();
    const open = list.filter((p) => !vget(p, "fillBy")).length;
    const high = list.filter((p) => effPr(p) === "high").length;

    // Roster-backed editable cells (write through to Team Roster).
    const ridAttr = (p) => (p._aid != null ? `data-aid="${p._aid}"` : `data-num="${p.num}"`);
    const rSel = (p, field, opts, addNew) => {
      if (!ed) return `<td>${esc(rval(p, field) || "—")}</td>`;
      const cur = rval(p, field) || "";
      const options = opts.slice();
      if (cur && !options.includes(cur)) options.unshift(cur);
      let html = `<option value=""${cur === "" ? " selected" : ""}>—</option>`;
      html += options.map((o) => `<option value="${esc(o)}"${o === cur ? " selected" : ""}>${esc(o)}</option>`).join("");
      if (addNew) html += `<option value="__add__">＋ Add new…</option>`;
      return `<td><select class="vac-rsel" ${ridAttr(p)} data-field="${field}">${html}</select></td>`;
    };

    const rows = sorted.map((p, i) => {
      const name = rval(p, "name"), pr = effPr(p);
      const nameCell = ed
        ? `<td class="t-name vac-rname" contenteditable="true" ${ridAttr(p)} data-field="name">${esc(name)}</td>`
        : `<td class="t-name">${esc(name)}</td>`;
      const prCell = ed
        ? `<td><select class="vac-in" data-k="${vkey(p)}" data-field="priority">${
            PRIORITY_OPTIONS.map((o) => `<option value="${o.id}"${o.id === pr ? " selected" : ""}>${o.label}</option>`).join("")
          }</select></td>`
        : `<td><span class="badge ${prMeta(pr).cls}">${prMeta(pr).label}</span></td>`;
      const fillCell = ed
        ? `<td><input class="vac-in" type="date" data-k="${vkey(p)}" data-field="fillBy" value="${esc(vget(p, "fillBy"))}" /></td>`
        : `<td>${vget(p, "fillBy") ? esc(vget(p, "fillBy")) : "<span class='t-muted'>—</span>"}</td>`;
      const remarkCell = ed
        ? `<td><input class="vac-in vac-remark" type="text" data-k="${vkey(p)}" data-field="remark" placeholder="Add remark…" value="${esc(vget(p, "remark"))}" /></td>`
        : `<td>${vget(p, "remark") ? esc(vget(p, "remark")) : "<span class='t-muted'>—</span>"}</td>`;
      const firstCell = ed
        ? `<td class="num t-muted"><button class="linkish vac-rm" ${ridAttr(p)} title="Remove">✕</button></td>`
        : `<td class="num t-muted">${i + 1}</td>`;
      return `<tr>
        ${firstCell}
        ${nameCell}
        ${rSel(p, "designation", rosterOptions("designation", customDesignations), true)}
        ${rSel(p, "baseHQ", rosterOptions("baseHQ", customHQs), true)}
        ${rSel(p, "zone", rosterOptions("zone"))}
        ${prCell}
        ${fillCell}
        ${remarkCell}
      </tr>`;
    }).join("") || `<tr><td colspan="8" class="empty">No vacant positions — every seat is filled. 🎉</td></tr>`;

    const head = ["#", "Position / Name", "Designation", "Base HQ", "Zone", "Priority", "Target fill by", "Remark"]
      .map((h, i) => `<th class="${i === 0 ? "num" : ""}">${h}</th>`).join("");

    setTimeout(() => {
      document.querySelectorAll("[data-vsort]").forEach((b) => {
        b.onclick = () => {
          vacancySort = b.dataset.vsort;
          document.querySelectorAll("[data-vsort]").forEach((x) => x.classList.toggle("active", x === b));
          go("team");
        };
      });
      wireVacancyEdit();
    }, 0);

    return `
      <div class="section-head">
        <h1>Vacancies</h1>
        <p>Open positions across the team${ed ? " — every field is editable: refine the role details, set a priority, a target date to fill, and a remark. Detail edits sync with the Team Roster. Changes save for everyone." : ". An administrator prioritises and schedules these."}</p>
      </div>
      <div class="card" style="margin-bottom:20px"><div class="stat-row">
        <div class="stat"><b>${list.length}</b><span>Vacant positions</span></div>
        <div class="stat"><b>${high}</b><span>High priority</span></div>
        <div class="stat"><b>${open}</b><span>No target date yet</span></div>
      </div></div>
      <div class="controls">
        <div class="seg">
          <button data-vsort="priority" class="${vacancySort === "priority" ? "active" : ""}">By priority</button>
          <button data-vsort="fillBy" class="${vacancySort === "fillBy" ? "active" : ""}">By target date</button>
        </div>
        ${ed ? `<div class="hq-actions"><button id="vacancyAddBtn" class="dl-btn" type="button">＋ Add vacancy</button></div>` : ""}
      </div>
      <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function wireVacancyEdit() {
    if (!isAdmin()) return;
    document.querySelectorAll(".vac-in").forEach((el) => {
      const commit = () => {
        const k = el.dataset.k;
        (vacancyEdits[k] || (vacancyEdits[k] = {}))[el.dataset.field] = el.value;
        saveEdits();
      };
      el.onchange = commit;
      if (el.tagName === "INPUT" && el.type === "text") el.onblur = commit;
    });
    // Roster-backed fields (name/designation/HQ/zone/reports-to) — write
    // through to the shared roster so Team Roster and Vacancies stay in sync.
    const writeRoster = (el, val) => {
      const field = el.dataset.field;
      if (el.dataset.aid) {
        const p = rosterAdds.find((x) => x._aid === el.dataset.aid);
        if (p) p[field] = val;
      } else {
        rosterEdits[el.dataset.num + "#" + field] = val;
      }
    };
    document.querySelectorAll(".vac-rsel").forEach((sel) => {
      sel.onchange = () => {
        let val = sel.value;
        if (val === "__add__") {
          const cfg = customListFor(sel.dataset.field);
          const name = (window.prompt(cfg.label) || "").trim();
          if (!name) { go("team"); return; }
          if (!cfg.list.includes(name)) cfg.list.push(name);
          val = name;
        }
        writeRoster(sel, val);
        saveEdits(rosterWhat(sel.dataset.num, sel.dataset.aid, sel.dataset.field, val));
        go("team");
      };
    });
    document.querySelectorAll(".vac-rname").forEach((td) => {
      td.onblur = () => { writeRoster(td, td.textContent.trim()); saveEdits(); };
    });
    document.querySelectorAll(".vac-rm").forEach((b) => {
      b.onclick = () => {
        if (!window.confirm("Delete this vacancy?")) return;
        removePerson(b.dataset.aid != null ? { _aid: b.dataset.aid } : { num: +b.dataset.num });
        go("team");
      };
    });
    const addVac = document.getElementById("vacancyAddBtn");
    if (addVac) addVac.onclick = () => {
      // A vacancy is a roster row flagged vacant, so it also shows in Team Roster.
      rosterAdds.push({ _aid: "r" + (rosterAddSeq++), name: "Vacant position", designation: "", division: "Derma", baseHQ: "", reportsTo: "Arjun", zone: "", status: "vacant" });
      saveEdits();
      go("team");
    };
  }

  /* ================= HQ TARGETS ================= */
  let hqIndex = 0, hqYear = null;
  const hqEdits = {}; // `${sheet}#${planIdx}#${rowIdx}` -> edited FY26-27 value
  const hqAdds = {};  // `${sheet}#${planIdx}` -> [{product, fy2627, deviceValue}]
  const hqQtr = {};   // `${pk}#${rowKey}#${year}` -> { q1, q2, q3, q4 } quarterly target
  // 5 planning years starting at the base fiscal year (e.g. 2026 → 2026..2030).
  function hqYears() {
    let base = 2026;
    const m = String((D && D.meta && D.meta.fiscalYear) || "").match(/(20\d\d)/);
    if (m) base = +m[1];
    return [0, 1, 2, 3, 4].map((i) => base + i);
  }
  // Sales achieved per HQ sheet.
  const hqSales = {};     // device sales: `${sheet}` -> [{ id, product, buyer, location, soldBy, amount }]
  const hqEsthSales = {}; // esthemax sales: `${sheet}` -> [{ id, product, qty, buyer, location, soldBy, amount }]
  let hqSaleSeq = 0;
  const esthemaxProductNames = () => {
    const s = new Set();
    Object.values(D.esthemaxPrices || {}).forEach((mk) => Object.values(mk.groups || {}).forEach((rows) => rows.forEach((r) => { if (r.name) s.add(r.name); })));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  };
  // Product names available in an HQ (its plan products + added + device list).
  const hqProductNames = (h) => {
    const s = new Set();
    (h.plans || []).forEach((pl, pi) => {
      pl.rows.filter((r) => !r.isTotal).forEach((r) => { if (r.product) s.add(r.product); });
      (hqAdds[h.sheet + "#" + pi] || []).forEach((a) => { if (a.product) s.add(a.product); });
    });
    deviceNames().forEach((n) => s.add(n));
    return Array.from(s);
  };
  // Salesperson name suggestions for the "sold by" field (roster + refs + custom).
  const salesPeopleList = () => {
    const s = new Set();
    (D.roster && D.roster.people || []).concat(rosterAdds).forEach((p) => { const n = rval(p, "name"); if (n && !/^vacant/i.test(n)) s.add(n); });
    ((D.refs && D.refs.employees) || []).forEach((n) => n && s.add(n));
    customPeople.forEach((n) => n && s.add(n));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  };
  const newDevices = []; // admin-added devices for the Device (price book) tab
  const idfor = (s) => s.replace(/[^a-z0-9]/gi, "_");

  // All devices available for pricing & target selection = price book + added.
  const deviceList = () => (D && D.costs ? D.costs.device : []).concat(newDevices);
  const deviceNames = () => deviceList().map((d) => d.device).filter(Boolean);
  const deviceByName = (n) => deviceList().find((d) => d.device === n);

  function hqAllowed(h) {
    const a = allowedHQs();
    if (a === "all") return true;
    const name = h.title.split("—")[0].trim();
    return a.includes(name) || a.includes(h.sheet);
  }

  function renderTargets() {
    const list = D.hqTargets.filter(hqAllowed);
    if (!list.some((h) => D.hqTargets.indexOf(h) === hqIndex)) hqIndex = D.hqTargets.indexOf(list[0]);
    if (!list.length) return `<div class="section-head"><h1>Regional HQ Targets</h1></div><div class="empty">No HQ access assigned. Ask your administrator.</div>`;
    const opts = D.hqTargets.map((h, i) => hqAllowed(h)
      ? `<option value="${i}" ${i === hqIndex ? "selected" : ""}>${esc(h.title.split("—")[0].trim())}</option>` : "").join("");

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

  // Read a non-negative number from an input (clamps negatives to 0).
  const nonNeg = (inp) => {
    if (inp.value === "") return "";
    let v = parseFloat(inp.value);
    if (isNaN(v)) return "";
    if (v < 0) { v = 0; inp.value = 0; }
    return v;
  };
  function wireHqDetail() {
    document.querySelectorAll("[data-hqyear]").forEach((b) => {
      b.onclick = () => { hqYear = +b.dataset.hqyear; mountHqDetail(D.hqTargets[hqIndex]); };
    });
    document.querySelectorAll(".tgt-input").forEach((inp) => {
      inp.oninput = () => {
        const val = nonNeg(inp);
        if (inp.dataset.add != null) {
          const arr = hqAdds[inp.dataset.pk] || [];
          const a = arr[+inp.dataset.add];
          if (a) a.fy2627 = val;
        } else {
          hqEdits[inp.dataset.pk + "#" + inp.dataset.ri] = val === "" ? null : val;
        }
        recomputeHqPlan(inp.dataset.pk);
        saveEdits("Updated annual target");
      };
    });
    // Per-product quarterly targets (Q1–Q4) for the selected year.
    document.querySelectorAll(".hq-qtr").forEach((inp) => {
      inp.oninput = () => {
        const q = inp.dataset.q, val = nonNeg(inp);
        const k = `${inp.dataset.pk}#${inp.dataset.row}#${hqYear}`;
        (hqQtr[k] || (hqQtr[k] = {}))[q] = val;
        recomputeHqQtr(inp.dataset.pk);
        saveEdits(`Updated ${q} ${hqYear} target`);
      };
    });
    // Add a product row from the Device list
    document.querySelectorAll(".hq-add-btn").forEach((b) => {
      b.onclick = () => {
        const pk = b.dataset.pk;
        const sel = document.querySelector('.hq-add-select[data-pk="' + pk + '"]');
        const val = document.querySelector('.hq-add-val[data-pk="' + pk + '"]');
        const name = sel && sel.value;
        if (!name) { if (sel) sel.focus(); return; }
        const dev = deviceByName(name);
        const deviceValue = dev && isNum(dev.standard) ? dev.standard : (dev && isNum(dev.minimum) ? dev.minimum : null);
        let qty = parseFloat(val && val.value); if (isNaN(qty) || qty < 0) qty = 0;
        (hqAdds[pk] = hqAdds[pk] || []).push({ product: name, fy2627: qty, deviceValue });
        saveEdits("Added target product " + name);
        mountHqDetail(D.hqTargets[hqIndex]);
      };
    });
    document.querySelectorAll(".hq-add-rm").forEach((b) => {
      b.onclick = () => {
        const arr = hqAdds[b.dataset.pk];
        if (arr) arr.splice(+b.dataset.ai, 1);
        saveEdits("Removed a target product");
        mountHqDetail(D.hqTargets[hqIndex]);
      };
    });
    // Sales-achieved records (who bought / where / who sold / how much).
    const h = D.hqTargets[hqIndex];
    const key = h && h.sheet;
    const storeFor = (s) => (s === "esth" ? hqEsthSales : hqSales);
    document.querySelectorAll(".sale-in").forEach((el) => {
      const commit = () => {
        const rec = (storeFor(el.dataset.store)[key] || []).find((x) => x.id === el.dataset.id);
        if (rec) {
          const numField = el.type === "number";
          rec[el.dataset.field] = numField ? (el.value === "" ? "" : parseFloat(el.value)) : el.value;
          saveEdits("Sale record · " + el.dataset.field + " → " + el.value);
          if (numField) mountHqDetail(h); // refresh rollup totals
        }
      };
      el.onchange = commit;
      if (el.tagName === "INPUT" && el.type === "text") el.onblur = commit;
    });
    document.querySelectorAll(".sale-rm").forEach((b) => {
      b.onclick = () => {
        if (!window.confirm("Remove this sale record?")) return;
        const map = storeFor(b.dataset.store);
        map[key] = (map[key] || []).filter((x) => x.id !== b.dataset.id);
        saveEdits("Removed a sale record"); mountHqDetail(h);
      };
    });
    const addDev = document.getElementById("hqSaleAdd");
    if (addDev) addDev.onclick = () => {
      (hqSales[key] = hqSales[key] || []).push({ id: "s" + (hqSaleSeq++), product: "", buyer: "", location: "", soldBy: "", amount: "" });
      saveEdits("Added a device sale record"); mountHqDetail(h);
    };
    const addEsth = document.getElementById("hqEsthAdd");
    if (addEsth) addEsth.onclick = () => {
      (hqEsthSales[key] = hqEsthSales[key] || []).push({ id: "s" + (hqSaleSeq++), product: "", qty: "", buyer: "", location: "", soldBy: "", amount: "" });
      saveEdits("Added an Esthemax sale record"); mountHqDetail(h);
    };
  }

  // Generic sales-record section. store = "dev" (devices) | "esth" (Esthemax).
  function hqSalesSection(h, store) {
    const isEsth = store === "esth";
    const key = h.sheet;
    const list = (isEsth ? hqEsthSales : hqSales)[key] || [];
    const admin = isAdmin();
    const prodOpts = isEsth ? esthemaxProductNames() : hqProductNames(h);
    const da = (rec, field) => `data-store="${store}" data-id="${rec.id}" data-field="${field}"`;
    const sel = (rec) => admin
      ? `<select class="sale-in" ${da(rec, "product")}><option value=""${rec.product ? "" : " selected"}>— product —</option>${prodOpts.concat(rec.product && !prodOpts.includes(rec.product) ? [rec.product] : []).map((n) => `<option${n === rec.product ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`
      : esc(rec.product || "—");
    const txt = (rec, field, ph, listId) => admin
      ? `<input class="sale-in" type="text" ${da(rec, field)}${listId ? ` list="${listId}"` : ""} value="${esc(rec[field] || "")}" placeholder="${ph}">`
      : esc(rec[field] || "—");
    const num = (rec, field, ph) => admin
      ? `<input class="sale-in" type="number" min="0" ${da(rec, field)} value="${esc(rec[field] ?? "")}" placeholder="${ph}" style="max-width:110px">`
      : (rec[field] == null || rec[field] === "" ? "—" : esc(rec[field]));

    const rows = list.map((rec) => `<tr>
      ${admin ? `<td class="num"><button class="ghost-btn danger sale-rm" data-store="${store}" data-id="${rec.id}" title="Delete this sale">🗑</button></td>` : ""}
      <td>${sel(rec)}</td>
      ${isEsth ? `<td class="num">${num(rec, "qty", "boxes")}</td>` : ""}
      <td>${txt(rec, "buyer", "Dr. / Clinic name")}</td>
      <td>${txt(rec, "location", "City / location", "hqStates")}</td>
      <td>${txt(rec, "soldBy", "Salesperson", "salesPeople")}</td>
      <td class="num">${num(rec, "amount", "₹ sold for")}</td>
    </tr>`).join("") || `<tr><td colspan="${(isEsth ? 6 : 5) + (admin ? 1 : 0)}" class="empty">No sales recorded yet.${admin ? " Click “Add sale”." : ""}</td></tr>`;

    const head = (admin ? [""] : []).concat("Product", isEsth ? ["Qty (boxes)"] : [], ["Bought by (Doctor / Clinic)", "Location", "Sold by", "Sold for (₹)"])
      .map((x) => `<th>${x}</th>`).join("");

    // Rollup: units/boxes sold + total value.
    const qtySum = isEsth ? list.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0) : list.length;
    const valSum = list.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const byProd = {};
    list.forEach((r) => { if (r.product) byProd[r.product] = (byProd[r.product] || 0) + (isEsth ? (parseFloat(r.qty) || 0) : 1); });
    const chips = Object.keys(byProd).sort().map((p) => `<span class="badge b-neutral">${esc(p)}: ${byProd[p]}</span>`).join(" ");
    const addId = isEsth ? "hqEsthAdd" : "hqSaleAdd";

    return `<div class="block" style="margin-top:24px">
      <h2>${isEsth ? "Esthemax sales achieved" : "Device sales achieved"}</h2>
      <div class="card" style="margin-bottom:14px"><div class="stat-row">
        <div class="stat k-good"><b>${inr(qtySum)}</b><span>${isEsth ? "Boxes sold" : "Machines sold"} (this HQ)</span></div>
        <div class="stat"><b>${valSum ? rupeeShort(valSum) : "—"}</b><span>Total value sold</span></div>
      </div>${chips ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">${chips}</div>` : ""}</div>
      ${table(head, rows)}
      ${admin ? `<div class="hq-add-row" style="margin-top:12px"><button id="${addId}" class="dl-btn" type="button">＋ Add ${isEsth ? "Esthemax " : ""}sale</button></div>` : ""}
    </div>`;
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

  // Split an annual target evenly across 4 quarters (remainder to earlier Qs).
  function splitQuarters(annual) {
    const n = parseFloat(annual);
    if (isNaN(n) || n <= 0) return { q1: "", q2: "", q3: "", q4: "" };
    const base = Math.floor(n / 4); let rem = Math.round(n - base * 4);
    const q = [base, base, base, base];
    for (let i = 0; i < rem && i < 4; i++) q[i] += 1;
    return { q1: q[0], q2: q[1], q3: q[2], q4: q[3] };
  }

  function recomputeHqQtr(pk) {
    const pid = idfor(pk);
    const t = { q1: 0, q2: 0, q3: 0, q4: 0 };
    document.querySelectorAll(`.hq-qtr[data-pk="${CSS.escape(pk)}"]`).forEach((inp) => {
      const n = parseFloat(inp.value); if (!isNaN(n)) t[inp.dataset.q] += n;
    });
    ["q1", "q2", "q3", "q4"].forEach((q) => { const el = document.getElementById(`totq_${pid}_${q}`); if (el) el.textContent = inr(t[q]); });
  }

  // Hide monetary (Value in Lakhs / Std Value) figures — units only on screen.
  const isMoney = (label) => /value|lakh|inr|₹/i.test(String(label));
  function hqDetail(h) {
    if (hqYear == null) hqYear = hqYears()[0];
    const yearBar = `<div class="controls" style="margin-bottom:14px"><div class="seg">${hqYears().map((y) => `<button data-hqyear="${y}" class="${hqYear === y ? "active" : ""}">${y}</button>`).join("")}</div></div>`;
    const summary = (h.summary || []).filter((s) => !isMoney(s.label)).map((s) => `
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
      const QK = ["q1", "q2", "q3", "q4"];
      const baseYear = hqYears()[0];
      const head = ["Product", "FY25-26", "FY26-27", `Q1 ${hqYear}`, `Q2 ${hqYear}`, `Q3 ${hqYear}`, `Q4 ${hqYear}`]
        .map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
      const productRows = pl.rows.filter((r) => !r.isTotal);
      const adds = hqAdds[pk] || [];
      // Effective quarter value for the selected year: explicit override wins;
      // else (base year only) the annual FY26-27 auto-split across quarters.
      const qEff = (rowKey, annual, q) => {
        const v = hqQtr[`${pk}#${rowKey}#${hqYear}`];
        if (v && v[q] != null) return v[q];
        return hqYear === baseYear ? splitQuarters(annual)[q] : "";
      };
      // units total over device rows (numeric deviceValue) incl. added products
      let tu = 0; const tq = { q1: 0, q2: 0, q3: 0, q4: 0 };
      const addQtr = (rowKey, annual) => QK.forEach((q) => { const n = parseFloat(qEff(rowKey, annual, q)); if (!isNaN(n)) tq[q] += n; });
      productRows.forEach((r, ri) => { const ann = effVal(pk, ri, r.fy2627); if (isNum(r.deviceValue) && isNum(ann)) tu += ann; addQtr(String(ri), ann); });
      adds.forEach((a, ai) => { const v = parseFloat(a.fy2627); if (!isNaN(v) && isNum(a.deviceValue)) tu += v; addQtr("a" + ai, a.fy2627); });

      const qtrCells = (rowKey, annual) => QK.map((q) => {
        const dv = qEff(rowKey, annual, q);
        return isAdmin()
          ? `<td class="num"><input class="hq-qtr" type="number" min="0" data-pk="${esc(pk)}" data-row="${rowKey}" data-q="${q}" value="${esc(dv == null || dv === "" ? "" : dv)}" style="max-width:58px"></td>`
          : `<td class="num">${dv == null || dv === "" ? "—" : esc(dv)}</td>`;
      }).join("");

      const prodHtml = productRows.map((r, ri) => {
        const editable = isNum(r.fy2627);
        const v = effVal(pk, ri, r.fy2627);
        const fyCell = editable
          ? `<input class="tgt-input" type="number" min="0" data-pk="${esc(pk)}" data-ri="${ri}" data-dv="${isNum(r.deviceValue) ? r.deviceValue : ""}" value="${v}" ${roAttr()} />`
          : (r.fy2627 ?? "—");
        return `<tr><td class="t-name">${esc(r.product)}</td><td class="num">${r.fy2526 ?? "—"}</td><td class="num">${fyCell}</td>${qtrCells(String(ri), v)}</tr>`;
      }).join("");

      const addHtml = adds.map((a, ai) => {
        const fyCell = isAdmin()
          ? `<input class="tgt-input" type="number" min="0" data-pk="${esc(pk)}" data-add="${ai}" data-dv="${isNum(a.deviceValue) ? a.deviceValue : ""}" value="${esc(a.fy2627)}" />`
          : esc(a.fy2627);
        const rm = isAdmin() ? ` <button class="linkish hq-add-rm" data-pk="${esc(pk)}" data-ai="${ai}" title="Remove">✕</button>` : "";
        return `<tr><td class="t-name">${esc(a.product)}${rm}</td><td class="num">—</td><td class="num">${fyCell}</td>${qtrCells("a" + ai, a.fy2627)}</tr>`;
      }).join("");

      const totalHtml = `<tr class="total-row"><td>TOTAL</td><td class="num"></td><td class="num" id="totu_${pid}">${inr(tu)}</td>${QK.map((q) => `<td class="num" id="totq_${pid}_${q}">${inr(tq[q])}</td>`).join("")}</tr>`;

      const addCtrl = isAdmin() ? `
        <div class="hq-add-row">
          <select class="hq-add-select select" data-pk="${esc(pk)}">
            <option value="">＋ Add product from Device list…</option>
            ${deviceNames().map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}
          </select>
          <input class="hq-add-val" type="number" min="0" placeholder="FY26-27 qty" data-pk="${esc(pk)}">
          <button class="ghost-btn hq-add-btn" data-pk="${esc(pk)}" type="button">Add</button>
        </div>` : "";

      return `${pl.label ? `<div class="subplan-title">${esc(pl.label)}</div>` : ""}${table(head, prodHtml + addHtml + totalHtml)}${addCtrl}`;
    }).join("");

    const quarters = (h.quarterly || []).filter((q) => !isMoney(q.basis)).map((q) => `
      <div class="card">
        <div class="q-label" style="margin-bottom:8px;font-weight:700;color:var(--text-2)">${esc(q.basis)} · Annual ${isNum(q.annual) ? inr(q.annual) : q.annual}</div>
        <div class="grid quarter-grid">
          ${["q1", "q2", "q3", "q4"].map((qq, i) => `
            <div class="quarter"><div class="q-label">Q${i + 1}</div><div class="q-val">${isNum(q[qq]) ? inr(q[qq]) : q[qq] ?? "—"}</div></div>`).join("")}
        </div>
      </div>`).join("");

    const datalist = `<datalist id="salesPeople">${salesPeopleList().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>` +
      `<datalist id="hqStates">${((D.refs && D.refs.states) || []).map((s) => `<option value="${esc(s)}">`).join("")}</datalist>`;
    return `
      <div class="callout">${esc(h.title)}${h.subtitle ? `<div class="muted-note" style="margin-top:6px">${esc(h.subtitle)}</div>` : ""}</div>
      ${summary ? `<div class="card" style="margin-bottom:22px"><div class="stat-row">${summary}</div></div>` : ""}
      ${datalist}
      <div class="muted-note" style="margin-bottom:6px">Quarterly targets — pick a year (next 5 years). Q1–Q4 columns below are for the selected year.</div>
      ${yearBar}
      ${plans || `<div class="empty">No product plan — placeholder HQ pending hire.</div>`}
      ${quarters ? `<div class="block"><h2>Quarterly split</h2><div class="grid" style="gap:14px">${quarters}</div></div>` : ""}
      ${hqSalesSection(h, "dev")}
      ${hqSalesSection(h, "esth")}`;
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
    const mgr = canSeeManagerInc();
    const cel = pTable(
      [{ label: "Celluma model" }, { label: "Selling", num: 1 }, { label: "SP Incentive", num: 1 }].concat(mgr ? [{ label: "Mgr Incentive", num: 1 }] : []),
      D.incentives.celluma.map((r) => `<tr><td>${esc(r.model)}</td><td class="num">${rupee(r.sellingPrice)}</td><td class="num">${rupee(r.salespersonIncentive)}</td>${mgr ? `<td class="num">${rupee(r.managerIncentive)}</td>` : ""}</tr>`).join(""));
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
        ${mgr ? `<h2>Incentive reference — Devices (Sales Manager · flat 50% of Std)</h2>${devTbl(dev.manager)}` : ""}
        <h2>Incentive reference — Celluma</h2>${cel}
        <h2>Incentive reference — Esthemax (Sales Person slab)</h2>${esthTiers(D.incentives.esthemax.salesperson)}
        ${mgr ? `<h2>Incentive reference — Esthemax (Sales Manager slab)</h2>${esthTiers(D.incentives.esthemax.manager)}` : ""}
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
  let incView = "device", incWho = "sales";
  const incMgr = () => incWho === "manager" && canSeeManagerInc();
  function renderIncentives() {
    if (incWho === "manager" && !canSeeManagerInc()) incWho = "sales";
    const refresh = () => { $("#incBody").innerHTML = incBody(); wireAccordion(); };
    setTimeout(() => {
      document.querySelectorAll("[data-inc]").forEach((b) => {
        b.onclick = () => {
          incView = b.dataset.inc;
          document.querySelectorAll("[data-inc]").forEach((x) => x.classList.toggle("active", x === b));
          document.getElementById("incWhoSeg").style.display = incView === "terms" ? "none" : "";
          refresh();
        };
      });
      document.querySelectorAll("[data-incwho]").forEach((b) => {
        b.onclick = () => {
          incWho = b.dataset.incwho;
          document.querySelectorAll("[data-incwho]").forEach((x) => x.classList.toggle("active", x === b));
          refresh();
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
        <div class="seg" id="incWhoSeg" style="${incView === "terms" ? "display:none" : ""}">
          <button data-incwho="sales" class="${incWho === "sales" ? "active" : ""}">Salesperson</button>
          ${canSeeManagerInc() ? `<button data-incwho="manager" class="${incWho === "manager" ? "active" : ""}">Manager</button>` : ""}
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
    const mgr = incMgr();
    return `
      <div class="callout">Standard = selling price (pricelist + ₹50K FY26-27 uplift). Sell above Standard → +10% of the excess (Sales Person only). Below Standard → 70% of Std. Manager earns a flat 50% of Std on reportee sales, full SP rates on direct sales.</div>
      ${mgr
        ? `<div class="block"><h2>Sales Manager plan <span class="pill-inline">flat 50% of Std</span></h2>${mk(D.incentives.device.manager, true)}</div>`
        : `<div class="block"><h2>Sales Person plan</h2>${mk(D.incentives.device.salesperson, false)}</div>`}`;
  }

  function cellumaIncentive() {
    const mgr = incMgr();
    const cols = ["Model", "Selling Price (excl. GST)", mgr ? "Sales Manager Incentive" : "Salesperson Incentive"];
    const head = cols.map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
    const body = D.incentives.celluma.map((r) => `<tr>
      <td class="t-name">${esc(r.model)}</td>
      <td class="num">${rupee(r.sellingPrice)}</td>
      <td class="num">${rupee(mgr ? r.managerIncentive : r.salespersonIncentive)}</td></tr>`).join("");
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
    const mgr = incMgr();
    return `
      <div class="callout">Hydrojelly 6-tier per-box slab. Threshold = monthly box achievement; incentive applied per box, retrospective to box 1. Payment terms: full incentive if paid within 45 days, 50% within 60 days, none after 60 days.</div>
      ${mgr
        ? `<div class="block"><h2>Sales Manager slab</h2>${mk(D.incentives.esthemax.manager)}</div>`
        : `<div class="block"><h2>Sales Person slab</h2>${mk(D.incentives.esthemax.salesperson)}</div>`}`;
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
  // Sales vs Admin pricing view (shared by the Device and Esthemax tabs).
  // Admin view exposes landing/cost + profit tools and is admin-only.
  let pricingMode = "sales";
  // Device and Esthemax now live under one "Pricing" tab; this picks which.
  let catalogView = "device";
  function renderPricing() {
    setTimeout(() => {
      document.querySelectorAll("[data-cat]").forEach((b) => {
        b.onclick = () => { catalogView = b.dataset.cat; go("prices"); };
      });
    }, 0);
    const seg = `<div class="controls" style="margin-bottom:6px">
      <div class="seg seg-primary">
        <button data-cat="device" class="${catalogView === "device" ? "active" : ""}">Device</button>
        <button data-cat="esthemax" class="${catalogView === "esthemax" ? "active" : ""}">Esthemax</button>
      </div>
    </div>`;
    // Delegate to the existing per-catalog renderers (each wires its own
    // controls via its own setTimeout, which still fires after go() paints).
    return seg + (catalogView === "esthemax" ? renderEsthemax() : renderPrices());
  }
  const priceAdmin = () => pricingMode === "admin" && canSeeLanding();
  const priceModeToggle = () => `
    <div class="seg">
      <button data-pmode="sales" class="${!priceAdmin() ? "active" : ""}">Sales Price</button>
      ${canSeeLanding() ? `<button data-pmode="admin" class="${priceAdmin() ? "active" : ""}">Admin Price</button>` : ""}
    </div>`;
  function renderPrices() {
    const refresh = () => { $("#priceBody").innerHTML = priceBody(); wirePriceAdd(); wireProfitCalc(); };
    setTimeout(() => {
      document.querySelectorAll("[data-price]").forEach((b) => {
        b.onclick = () => {
          priceView = b.dataset.price;
          document.querySelectorAll("[data-price]").forEach((x) => x.classList.toggle("active", x === b));
          refresh();
        };
      });
      document.querySelectorAll("[data-pmode]").forEach((b) => {
        b.onclick = () => {
          pricingMode = b.dataset.pmode;
          document.querySelectorAll("[data-pmode]").forEach((x) => x.classList.toggle("active", x === b));
          refresh();
        };
      });
      wirePriceAdd(); wireProfitCalc();
    }, 0);
    return `
      <div class="section-head">
        <h1>Device</h1>
        <p>${priceAdmin() ? "Admin view — landing cost plus quotation, standard and minimum prices, with a profit calculator." : "Sales view — quotation, standard and minimum selling prices."} All values excl. GST.</p>
      </div>
      <div class="controls">
        ${priceModeToggle()}
        <div class="seg">
          <button data-price="device" class="${priceView === "device" ? "active" : ""}">Devices</button>
          <button data-price="celluma" class="${priceView === "celluma" ? "active" : ""}">Celluma</button>
        </div>
      </div>
      <div id="priceBody">${priceBody()}</div>`;
  }

  function priceBody() {
    const adm = priceAdmin();
    if (priceView === "celluma") {
      // Celluma: sales sees Quotation + Selling; admin adds nothing extra here.
      const head = ["Model", "Quotation (₹)", "Selling Price (₹)"]
        .map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
      const body = D.costs.celluma.map((r) => `<tr>
        <td class="t-name">${esc(r.model)}</td>
        <td class="num">${rupee(r.quotation)}</td>
        <td class="num">${rupee(r.selling)}</td></tr>`).join("");
      return `<div class="callout teal">Quotation includes the +₹50K FY26-27 uplift. Selling = standard customer price. Excl. GST.</div>${table(head, body)}`;
    }
    // devices
    const cols = ["Device"].concat(adm ? ["Landing Cost (L)"] : []).concat(["Quotation (L)", "Standard (L)", "Minimum (L)"]);
    const head = cols.map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
    const body = deviceList().map((r) => `<tr>
      <td class="t-name">${esc(r.device)}</td>
      ${adm ? `<td class="num">${r.landingCost ?? "—"}</td>` : ""}
      <td class="num">${r.quotation ?? "—"}</td>
      <td class="num">${r.standard ?? "—"}</td>
      <td class="num">${r.minimum ?? "—"}</td></tr>`).join("");
    const addForm = (adm && isAdmin()) ? `
      <div class="card" style="margin-top:16px">
        <h2 style="margin-top:0">Add device</h2>
        <form id="addDeviceForm" class="admin-form">
          <div class="ch-grid">
            <label class="ord-field"><span>Device name</span><input id="adName" required placeholder="e.g. New Laser X"></label>
            <label class="ord-field"><span>Landing cost (L)</span><input id="adLanding" type="number" step="0.01"></label>
            <label class="ord-field"><span>Quotation (L)</span><input id="adQuote" type="number" step="0.01"></label>
            <label class="ord-field"><span>Standard (L)</span><input id="adStd" type="number" step="0.01"></label>
            <label class="ord-field"><span>Minimum (L)</span><input id="adMin" type="number" step="0.01"></label>
          </div>
          <button type="submit" class="dl-btn">Add device</button>
          <div id="adMsg" class="lock-error" style="min-height:16px"></div>
        </form>
      </div>` : "";
    const calc = adm ? profitCalcHtml() : "";
    return `<div class="callout">${adm ? "Landing = EXW + ~30% (customs + transport). " : ""}Values in ₹ Lakhs, excl. GST.</div>${table(head, body)}${calc}${addForm}`;
  }

  function profitCalcHtml() {
    const opts = deviceList().map((r, i) => `<option value="${i}">${esc(r.device)}</option>`).join("");
    return `
      <div class="card" style="margin-top:16px">
        <h2 style="margin-top:0">Profit calculator</h2>
        <div class="ch-grid">
          <label class="ord-field"><span>Device (optional)</span><select id="pcDevice" class="select"><option value="">— pick a device —</option>${opts}</select></label>
          <label class="ord-field"><span>Landing cost (L)</span><input id="pcLanding" type="number" step="0.01"></label>
          <label class="ord-field"><span>Selling price (L)</span><input id="pcSell" type="number" step="0.01"></label>
        </div>
        <div id="pcOut" class="stat-row" style="margin-top:12px"></div>
      </div>`;
  }

  function wireProfitCalc() {
    const dev = document.getElementById("pcDevice");
    if (!dev) return;
    const landing = document.getElementById("pcLanding"), sell = document.getElementById("pcSell"), out = document.getElementById("pcOut");
    const recompute = () => {
      const L = parseFloat(landing.value), S = parseFloat(sell.value);
      if (isNaN(L) || isNaN(S)) { out.innerHTML = `<div class="stat"><b>—</b><span>Enter landing &amp; selling price</span></div>`; return; }
      const profit = S - L, margin = S ? (profit / S * 100) : 0, markup = L ? (profit / L * 100) : 0;
      const cls = profit >= 0 ? "k-good" : "k-warn";
      out.innerHTML = `
        <div class="stat ${cls}"><b>₹${profit.toFixed(2)} L</b><span>Profit / unit</span></div>
        <div class="stat"><b>${margin.toFixed(1)}%</b><span>Margin on selling</span></div>
        <div class="stat"><b>${L ? markup.toFixed(1) + "%" : "—"}</b><span>Markup on landing</span></div>`;
    };
    dev.onchange = () => { const r = deviceList()[+dev.value]; if (r) { landing.value = r.landingCost ?? ""; if (!sell.value) sell.value = r.quotation ?? ""; } recompute(); };
    landing.oninput = recompute; sell.oninput = recompute;
    recompute();
  }

  function wirePriceAdd() {
    const f = document.getElementById("addDeviceForm");
    if (!f) return;
    f.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById("adName").value.trim();
      const msg = document.getElementById("adMsg");
      if (!name) { msg.style.color = "var(--bad)"; msg.textContent = "Device name is required."; return; }
      const numOr = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
      newDevices.push({ device: name, landingCost: numOr("adLanding"), quotation: numOr("adQuote"), standard: numOr("adStd"), minimum: numOr("adMin") });
      saveEdits();
      $("#priceBody").innerHTML = priceBody();
      wirePriceAdd(); wireProfitCalc();
    };
  }

  /* ================= ESTHEMAX MARKET ================= */
  let mkt = "salon", mktGroup = "HYDROJELLYMASK";
  const MKT_GROUPS = [
    { id: "HYDROJELLYMASK", label: "Hydrojelly" },
    { id: "RETAIL HYDROJELLYMASK", label: "Retail" },
    { id: "Foot Mask", label: "Foot Mask" },
  ];
  function renderEsthemax() {
    const refresh = () => { $("#mktBody").innerHTML = mktBody(); };
    setTimeout(() => {
      document.querySelectorAll("[data-mkt]").forEach((b) => {
        b.onclick = () => { mkt = b.dataset.mkt; document.querySelectorAll("[data-mkt]").forEach((x) => x.classList.toggle("active", x === b)); refresh(); };
      });
      document.querySelectorAll("[data-grp]").forEach((b) => {
        b.onclick = () => { mktGroup = b.dataset.grp; document.querySelectorAll("[data-grp]").forEach((x) => x.classList.toggle("active", x === b)); refresh(); };
      });
      document.querySelectorAll("[data-pmode]").forEach((b) => {
        b.onclick = () => { pricingMode = b.dataset.pmode; document.querySelectorAll("[data-pmode]").forEach((x) => x.classList.toggle("active", x === b)); refresh(); };
      });
    }, 0);
    return `
      <div class="section-head">
        <h1>Esthemax Pricing</h1>
        <p>${priceAdmin() ? "Admin view — full MRP, doctor price and every bulk-offer tier with effective net prices, plus the cost breakdown." : "Sales view — MRP and offer (doctor) price per product."} New Structure (+15% MRP hike). Excl. GST unless stated.</p>
      </div>
      <div class="controls">
        ${priceModeToggle()}
        <div class="seg">
          <button data-mkt="salon" class="${mkt === "salon" ? "active" : ""}">Salon Market</button>
          <button data-mkt="doctor" class="${mkt === "doctor" ? "active" : ""}">Doctor Market</button>
        </div>
        <div class="seg">
          ${MKT_GROUPS.map((g) => `<button data-grp="${g.id}" class="${mktGroup === g.id ? "active" : ""}">${g.label}</button>`).join("")}
        </div>
      </div>
      <div id="mktBody">${mktBody()}</div>`;
  }

  function mktBody() {
    const m = D.esthemaxPrices[mkt];
    const cols = m.columns;
    const rows = (m.groups[mktGroup] || []);
    if (!rows.length) return `<div class="empty">No rows in this group.</div>`;
    const adm = priceAdmin();

    // New Structure block start (the "@15% hike" columns). The old structure
    // is always dropped. Pack Size (index 2) is product info, kept.
    const band = m.band || [];
    let newStart = band.findIndex((b, i) => i > 2 && String(b).toLowerCase().includes("new"));
    if (newStart < 0) newStart = Math.floor(cols.length / 2);

    let colIdx = [];
    if (String(cols[2] || "").trim() !== "") colIdx.push(2); // Pack Size
    if (adm) {
      // Admin: every New Structure column.
      cols.forEach((c, i) => { if (i >= newStart && String(c).trim() !== "") colIdx.push(i); });
    } else {
      // Sales: just MRP + Offer (Doctor Price @10%) from the New Structure.
      const mrpI = cols.findIndex((c, i) => i >= newStart && /^mrp$/i.test(String(c).trim()));
      const offI = cols.findIndex((c, i) => i >= newStart && /doctor price/i.test(String(c)));
      [mrpI, offI].forEach((i) => { if (i >= 0) colIdx.push(i); });
    }

    const labelFor = (i) => {
      let label = String(cols[i]).replace(/\n/g, " ").trim();
      if (!adm && /doctor price/i.test(label)) {
        const pct = label.match(/@\s*\d+%/);
        label = "Offer Price" + (pct ? " (Doctor " + pct[0].replace(/\s/g, "") + ")" : " (Doctor)");
      }
      return label;
    };
    const headCells = ["<th>Sr</th>", "<th>Name</th>"].concat(
      colIdx.map((i) => `<th class="${i === 2 ? "" : "num"}" title="${esc(labelFor(i))}">${esc(labelFor(i))}</th>`)
    ).join("");

    const body = rows.map((r) => {
      const cells = colIdx.map((i) => {
        const v = r.values[i];
        if (i === 2) return `<td class="t-muted">${v == null ? "—" : esc(v)}</td>`;
        return `<td class="num">${isNum(v) ? inr(v) : (v == null ? "—" : esc(v))}</td>`;
      }).join("");
      return `<tr><td class="num t-muted">${r.srNo}</td><td class="t-name">${esc(r.name)}</td>${cells}</tr>`;
    }).join("");

    const grpLabel = (MKT_GROUPS.find((g) => g.id === mktGroup) || {}).label || mktGroup;
    return `
      <div class="callout teal">${esc(mkt === "salon" ? "Salon Market" : "Doctor Market")} · ${esc(grpLabel)} — New Structure (+15% MRP hike). ${adm ? "Offer columns show bill/MRP value and effective net price (incl. GST) per box." : "Offer price is the doctor price at 10% discount."}</div>
      ${table(headCells, body)}
      ${adm ? `<div class="muted-note">Scroll horizontally to see all offer tiers. Effective net prices are per box, inclusive of GST.</div>${esthemaxCostSection()}` : ""}`;
  }

  // Admin-only cost breakdown (landing / standard / min-EXW) for Esthemax skincare.
  function esthemaxCostSection() {
    const e = D.costs && D.costs.esthemax;
    if (!e) return "";
    const sec = (title, list) => {
      if (!list || !list.length) return "";
      const head = ["Variant", "Pack", "Landing Cost", "Standard (Total)", "MRP", "New MRP", "Min (EXW)"]
        .map((x, i) => `<th class="${i >= 2 ? "num" : ""}">${x}</th>`).join("");
      const body = list.map((r) => `<tr>
        <td class="t-name">${esc(r.variant)}</td>
        <td class="t-muted">${esc(r.pack)}</td>
        <td class="num">${rupee(r.landingCost)}</td>
        <td class="num">${rupee(r.standardTotal)}</td>
        <td class="num">${rupee(r.mrp)}</td>
        <td class="num">${rupee(r.newMrp)}</td>
        <td class="num">${rupee(r.minEXW)}</td></tr>`).join("");
      return `<div class="block"><h2>${esc(title)}</h2>${table(head, body)}</div>`;
    };
    return `<div class="block" style="margin-top:22px"><h2>Cost breakdown (admin)</h2>
      <div class="callout">Landing = EXW + 44% customs + transport. Standard (Total) = landing + marketing + profit. Min (EXW) = Primelaze ex-works. Per box, excl. GST.</div></div>
      ${sec("Hydrojelly Mask (850 ml)", e.hydrojelly)}
      ${sec("Retail Hydrojelly (2 masks / box)", e.retail)}
      ${sec("Collagen Foot Mask", e.footMask)}
      ${esthemaxReorderMoneySection()}`;
  }

  // Reorder cost / money-required for Esthemax (moved here from Inventory).
  function esthemaxReorderMoneySection() {
    if (!D.esthemaxOrder) return "";
    orderInit();
    const rows = orderCompute();
    const total = rows.reduce((s, r) => s + r.money, 0);
    const head = ["Item", "Current", "Required", "To buy", "Landing/Unit", "Money required"]
      .map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
    const body = rows.slice().sort((a, b) => b.money - a.money).map((r) => `<tr>
      <td class="t-name">${esc(r.it.name)}</td>
      <td class="num">${inr(r.current)}</td>
      <td class="num">${inr(r.it.requiredStock)}</td>
      <td class="num ${r.toBuy > 0 ? "buy-pos" : ""}">${inr(Math.round(r.toBuy))}</td>
      <td class="num">${rupee(r.landing, { decimals: 0 })}</td>
      <td class="num t-name">${r.money > 0 ? rupee(r.money, { decimals: 0 }) : "—"}</td></tr>`).join("");
    return `<div class="block" style="margin-top:22px"><h2>Reorder — money required (admin)</h2>
      <div class="callout">Landing = EXW × USD→INR × (1 + customs) + transport. Money required = To-buy × landing. Excl. GST. Uses the current stock, FX and customs set on the Inventory tab.</div>
      ${table(head, body)}
      <div class="stat-row" style="margin-top:12px"><div class="stat k-warn"><b>${total ? rupeeShort(total) : "—"}</b><span>Total money required</span></div></div>
    </div>`;
  }

  /* ================= DEMO MACHINES ================= */
  const demoEdits = { current: {}, status: {}, movement: {}, packing: {} };
  const demoAdds = { current: [], status: [], movement: [], packing: [] }; // [{id, vals:[]}]
  let demoAddSeq = 0;
  const DEMO_VIEWS = [
    { id: "current", label: "Current status" },
    { id: "status", label: "Machine details" },
    { id: "packing", label: "Packing condition" },
  ];
  const FREE_TEXT_COLS = /remark|missing item|accessor|damage report|dimension|purpose$|^device$|^machine$|serial|flight case id/i;
  const PERSON_COLS = /salesperson|confirmed by|manager|received by|approved by|checked by|owner|current taker/i;
  const customPeople = []; // admin-added people for person dropdowns
  // Display-only column renames (keeps the underlying data key for logic).
  const demoColLabel = (c) => (/^manager$/i.test(c) ? "Current Taker" : c);
  let demoView = "current";
  let demoFilter = "all"; // status filter for the Current-status table

  const demoAddById = (rid) => (demoAdds[demoView] || []).find((x) => x.id === rid);

  const STATUS_COLS = ["Status"];
  const CONDITION_COLS = ["Condition", "Cond. Out", "Cond. Return"];
  const DATE_COLS = /^booked (from|to)$/i; // rendered as date pickers
  const BOOK_COLS = ["Booked From", "Booked To"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // "2026-08-10" → "10 Aug 2026" (parsed by parts to avoid UTC off-by-one).
  function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    if (!m) return String(iso || "");
    return `${+m[3]} ${MONTHS[+m[2] - 1] || m[2]} ${m[1]}`;
  }

  // Ensure the Current-status view carries the two booking-date columns.
  // Appended in-memory only (data.enc.js is untouched); the values live in the
  // demo edits store and persist like any other cell. Safe to call repeatedly.
  function ensureDemoBookingCols() {
    const cur = D.demoMachines && D.demoMachines.current;
    if (!cur || !Array.isArray(cur.columns)) return;
    if (!cur.columns.some((c) => /^booked from$/i.test(c))) cur.columns.push("Booked From");
    if (!cur.columns.some((c) => /^booked to$/i.test(c))) cur.columns.push("Booked To");
  }

  // Colour bucket for a status/condition value:
  //  green  → free / available / working / good
  //  blue   → booked / reserved / on hold / assigned
  //  amber  → in transit / dispatched / cleaning / pending
  //  red    → in service / repair / breakdown / damaged / not working
  function demoStatusClass(col, val) {
    if (!STATUS_COLS.includes(col) && !CONDITION_COLS.includes(col) && col !== "Demo Status") return "";
    const t = String(val || "").toLowerCase();
    if (/(not working|repair|out of service|breakdown|damage|missing|in service|servicing|faulty|dead)/.test(t)) return "demo-bad";
    if (/(booked|reserved|on hold|assigned|allotted|blocked|with doctor|at clinic|deployed)/.test(t)) return "demo-info";
    if (/(transit|dispatch|shipping|shipped|cleaning|foam|maintenance|pending|checking|inspection)/.test(t)) return "demo-warn";
    if (/(free|available|working|okay|ok|good|excellent|returned|ready|completed|idle|in stock)/.test(t)) return "demo-good";
    return "";
  }

  // Index of the Status column in the current demo view (-1 if none).
  const demoStatusColIdx = () =>
    (D.demoMachines[demoView].columns || []).findIndex((c) => STATUS_COLS.includes(c) || c === "Demo Status");

  function distinctDemoValues(colIdx) {
    const set = new Set();
    D.demoMachines[demoView].rows.forEach((row, r) => {
      const ov = demoEdits[demoView][r + "#" + colIdx];
      const v = ov != null ? ov : row[colIdx];
      if (v != null && String(v).trim() !== "") set.add(String(v).trim());
    });
    return Array.from(set).sort();
  }

  const demoVal = (rid, c) => {
    const added = demoAddById(rid);
    if (added) return added.vals[c] == null ? "" : String(added.vals[c]);
    const ov = demoEdits[demoView][rid + "#" + c];
    const raw = D.demoMachines[demoView].rows[+rid][c];
    return ov != null ? ov : (raw == null ? "" : String(raw));
  };
  function demoSetVal(rid, c, value) {
    const added = demoAddById(rid);
    if (added) added.vals[c] = value;
    else demoEdits[demoView][rid + "#" + c] = value;
  }

  // Option list for an editable demo cell, pulled from the right master list:
  //  Status → Drop Down sheet Status; Condition → Drop Down Condition;
  //  Location/From/To → DATA Sheet states; Salesperson/Assigned/etc → employees;
  //  Machine/Device → devices; Serial → that device's serial(s). The current
  //  value is always kept selectable.
  function demoOptions(colName, colIdx, current, rowIdx) {
    const dd = D.dropdowns || {}, rf = D.refs || {};
    const cols = D.demoMachines[demoView].columns;
    const uniq = (a, b) => Array.from(new Set(a.concat(b)));
    let base;
    if (colName === "Status") base = uniq(dd.status || [], distinctDemoValues(colIdx));
    else if (/condition/i.test(colName)) base = uniq(dd.condition || [], distinctDemoValues(colIdx));
    else if (/location|^from$|^to$/i.test(colName)) base = uniq(rf.states || [], distinctDemoValues(colIdx));
    else if (PERSON_COLS.test(colName)) base = uniq(rf.employees || [], customPeople);
    else if (/^machine$|^device$/i.test(colName)) base = uniq(rf.devices || [], deviceNames());
    else if (/serial|flight case id/i.test(colName)) {
      const mIdx = cols.findIndex((c) => /^machine$|^device$/i.test(c));
      const mv = mIdx >= 0 ? demoVal(rowIdx, mIdx) : "";
      const linked = mv ? (rf.deviceSerials || []).filter((x) => x.device === mv).map((x) => x.serial).filter(Boolean) : [];
      base = (linked.length ? linked : (rf.serials || [])).slice();
    } else base = distinctDemoValues(colIdx);
    if (current && !base.includes(current)) base = [current].concat(base);
    return base;
  }

  function demoCell(rid, c, colName, ed) {
    const val = demoVal(rid, c);
    const sc = demoStatusClass(colName, val);
    const cls = [c === 0 ? "t-name" : "", sc].filter(Boolean).join(" ");
    if (!ed) {
      if (DATE_COLS.test(colName)) return `<td class="${cls}">${val ? esc(fmtDate(val)) : "—"}</td>`;
      const chip = sc ? `<span class="demo-chip ${sc}">${esc(val) || "—"}</span>` : esc(val);
      return `<td class="${cls}">${chip}</td>`;
    }
    if (DATE_COLS.test(colName)) {
      return `<td class="${cls}"><input class="demo-date" type="date" data-r="${rid}" data-c="${c}" value="${esc(val)}"></td>`;
    }
    if (FREE_TEXT_COLS.test(colName)) {
      return `<td class="${cls}"><input class="demo-text" type="text" data-r="${rid}" data-c="${c}" value="${esc(val)}"></td>`;
    }
    const opts = demoOptions(colName, c, val, rid);
    const optionHtml = `<option value=""${val ? "" : " selected"}>—</option>` +
      opts.map((o) => `<option${o === val ? " selected" : ""}>${esc(o)}</option>`).join("") +
      (PERSON_COLS.test(colName) ? `<option value="__add__">＋ Add new…</option>` : "");
    const rm = (c === 0 && String(rid).startsWith("a")) ? `<button class="linkish demo-rm" data-id="${rid}" title="Remove">✕</button> ` : "";
    return `<td class="${cls}"><select class="demo-select ${sc}" data-r="${rid}" data-c="${c}">${optionHtml}</select>${rm}</td>`;
  }

  function demoTable() {
    const t = D.demoMachines[demoView];
    const ed = isAdmin();
    const head = t.columns.map((c) => `<th>${esc(demoColLabel(c))}</th>`).join("");
    const scIdx = demoStatusColIdx();
    let ids = t.rows.map((_, i) => String(i)).concat((demoAdds[demoView] || []).map((x) => x.id));
    if (demoFilter !== "all" && scIdx >= 0) {
      ids = ids.filter((rid) => demoVal(rid, scIdx) === demoFilter);
    }
    const body = ids.length
      ? ids.map((rid) =>
          `<tr>${t.columns.map((colName, c) => demoCell(rid, c, colName, ed)).join("")}</tr>`).join("")
      : `<tr><td colspan="${t.columns.length}" class="muted" style="text-align:center;padding:18px">No machines with status “${esc(demoFilter)}”.</td></tr>`;
    return table(head, body);
  }

  // Filter bar (status chips) — only meaningful when a Status column exists.
  function demoFilterBar() {
    const scIdx = demoStatusColIdx();
    if (scIdx < 0) return "";
    const counts = {};
    let total = 0;
    const t = D.demoMachines[demoView];
    const ids = t.rows.map((_, i) => String(i)).concat((demoAdds[demoView] || []).map((x) => x.id));
    ids.forEach((rid) => { const v = demoVal(rid, scIdx); if (v) { counts[v] = (counts[v] || 0) + 1; total++; } });
    const vals = Object.keys(counts).sort();
    if (!vals.length) return "";
    const btn = (id, label, n, extraCls) =>
      `<button data-dfilter="${esc(id)}" class="demo-fbtn ${extraCls || ""} ${demoFilter === id ? "active" : ""}">${esc(label)}<span class="demo-fn">${n}</span></button>`;
    return `<div class="demo-filter">
      ${btn("all", "All", total, "")}
      ${vals.map((v) => btn(v, v, counts[v] || 0, demoStatusClass("Status", v))).join("")}
    </div>`;
  }

  function demoRepaint() {
    const fb = document.getElementById("demoFilterBar");
    if (fb) fb.innerHTML = demoFilterBar();
    $("#demoBody").innerHTML = demoTable();
    wireDemoFilter();
    wireDemoEdit();
  }

  function wireDemoFilter() {
    document.querySelectorAll("[data-dfilter]").forEach((b) => {
      b.onclick = () => { demoFilter = b.dataset.dfilter; demoRepaint(); };
    });
  }

  function wireDemoEdit() {
    if (!isAdmin()) return;
    const cols = D.demoMachines[demoView].columns;
    document.querySelectorAll("#demoBody select.demo-select").forEach((sel) => {
      sel.onchange = () => {
        const rid = sel.dataset.r, c = +sel.dataset.c;
        if (sel.value === "__add__") {
          const name = (window.prompt("Add new person:") || "").trim();
          if (!name) { demoRepaint(); return; }
          if (!customPeople.includes(name)) customPeople.push(name);
          demoSetVal(rid, c, name);
          saveEdits(demoWhat(rid, c, name)); demoRepaint(); return;
        }
        demoSetVal(rid, c, sel.value);
        // Linked logic: choosing a Machine/Device fills its Serial No.
        if (/^machine$|^device$/i.test(cols[c])) {
          const sIdx = cols.findIndex((x) => /serial/i.test(x));
          const ds = (D.refs.deviceSerials || []).filter((x) => x.device === sel.value).map((x) => x.serial).filter(Boolean);
          if (sIdx >= 0 && ds.length) demoSetVal(rid, sIdx, ds[0]);
        }
        saveEdits(demoWhat(rid, c, sel.value)); demoRepaint();
      };
    });
    document.querySelectorAll("#demoBody input.demo-text").forEach((inp) => {
      inp.onchange = () => { const c = +inp.dataset.c; demoSetVal(inp.dataset.r, c, inp.value); saveEdits(demoWhat(inp.dataset.r, c, inp.value)); };
    });
    // Booking date range (from / to). Repaint on change so the read-only
    // rendering (and any validation) stays consistent.
    document.querySelectorAll("#demoBody input.demo-date").forEach((inp) => {
      inp.onchange = () => {
        const rid = inp.dataset.r, c = +inp.dataset.c;
        demoSetVal(rid, c, inp.value);
        // Keep the range sane: if "to" ends before "from" starts, snap it up.
        const fromIdx = cols.findIndex((x) => /^booked from$/i.test(x));
        const toIdx = cols.findIndex((x) => /^booked to$/i.test(x));
        if (fromIdx >= 0 && toIdx >= 0) {
          const f = demoVal(rid, fromIdx), t = demoVal(rid, toIdx);
          if (f && t && t < f) demoSetVal(rid, toIdx, f);
        }
        saveEdits(demoWhat(rid, c, inp.value)); demoRepaint();
      };
    });
    document.querySelectorAll("#demoBody .demo-rm").forEach((b) => {
      b.onclick = () => {
        const label = demoRowLabel(b.dataset.id);
        demoAdds[demoView] = demoAdds[demoView].filter((x) => x.id !== b.dataset.id);
        saveEdits("Removed machine" + (label ? " " + label : "")); demoRepaint();
      };
    });
  }

  // Human label of a demo row (its Device / first cell) for the activity log.
  function demoRowLabel(rid) {
    const v = demoVal(rid, 0);
    return v ? String(v) : "";
  }
  // "Bi Axis 1 · Status → Booked" describing an edited demo cell.
  function demoWhat(rid, c, value) {
    const cols = D.demoMachines[demoView].columns;
    const col = demoColLabel(cols[c] || "");
    const label = demoRowLabel(rid);
    return `${label ? label + " · " : ""}${col} → ${value || "—"}`;
  }

  function demoAddRow() {
    const ncol = D.demoMachines[demoView].columns.length;
    (demoAdds[demoView] = demoAdds[demoView] || []).push({ id: "a" + (demoAddSeq++), vals: new Array(ncol).fill("") });
    demoFilter = "all"; // don't let an active status filter hide the new blank row
    saveEdits("Added a machine"); demoRepaint();
  }

  function renderDemo() {
    ensureDemoBookingCols();
    setTimeout(() => {
      document.querySelectorAll("[data-dview]").forEach((b) => {
        b.onclick = () => {
          demoView = b.dataset.dview;
          demoFilter = "all";
          document.querySelectorAll("[data-dview]").forEach((x) => x.classList.toggle("active", x === b));
          demoRepaint();
        };
      });
      const add = document.getElementById("demoAddBtn");
      if (add) add.onclick = demoAddRow;
      wireDemoFilter();
      wireDemoEdit();
    }, 0);
    return `
      <div class="section-head">
        <h1>Demo Machines</h1>
        <p>Live status and movement of demo devices. ${isAdmin() ? "Edit cells via dropdowns; Remarks are free text. Changes save for everyone." : "Read-only — an administrator maintains this."}</p>
      </div>
      <div class="controls">
        <div class="seg">
          ${DEMO_VIEWS.map((v) => `<button data-dview="${v.id}" class="${demoView === v.id ? "active" : ""}">${esc(v.label)}</button>`).join("")}
        </div>
        ${isAdmin() ? `<div class="hq-actions"><button id="demoAddBtn" class="dl-btn" type="button">＋ Add machine</button></div>` : ""}
      </div>
      <div id="demoFilterBar">${demoFilterBar()}</div>
      <div id="demoBody">${demoTable()}</div>`;
  }

  /* ================= PAYMENT COMMITMENTS ================= */
  // Outstanding customer payment commitments across Consumables / Machine /
  // Esthemax. Finance uploads an Excel/CSV that APPENDS to the existing data
  // (old data is always kept). Status is derived live against today's date.
  const paymentAdds = [];            // finance-uploaded appended rows
  let paySeq = 0;
  let payFilter = { cat: "", hq: "", sp: "", status: "", q: "" };
  const PAY_STATUS = {
    green: { label: "Received", cls: "pay-green" },
    yellow: { label: "Partial", cls: "pay-yellow" },
    red: { label: "Overdue", cls: "pay-red" },
    blue: { label: "Upcoming", cls: "pay-blue" },
    grey: { label: "No date", cls: "pay-grey" },
  };
  const PAY_ORDER = ["red", "yellow", "blue", "grey", "green"];
  const canEditPayments = () => isAdmin(); // full/page admins can upload

  const payToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const payNum = (v) => {
    if (typeof v === "number") return isNaN(v) ? 0 : v;
    const n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  function payEnrich(r) {
    const committed = payNum(r.committedAmount);
    const received = payNum(r.received);
    const pending = Math.max(committed - received, 0);
    let status = "grey", daysOverdue = 0;
    if (committed > 0 && received >= committed) status = "green";
    else if (received > 0 && received < committed) status = "yellow";
    else if (!r.committedDate) status = "grey";
    else {
      const cd = new Date(r.committedDate);
      const diff = Math.round((payToday() - cd) / 86400000);
      if (diff > 0) { status = "red"; daysOverdue = diff; } else status = "blue";
    }
    return Object.assign({}, r, { committed, received, pending, status, daysOverdue });
  }
  const payAll = () => (D.payments || []).concat(paymentAdds).map(payEnrich);
  const payUniq = (arr, key) => Array.from(new Set(arr.map((x) => x[key]).filter(Boolean))).sort();

  function payFiltered(rows) {
    return rows.filter((d) => {
      if (payFilter.cat && d.category !== payFilter.cat) return false;
      if (payFilter.hq && d.hq !== payFilter.hq) return false;
      if (payFilter.sp && d.salesPerson !== payFilter.sp) return false;
      if (payFilter.status && d.status !== payFilter.status) return false;
      if (payFilter.q) {
        const hay = `${d.customer} ${d.hq} ${d.salesPerson} ${d.category} ${d.remark}`.toLowerCase();
        if (!hay.includes(payFilter.q)) return false;
      }
      return true;
    });
  }

  function payKpis(rows) {
    const sum = (f) => rows.reduce((a, r) => a + payNum(r[f]), 0);
    const committed = sum("committed"), received = sum("received"), pending = sum("pending");
    const overdue = rows.filter((r) => r.status === "red");
    const overdueAmt = overdue.reduce((a, r) => a + r.pending, 0);
    const cards = [
      { cls: "", label: "Committed", value: rupeeShort(committed), note: rows.length + " commitments" },
      { cls: "k-good", label: "Received", value: rupeeShort(received), note: committed ? Math.round(received / committed * 100) + "% of committed" : "—" },
      { cls: "k-warn", label: "Pending", value: rupeeShort(pending), note: "yet to collect" },
      { cls: "k-bad", label: "Overdue", value: rupeeShort(overdueAmt), note: overdue.length + " past due" },
    ];
    return `<div class="grid kpi-grid">${cards.map((k) => `
      <div class="kpi ${k.cls}"><div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${esc(k.label)}</div><div class="kpi-note">${esc(k.note)}</div></div>`).join("")}</div>`;
  }

  // Status chips (also act as filters) with count + pending amount each.
  function payStatusChips(rows) {
    const by = {};
    PAY_ORDER.forEach((s) => (by[s] = { n: 0, amt: 0 }));
    rows.forEach((r) => { by[r.status].n++; by[r.status].amt += r.pending; });
    const chip = (s) => {
      const m = PAY_STATUS[s], b = by[s];
      const active = payFilter.status === s;
      return `<button data-paystatus="${s}" class="pay-chip ${m.cls} ${active ? "active" : ""}">
        <span class="pay-chip-dot"></span>${esc(m.label)}
        <span class="pay-chip-n">${b.n}</span>
        <span class="pay-chip-amt">${b.amt ? rupeeShort(b.amt) : "—"}</span></button>`;
    };
    return `<div class="pay-chips">
      <button data-paystatus="" class="pay-chip ${payFilter.status ? "" : "active"}">All<span class="pay-chip-n">${rows.length}</span></button>
      ${PAY_ORDER.map(chip).join("")}</div>`;
  }

  // Compact "pending by group" breakdown (category / HQ).
  function payBreakdown(rows, key, title) {
    const g = {};
    rows.forEach((r) => {
      const k = r[key] || "—";
      (g[k] || (g[k] = { n: 0, committed: 0, received: 0, pending: 0 }));
      g[k].n++; g[k].committed += r.committed; g[k].received += r.received; g[k].pending += r.pending;
    });
    const entries = Object.entries(g).sort((a, b) => b[1].pending - a[1].pending);
    const max = Math.max(1, ...entries.map((e) => e[1].pending));
    const head = `<th>${esc(title)}</th><th class="num">Records</th><th class="num">Committed</th><th class="num">Received</th><th class="num">Pending</th><th>Pending share</th>`;
    const body = entries.map(([k, v]) => `<tr>
      <td class="t-name">${esc(k)}</td>
      <td class="num">${v.n}</td>
      <td class="num">${rupeeShort(v.committed)}</td>
      <td class="num">${rupeeShort(v.received)}</td>
      <td class="num">${rupeeShort(v.pending)}</td>
      <td><span class="bar-track" style="min-width:90px"><span class="bar-fill" style="width:${Math.round(v.pending / max * 100)}%"></span></span></td></tr>`).join("");
    return table(head, body);
  }

  function payTableRows(rows) {
    const sorted = rows.slice().sort((a, b) => {
      const ra = PAY_ORDER.indexOf(a.status), rb = PAY_ORDER.indexOf(b.status);
      if (ra !== rb) return ra - rb;
      return b.daysOverdue - a.daysOverdue || b.pending - a.pending;
    });
    if (!sorted.length) return `<tr><td colspan="10" class="empty" style="text-align:center;padding:18px">No commitments match the current filters.</td></tr>`;
    return sorted.map((r) => {
      const m = PAY_STATUS[r.status];
      return `<tr>
        <td class="t-name">${esc(r.customer || "—")}</td>
        <td>${esc(r.category || "—")}</td>
        <td>${esc(r.hq || "—")}</td>
        <td>${esc(r.salesPerson || "—")}</td>
        <td>${r.committedDate ? esc(fmtDate(r.committedDate)) : "<span class='t-muted'>no date</span>"}</td>
        <td class="num">${rupee(r.committed)}</td>
        <td class="num">${rupee(r.received)}</td>
        <td class="num">${r.pending ? rupee(r.pending) : "—"}</td>
        <td><span class="pay-badge ${m.cls}">${m.label}${r.status === "red" ? " · " + r.daysOverdue + "d" : ""}</span></td>
        <td class="t-muted">${esc(r.remark || "")}</td></tr>`;
    }).join("");
  }

  function payRepaint() {
    const rows = payFiltered(payAll());
    const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    setHtml("payKpis", payKpis(rows));
    setHtml("payChips", payStatusChips(rows));
    setHtml("payBreakCat", payBreakdown(rows, "category", "Category"));
    setHtml("payBreakHq", payBreakdown(rows, "hq", "HQ"));
    setHtml("payBody", payTableRows(rows));
    const dc = document.getElementById("payDrillCount"); if (dc) dc.textContent = rows.length + " records";
    wirePayChips();
  }
  function wirePayChips() {
    document.querySelectorAll("[data-paystatus]").forEach((b) => {
      b.onclick = () => { payFilter.status = b.dataset.paystatus; payRepaint(); };
    });
  }

  // ---- Excel / CSV import (append) + template ----
  const PAY_HEADERS = ["Category", "HQ", "Sales Person", "Customer", "Committed Date", "Outstanding", "Committed Amount", "Received", "Remark", "Line Items"];
  function payNormDate(v) {
    if (!v) return "";
    if (v instanceof Date && !isNaN(v)) {
      const p = (n) => String(n).padStart(2, "0");
      return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
    }
    const s = String(v).trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s); // dd/mm/yyyy
    if (m) { let y = m[3]; if (y.length === 2) y = "20" + y; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
    return "";
  }
  function payMapRow(o) {
    const norm = {};
    Object.keys(o).forEach((k) => { norm[k.toLowerCase().replace(/[^a-z]/g, "")] = o[k]; });
    const g = (...keys) => { for (const k of keys) if (norm[k] != null && norm[k] !== "") return norm[k]; return ""; };
    return {
      id: "u" + (paySeq++),
      category: String(g("category", "type") || "").trim(),
      hq: String(g("hq", "region", "branch") || "").trim(),
      salesPerson: String(g("salesperson", "sp", "rep") || "").trim(),
      customer: String(g("customer", "client", "doctor", "clinic", "party") || "").trim(),
      committedDate: payNormDate(g("committeddate", "commitmentdate", "date", "promiseddate")),
      outstanding: payNum(g("outstanding", "balance", "outstandingamount")),
      committedAmount: payNum(g("committedamount", "committed", "promisedamount", "amount")),
      received: payNum(g("received", "amountreceived", "collected", "receivedamount")),
      remark: String(g("remark", "remarks", "note", "notes", "comment") || "").trim(),
      lineItems: payNum(g("lineitems", "items", "noofitems")),
    };
  }
  const payKey = (r) => [r.category, r.customer, r.committedDate, r.committedAmount, r.outstanding].join("|").toLowerCase();
  function payAppend(mapped) {
    const seen = new Set(payAll().map(payKey));
    let added = 0;
    mapped.forEach((r) => { if (r.customer || r.committedAmount || r.outstanding) { const k = payKey(r); if (!seen.has(k)) { seen.add(k); paymentAdds.push(r); added++; } } });
    saveEdits(`Payments · uploaded ${added} new row(s)`);
    payRepaint();
    window.alert(`Imported ${added} new commitment row(s).` + (mapped.length - added ? ` ${mapped.length - added} duplicate/blank row(s) skipped.` : ""));
  }
  function payParseCSV(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) return [];
    const split = (line) => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; };
    const heads = split(lines[0]);
    return lines.slice(1).map((l) => { const cells = split(l); const o = {}; heads.forEach((h, i) => (o[h] = cells[i] != null ? cells[i] : "")); return o; });
  }
  function payImport(file) {
    const isCsv = /\.csv$/i.test(file.name) || !window.XLSX;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let rows;
        if (isCsv) rows = payParseCSV(String(e.target.result));
        else {
          const wb = window.XLSX.read(e.target.result, { type: "array", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
        }
        payAppend(rows.map(payMapRow));
      } catch (err) { window.alert("Could not read the file: " + (err.message || err)); }
    };
    if (isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file);
  }
  function payDownloadTemplate() {
    const sample = ["Consumables", "Telangana", "Vamsi", "Sample Clinic (delete this row)", "2026-09-15", 50000, 50000, 0, "By mid September", 2];
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([PAY_HEADERS, sample]);
      ws["!cols"] = PAY_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Commitments");
      window.XLSX.writeFile(wb, "payment_commitments_template.xlsx");
    } else {
      const csv = [PAY_HEADERS.join(","), sample.join(",")].join("\n");
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = "payment_commitments_template.csv";
      a.click();
    }
  }

  function renderPayments() {
    const admin = canEditPayments();
    const rows0 = payAll();
    setTimeout(() => {
      const wire = (id, fn) => { const el = document.getElementById(id); if (el) el.onchange = fn; };
      wire("payCat", (e) => { payFilter.cat = e.target.value; payRepaint(); });
      wire("payHq", (e) => { payFilter.hq = e.target.value; payRepaint(); });
      wire("paySp", (e) => { payFilter.sp = e.target.value; payRepaint(); });
      const s = document.getElementById("paySearch");
      if (s) s.oninput = (e) => { payFilter.q = e.target.value.toLowerCase(); payRepaint(); };
      // Explicit Apply — re-reads every control and applies (works even if a
      // dropdown's change event didn't fire).
      const applyBtn = document.getElementById("payApply");
      if (applyBtn) applyBtn.onclick = () => {
        const gv = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
        payFilter.cat = gv("payCat"); payFilter.hq = gv("payHq"); payFilter.sp = gv("paySp");
        payFilter.q = (gv("paySearch") || "").toLowerCase();
        payRepaint();
      };
      const tpl = document.getElementById("payTplBtn"); if (tpl) tpl.onclick = payDownloadTemplate;
      const up = document.getElementById("payUpload");
      if (up) up.onchange = (e) => { const f = e.target.files[0]; if (f) payImport(f); e.target.value = ""; };
      const clr = document.getElementById("payClearFilters");
      if (clr) clr.onclick = () => { payFilter = { cat: "", hq: "", sp: "", status: "", q: "" }; renderTab("payments"); };
      wirePayChips();
    }, 0);
    const opt = (v, cur) => `<option${v === cur ? " selected" : ""}>${esc(v)}</option>`;
    const sel = (id, cur, values, allLabel) => `<label class="ord-field"><span>${esc(allLabel)}</span><select id="${id}" class="select"><option value="">All</option>${values.map((v) => opt(v, cur)).join("")}</select></label>`;
    return `
      <div class="section-head">
        <h1>Payment Commitments</h1>
        <p>Outstanding customer commitments &amp; collection status across Consumables, Machine and Esthemax. Overdue is calculated against today. ${admin ? "Finance can upload an Excel/CSV to append new commitments — existing data is always kept." : "Read-only."}</p>
      </div>
      <div id="payKpis">${payKpis(rows0)}</div>
      <div id="payChips">${payStatusChips(rows0)}</div>
      <div class="controls" style="margin-top:14px">
        <input id="paySearch" class="search" type="search" placeholder="Search customer, HQ, rep, remark…" value="${esc(payFilter.q)}">
        ${sel("payCat", payFilter.cat, payUniq(rows0, "category"), "Category")}
        ${sel("payHq", payFilter.hq, payUniq(rows0, "hq"), "HQ")}
        ${sel("paySp", payFilter.sp, payUniq(rows0, "salesPerson"), "Sales Person")}
        <button id="payApply" class="dl-btn" type="button">Apply</button>
        <button id="payClearFilters" class="ghost-btn" type="button">Clear</button>
        <div class="hq-actions">
          <button id="payTplBtn" class="ghost-btn" type="button">⬇ Download input template</button>
          ${admin ? `<label class="dl-btn" style="cursor:pointer">⬆ Upload &amp; append<input id="payUpload" type="file" accept=".xlsx,.xls,.csv" hidden></label>` : ""}
        </div>
      </div>
      <div class="two-col" style="margin:6px 0 4px">
        <div class="card"><h2 style="margin-top:0">Pending by category</h2><div id="payBreakCat">${payBreakdown(payFiltered(rows0), "category", "Category")}</div></div>
        <div class="card"><h2 style="margin-top:0">Pending by HQ</h2><div id="payBreakHq">${payBreakdown(payFiltered(rows0), "hq", "HQ")}</div></div>
      </div>
      <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px">
        <h2 style="margin:0">Detailed commitment report</h2><span class="tag" id="payDrillCount">${rows0.length} records</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Category</th><th>HQ</th><th>Sales Person</th><th>Committed date</th><th class="num">Committed</th><th class="num">Received</th><th class="num">Pending</th><th>Status</th><th>Remark</th></tr></thead>
        <tbody id="payBody">${payTableRows(payFiltered(rows0))}</tbody>
      </table></div>`;
  }

  /* ================= DELIVERY CHALLAN ================= */
  const DEFAULT_FROM = {
    name: "Leeford Healthcare Ltd (Primelaze)",
    addr: "Leo House, Shaheed Bhagat Singh Nagar, Dugri-Dhandra Rd, Near Joseph School, Ludhiana, Punjab 141001",
  };
  const TRANSPORT_MODES = ["Air", "Surface", "Road", "Rail", "Courier", "Sea", "By Hand"];
  const customAddresses = []; // admin-added challan addresses (appear in From & To)
  const fromBook = () => (D.challanRefs && D.challanRefs.from || []).concat(customAddresses);
  const toBook = () => (D.challanRefs && D.challanRefs.to || []).concat(customAddresses);

  // Fixed company letterhead for the printed challan (issuing entity + GSTIN).
  const COMPANY = {
    name: "PrimeLaze Private Limited",
    addr: "No.16/8, Ragavendra Koil Street, Kurumbapet, Puducherry – 605 009",
    phone: "9015128171",
    gstin: "34AAMCP9346F1Z3",
    signName: "For PRIMELAZE PVT. LTD.",
  };
  // Primelaze logo (recreated as inline SVG so the PDF is self-contained).
  // Replace window.PRIMELAZE_LOGO with a data-URI PNG for a pixel-exact logo.
  const LOGO_SVG =
    `<svg width="190" height="72" viewBox="0 0 190 72" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="182" height="42" rx="3" fill="#c0202a"/>
      <text x="95" y="33" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">Primelaze</text>
      <text x="95" y="63" font-family="Georgia, 'Times New Roman', serif" font-size="13" fill="#3a3a3a" text-anchor="middle">We rise by our service</text>
    </svg>`;
  // Brand images (data-URIs) — admin uploads them; stored in Firestore config.
  let brandLogo = window.PRIMELAZE_LOGO || "";
  let brandSign = window.PRIMELAZE_SIGNATURE || "";
  const challanLogo = () => (brandLogo ? `<img src="${brandLogo}" alt="Primelaze" style="height:64px">` : LOGO_SVG);
  const challanSign = () => (brandSign ? `<img src="${brandSign}" alt="" style="height:56px">` : `<div style="height:52px"></div>`);

  // Standard "purpose of this item" declarations (from the official template).
  const PURPOSE_STATEMENTS = [
    "This is a Medical Device for Demo purpose, and hold no commercial value",
    "This is Magicpulse Packing box have no commercial value",
    "This is defective spares, and hold no commercial value",
    "This is a Medical Device 'CELLINA PR' for Demo purpose and hold no commercial value",
    "This is a Medical Device 'BI_AXIS' for Demo purpose and hold no commercial value",
    "This is a Medical Device 'BLAUMAN' for Demo purpose and holds no commercial value",
    "These are Medical Device Spare Parts, Have no commercial Value",
    "These are medical device Accessories. There are no Commercial Value attached to them",
    "These are Demo medical Device unit for demonstration In Doctors Clinics, Hospital and Conferences. These have no Commercial value attached to them",
    "This is Stationary for marketing hold no comercial value only Value of goods",
    "This is Medical accessories no commercial value",
    "Co shifting to new Office",
  ];
  const DECLARATION = [
    "I also confirm that the items in the consignment are not illegal, dangerous, or prohibited products.",
    "I further confirm that the above details are true and I will bear the responsibility for any misrepresentation.",
  ];
  let localChallans = []; // in-memory fallback when Firebase isn't available (local dev)
  let challanUnsub = null;

  function challanStore() { return db ? db.collection("challans") : null; }

  function renderChallan() {
    setTimeout(initChallanUI, 0);
    return `
      <div class="section-head">
        <h1>Delivery Challan</h1>
        <p>${roleIsAdmin() ? "Create delivery challans and download them as PDF. " : "View and download delivery challans. "}Everyone can view &amp; download; only admins can create.</p>
      </div>
      ${roleIsAdmin() ? `<div class="controls"><button id="newChallanBtn" class="dl-btn" type="button">＋ New challan</button>
        <button id="brandBtn" class="ghost-btn" type="button">🖼 Logo &amp; signature</button></div>` : ""}
      <div id="brandBox"></div>
      <div id="challanForm"></div>
      <div id="challanList"><div class="empty">Loading…</div></div>`;
  }

  function challanBrandHtml() {
    return `
      <div class="card" style="margin-bottom:20px">
        <h2 style="margin-top:0">Challan logo &amp; signature</h2>
        <p class="muted-note">Upload your Primelaze logo and the Director signature (PNG, ideally transparent background). They print on every challan and are saved for everyone. Keep each image small (under ~300&nbsp;KB).</p>
        <div class="ch-grid">
          <label class="ord-field"><span>Logo image</span><input id="brandLogoFile" type="file" accept="image/*"></label>
          <label class="ord-field"><span>Signature image</span><input id="brandSignFile" type="file" accept="image/*"></label>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;margin:10px 0">
          <div><div class="muted-note">Logo preview</div><div id="brandLogoPrev" style="border:1px solid var(--border);border-radius:8px;padding:8px;min-width:120px;min-height:50px">${challanLogo()}</div></div>
          <div><div class="muted-note">Signature preview</div><div id="brandSignPrev" style="border:1px solid var(--border);border-radius:8px;padding:8px;min-width:120px;min-height:50px">${brandSign ? challanSign() : '<span class="t-muted">none</span>'}</div></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button id="brandSave" class="dl-btn" type="button">Save branding</button>
          <button id="brandClose" class="ghost-btn" type="button">Close</button>
        </div>
        <div id="brandMsg" class="lock-error" style="min-height:16px"></div>
      </div>`;
  }

  function challanFormHtml(c) {
    c = c || {};
    const items = (c.items && c.items.length ? c.items : [{ desc: "", amount: "" }]);
    const itemRows = items.map((it, i) => challanItemRow(it, i)).join("");
    return `
      <div class="card" style="margin-bottom:20px">
        <h2 style="margin-top:0">${c.id ? "Edit" : "New"} challan</h2>
        <form id="chForm" class="admin-form">
          <div class="ch-grid">
            <label class="ord-field"><span>Challan No.</span><input id="chNo" value="${esc(c.no || "")}" placeholder="PL/DC/2026/001"></label>
            <label class="ord-field"><span>Date</span><input id="chDate" type="date" value="${esc(c.date || "")}"></label>
            <label class="ord-field"><span>Transport mode</span><select id="chMode" class="select">${TRANSPORT_MODES.concat((c.mode && !TRANSPORT_MODES.includes(c.mode)) ? [c.mode] : []).map((m) => `<option${(c.mode || "Air") === m ? " selected" : ""}>${esc(m)}</option>`).join("")}</select></label>
            <label class="ord-field"><span>Date of dispatch</span><input id="chDispatch" type="date" value="${esc(c.dispatch || "")}"></label>
            <label class="ord-field"><span>Estimated arrival</span><input id="chArrival" type="date" value="${esc(c.arrival || "")}"></label>
            <label class="ord-field"><span>Declared cargo value (₹)</span><input id="chValue" type="number" value="${esc(c.declaredValue || "")}"></label>
            <label class="ord-field"><span>Docket No.</span><input id="chDocket" value="${esc(c.docket || "")}"></label>
            <label class="ord-field"><span>Total packages</span><input id="chPackages" type="number" value="${esc(c.packages || "1")}"></label>
            <label class="ord-field"><span>Weight</span><input id="chWeight" value="${esc(c.weight || "")}" placeholder="e.g. 12 kg"></label>
          </div>
          <div class="ch-grid">
            <label class="ord-field"><span>From — pick office <button type="button" id="chSaveFrom" class="linkish" title="Save the From name+address below to the address book">💾 Save current</button></span>
              <select id="chFromPick" class="select">${challanPickOptions(fromBook())}</select></label>
            <label class="ord-field"><span>To — pick consignee <button type="button" id="chSaveTo" class="linkish" title="Save the To name+address below to the address book">💾 Save current</button></span>
              <select id="chToPick" class="select">${challanPickOptions(toBook())}</select></label>
            <label class="ord-field"><span>From — name</span><input id="chFromName" value="${esc(c.fromName || DEFAULT_FROM.name)}"></label>
            <label class="ord-field"><span>To — name (consignee)</span><input id="chToName" value="${esc(c.toName || "")}" placeholder="Dr. Name / Clinic"></label>
            <label class="ord-field"><span>From — address</span><textarea id="chFromAddr" rows="2">${esc(c.fromAddr || DEFAULT_FROM.addr)}</textarea></label>
            <label class="ord-field"><span>To — address</span><textarea id="chToAddr" rows="2">${esc(c.toAddr || "")}</textarea></label>
          </div>
          <div class="perm-group">
            <div class="perm-title">Items <button type="button" class="linkish" id="chAddItem">+ add item</button></div>
            <div id="chItems">${itemRows}</div>
          </div>
          <label class="ord-field"><span>Purpose of this item</span>
            <select id="chPurpose" class="select">
              <option value="">— select a purpose —</option>
              ${PURPOSE_STATEMENTS.concat((c.purpose && !PURPOSE_STATEMENTS.includes(c.purpose)) ? [c.purpose] : []).map((p) => `<option${c.purpose === p ? " selected" : ""}>${esc(p)}</option>`).join("")}
              <option value="__custom__">＋ Other (type below)…</option>
            </select></label>
          <label class="ord-field"><span>Notes / custom purpose (optional)</span><textarea id="chNotes" rows="2">${esc(c.notes || "")}</textarea></label>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="submit" class="dl-btn">${c.id ? "Save changes" : "Create challan"}</button>
            <button type="button" class="ghost-btn" id="chCancel">Cancel</button>
          </div>
          <div id="chMsg" class="lock-error" style="min-height:16px"></div>
        </form>
      </div>`;
  }

  function challanItemRow(it, i) {
    it = it || {};
    return `<div class="ch-item" data-i="${i}">
      <input class="ch-desc" placeholder="Description of item (e.g. Poly Lase Demo Unit)" value="${esc(it.desc || "")}">
      <input class="ch-amt" type="number" placeholder="Amount ₹" value="${esc(it.amount || "")}">
      <button type="button" class="ghost-btn ch-del" title="Remove">✕</button>
    </div>`;
  }

  function readChallanForm() {
    const items = Array.from(document.querySelectorAll("#chItems .ch-item")).map((r) => ({
      desc: r.querySelector(".ch-desc").value.trim(),
      amount: r.querySelector(".ch-amt").value.trim(),
    })).filter((x) => x.desc || x.amount);
    const purposeSel = $("#chPurpose").value;
    return {
      no: $("#chNo").value.trim(), date: $("#chDate").value, mode: $("#chMode").value.trim(),
      dispatch: $("#chDispatch").value, arrival: $("#chArrival").value,
      declaredValue: $("#chValue").value.trim(),
      docket: $("#chDocket").value.trim(), packages: $("#chPackages").value.trim(), weight: $("#chWeight").value.trim(),
      purpose: purposeSel === "__custom__" ? "" : purposeSel,
      fromName: $("#chFromName").value.trim(), fromAddr: $("#chFromAddr").value.trim(),
      toName: $("#chToName").value.trim(), toAddr: $("#chToAddr").value.trim(),
      items, notes: $("#chNotes").value.trim(),
    };
  }

  function challanPickOptions(book) {
    return `<option value="">— pick from address book —</option>` +
      book.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join("") +
      `<option value="__add__">＋ Add new address…</option>`;
  }
  function refreshChallanPicks() {
    const f = document.getElementById("chFromPick"), t = document.getElementById("chToPick");
    if (f) f.innerHTML = challanPickOptions(fromBook());
    if (t) t.innerHTML = challanPickOptions(toBook());
  }
  // Prompt for a new address, store it (shows in both From & To books), and fill.
  function addChallanAddress(nameSel, addrSel) {
    const nm = (window.prompt("Name / label (e.g. Dr. Sharma Clinic, or Primelaze Chennai office):") || "").trim();
    if (!nm) return;
    const ad = (window.prompt("Full address for " + nm + ":") || "").trim();
    customAddresses.push({ name: nm, addr: ad });
    saveEdits();
    if (nameSel && $(nameSel)) $(nameSel).value = nm;
    if (addrSel && $(addrSel)) $(addrSel).value = ad;
    refreshChallanPicks();
  }

  function openChallanForm(existing) {
    $("#challanForm").innerHTML = challanFormHtml(existing);
    const wrapItems = () => {
      $("#chAddItem").onclick = () => {
        const box = $("#chItems");
        box.insertAdjacentHTML("beforeend", challanItemRow({}, box.children.length));
        wrapItems();
      };
      document.querySelectorAll(".ch-del").forEach((b) => b.onclick = () => { b.closest(".ch-item").remove(); });
    };
    wrapItems();
    // pick From/To from the imported address book → auto-fill name + address
    const fromPick = document.getElementById("chFromPick");
    if (fromPick) fromPick.onchange = () => {
      if (fromPick.value === "__add__") { addChallanAddress("#chFromName", "#chFromAddr"); fromPick.value = ""; return; }
      const x = fromBook()[+fromPick.value];
      if (x) { $("#chFromName").value = x.name; $("#chFromAddr").value = x.addr; }
    };
    const toPick = document.getElementById("chToPick");
    if (toPick) toPick.onchange = () => {
      if (toPick.value === "__add__") { addChallanAddress("#chToName", "#chToAddr"); toPick.value = ""; return; }
      const x = toBook()[+toPick.value];
      if (x) {
        $("#chToName").value = x.name; $("#chToAddr").value = x.addr;
        if (x.purpose && !$("#chNotes").value) $("#chNotes").value = x.purpose;
      }
    };
    // Save the currently-typed From/To name + address to the address book.
    const saveCurrent = (nameSel, addrSel) => {
      const nm = ($(nameSel).value || "").trim();
      if (!nm) { const m = $("#chMsg"); if (m) { m.style.color = "var(--bad)"; m.textContent = "Enter a name first, then Save current."; } return; }
      const ad = ($(addrSel).value || "").trim();
      if (!customAddresses.some((x) => x.name === nm && x.addr === ad)) { customAddresses.push({ name: nm, addr: ad }); saveEdits(); }
      refreshChallanPicks();
      const m = $("#chMsg"); if (m) { m.style.color = "var(--accent-2)"; m.textContent = `Saved “${nm}” to the address book.`; }
    };
    const sf = document.getElementById("chSaveFrom"); if (sf) sf.onclick = () => saveCurrent("#chFromName", "#chFromAddr");
    const st = document.getElementById("chSaveTo"); if (st) st.onclick = () => saveCurrent("#chToName", "#chToAddr");
    $("#chCancel").onclick = () => { $("#challanForm").innerHTML = ""; };
    $("#chForm").onsubmit = async (e) => {
      e.preventDefault();
      const msg = $("#chMsg"); msg.style.color = ""; msg.textContent = "";
      const data = readChallanForm();
      if (!data.no || !data.toName) { msg.style.color = "var(--bad)"; msg.textContent = "Challan No. and consignee (To) are required."; return; }
      data.createdBy = (sessionUser && sessionUser.email) || "";
      try {
        const store = challanStore();
        if (store) {
          if (existing && existing.id) await store.doc(existing.id).set(data, { merge: true });
          else { data.createdAt = Date.now(); await store.add(data); }
        } else {
          if (existing && existing.id) { const idx = localChallans.findIndex((x) => x.id === existing.id); if (idx >= 0) localChallans[idx] = { ...data, id: existing.id }; }
          else localChallans.unshift({ ...data, id: "local-" + localChallans.length, createdAt: Date.now() });
        }
        $("#challanForm").innerHTML = "";
        loadChallans();
      } catch (err) { msg.style.color = "var(--bad)"; msg.textContent = "Save failed: " + (err.message || err); }
    };
  }

  function initChallanUI() {
    const nb = document.getElementById("newChallanBtn");
    if (nb) nb.onclick = () => openChallanForm(null);
    const bb = document.getElementById("brandBtn");
    if (bb) bb.onclick = () => {
      const box = document.getElementById("brandBox");
      if (!box) return;
      box.innerHTML = box.innerHTML ? "" : challanBrandHtml();
      if (box.innerHTML) wireChallanBrand();
    };
    loadChallans();
  }

  function readImageFile(file, cb) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  }

  function wireChallanBrand() {
    const msg = document.getElementById("brandMsg");
    const lf = document.getElementById("brandLogoFile");
    const sf = document.getElementById("brandSignFile");
    if (lf) lf.onchange = () => readImageFile(lf.files[0], (d) => { brandLogo = d; document.getElementById("brandLogoPrev").innerHTML = challanLogo(); });
    if (sf) sf.onchange = () => readImageFile(sf.files[0], (d) => { brandSign = d; document.getElementById("brandSignPrev").innerHTML = challanSign(); });
    const close = document.getElementById("brandClose");
    if (close) close.onclick = () => { document.getElementById("brandBox").innerHTML = ""; };
    const save = document.getElementById("brandSave");
    if (save) save.onclick = async () => {
      const size = (brandLogo.length + brandSign.length);
      if (size > 900000) { msg.style.color = "var(--bad)"; msg.textContent = "Images too large — please use smaller PNGs (under ~300 KB each)."; return; }
      if (!db) { msg.style.color = "var(--accent-2)"; msg.textContent = "Saved for this session (no Firebase connection to persist)."; return; }
      try {
        await db.collection("config").doc("app").set({ challanLogo: brandLogo, challanSignature: brandSign }, { merge: true });
        msg.style.color = "var(--accent-2)"; msg.textContent = "Saved — the logo & signature now print on every challan.";
      } catch (e) { msg.style.color = "var(--bad)"; msg.textContent = "Save failed: " + (e.message || e); }
    };
  }

  async function loadChallans() {
    const box = document.getElementById("challanList");
    if (!box) return;
    let list = [];
    try {
      const store = challanStore();
      if (store) {
        const snap = await store.orderBy("createdAt", "desc").get();
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      } else {
        list = localChallans.slice();
        box.insertAdjacentHTML("afterbegin", "");
      }
    } catch (e) {
      // orderBy can fail if createdAt missing; fall back to unordered
      try { const snap = await challanStore().get(); snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() })); }
      catch (e2) { box.innerHTML = `<div class="empty">Could not load challans (${esc(e2.message || "" + e2)}).</div>`; return; }
    }
    if (!list.length) { box.innerHTML = `<div class="empty">No challans yet.${roleIsAdmin() ? " Click “New challan” to create one." : ""}</div>`; return; }
    const rows = list.map((c) => {
      const val = c.declaredValue ? rupee(+c.declaredValue) : "—";
      const admin = roleIsAdmin()
        ? `<button class="ghost-btn ch-edit" data-id="${esc(c.id)}">Edit</button> <button class="ghost-btn ch-rm" data-id="${esc(c.id)}">Delete</button>`
        : "";
      return `<tr>
        <td class="t-name">${esc(c.no || "—")}</td>
        <td>${esc(c.date || "—")}</td>
        <td>${esc(c.toName || "—")}</td>
        <td class="num">${(c.items || []).length}</td>
        <td class="num">${val}</td>
        <td><button class="ghost-btn ch-pdf" data-id="${esc(c.id)}">⤓ PDF</button> ${admin}</td>
      </tr>`;
    }).join("");
    box.innerHTML = `<div class="block"><h2>Challans</h2>${table(["Challan No.", "Date", "Consignee", "Items", "Value", ""].map((h) => `<th>${h}</th>`).join(""), rows)}</div>`;
    const byId = (id) => list.find((x) => x.id === id);
    box.querySelectorAll(".ch-pdf").forEach((b) => b.onclick = () => downloadChallanPdf(byId(b.dataset.id)));
    box.querySelectorAll(".ch-edit").forEach((b) => b.onclick = () => openChallanForm(byId(b.dataset.id)));
    box.querySelectorAll(".ch-rm").forEach((b) => b.onclick = async () => {
      if (!window.confirm("Delete this challan?")) return;
      try { const store = challanStore(); if (store) await store.doc(b.dataset.id).delete(); else localChallans = localChallans.filter((x) => x.id !== b.dataset.id); loadChallans(); }
      catch (e) { window.alert("Delete failed: " + (e.message || e)); }
    });
  }

  function buildChallanPrint(c) {
    const itemRows = (c.items || []).map((it, i) =>
      `<tr><td class="num">${i + 1}</td><td>${esc(it.desc || "")}</td><td class="num">${it.amount ? rupee(+it.amount) : ""}</td></tr>`).join("");
    const total = (c.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const purpose = c.purpose || c.notes || "";
    return `
      <div class="p-section ch-print">
        <div class="ch-letterhead">
          <div class="ch-logo">${challanLogo()}</div>
          <div class="ch-co">
            <div class="ch-co-name">${esc(COMPANY.name)}</div>
            <div class="ch-co-line">If lost, please return to: ${esc(COMPANY.addr)}</div>
            <div class="ch-co-line">Call ${esc(COMPANY.phone)} &nbsp;·&nbsp; GSTIN ${esc(COMPANY.gstin)}</div>
          </div>
        </div>
        <div class="ch-title">DELIVERY CHALLAN</div>

        <table class="ch-meta"><tbody>
          <tr><th>Challan No.</th><td>${esc(c.no || "—")}</td><th>Date</th><td>${esc(c.date || "—")}</td></tr>
          <tr><th>Docket No.</th><td>${esc(c.docket || "—")}</td><th>Transport mode</th><td>${esc(c.mode || "—")}</td></tr>
          <tr><th>Total packages</th><td>${esc(c.packages || "—")}</td><th>Weight</th><td>${esc(c.weight || "—")}</td></tr>
          <tr><th>Date of dispatch</th><td>${esc(c.dispatch || "—")}</td><th>Estimated arrival</th><td>${esc(c.arrival || "—")}</td></tr>
          <tr><th>Declared cargo value</th><td colspan="3">${c.declaredValue ? rupee(+c.declaredValue) : "—"}</td></tr>
        </tbody></table>

        <table class="ch-fromto"><tbody>
          <tr><th style="width:50%">From (Consignor)</th><th style="width:50%">To (Consignee)</th></tr>
          <tr><td><b>${esc(c.fromName || "")}</b><br>${esc(c.fromAddr || "")}</td>
              <td><b>${esc(c.toName || "")}</b><br>${esc(c.toAddr || "")}</td></tr>
        </table>

        <table class="ch-items">
          <thead><tr><th class="num">S.No</th><th>List / Description of Items</th><th class="num">Amount</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="3">—</td></tr>`}
            <tr><td></td><td class="num"><b>Total</b></td><td class="num"><b>${rupee(total)}</b></td></tr>
          </tbody>
        </table>

        ${purpose ? `<p class="ch-purpose"><b>The purpose of this item is:</b> ${esc(purpose)}</p>` : ""}

        <div class="ch-declare">
          <b>I hereby declare that:</b>
          <ol>${DECLARATION.map((d) => `<li>${esc(d)}</li>`).join("")}</ol>
          <div>Thanking you.<br>Sincerely,</div>
        </div>

        <div class="ch-sign">
          ${brandSign
            ? challanSign()
            : `<div class="ch-sign-name">${esc(COMPANY.signName)}</div>${challanSign()}<div class="ch-sign-role">Director</div>`}
        </div>
      </div>`;
  }

  function downloadChallanPdf(c) {
    if (!c) return;
    let area = document.getElementById("printArea");
    if (!area) { area = document.createElement("div"); area.id = "printArea"; document.body.appendChild(area); }
    area.innerHTML = buildChallanPrint(c);
    document.body.classList.add("printing");
    const cleanup = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 40);
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
  const orderState = { usdInr: null, customs: null, moqJar: null, moqRetail: null, stock: {}, eta: {}, cat: "All", q: "", lineData: {} };
  // Esthemax has the full reorder plan; Devices & Celluma are simple stock logs.
  const INVENTORY_LINES = [
    { id: "esthemax", label: "Esthemax", ready: true },
    { id: "devices", label: "Machines (Devices)", ready: true, simple: true },
    { id: "celluma", label: "Celluma", ready: true, simple: true },
  ];
  const INV_STATUS = ["In stock", "Low stock", "Reorder", "Out of stock"];
  let inventoryLine = "esthemax";

  // ---- Admin-managed inventory items (add / edit / delete), saved for everyone ----
  const invAdds = { esthemax: [], devices: [], celluma: [] };     // custom items
  const invRemovals = { esthemax: [], devices: [], celluma: [] }; // hidden base items (by name)
  const esthOverrides = {};                                       // base Esthemax field edits, by name
  let esthBaseItems = null;                                       // pristine Esthemax item list

  function ensureEsthBase() {
    if (!esthBaseItems && D && D.esthemaxOrder && Array.isArray(D.esthemaxOrder.items)) {
      esthBaseItems = D.esthemaxOrder.items.slice();
    }
  }
  // Rebuild D.esthemaxOrder.items = base (minus removed, plus overrides) + custom adds.
  function rebuildEsthItems() {
    if (!D || !D.esthemaxOrder) return;
    ensureEsthBase();
    const removed = invRemovals.esthemax || [];
    let items = (esthBaseItems || []).filter((it) => !removed.includes(it.name))
      .map((it) => { const o = esthOverrides[it.name]; return o ? Object.assign({}, it, o) : it; });
    (invAdds.esthemax || []).forEach((ci) => items.push(ci));
    D.esthemaxOrder.items = items;
  }
  // Keep index-keyed stock/eta aligned to item names across an item-list change.
  function remapEsthStateByName(mutate) {
    const byName = {};
    (D.esthemaxOrder.items || []).forEach((it, i) => { byName[it.name] = { stock: orderState.stock[i], eta: orderState.eta[i] }; });
    mutate();
    const ns = {}, ne = {};
    (D.esthemaxOrder.items || []).forEach((it, i) => {
      const s = byName[it.name]; if (!s) return;
      if (s.stock != null) ns[i] = s.stock;
      if (s.eta) ne[i] = s.eta;
    });
    orderState.stock = ns; orderState.eta = ne;
  }
  // Base item-name list for a simple line (Celluma / Devices).
  function invSimpleBase(lineId) {
    return lineId === "celluma"
      ? (D.costs && D.costs.celluma ? D.costs.celluma.map((c) => c.model).filter(Boolean) : [])
      : deviceNames();
  }
  // Effective item-name list for a simple line (base − removed + adds).
  function invSimpleItems(lineId) {
    const removed = invRemovals[lineId] || [];
    const out = invSimpleBase(lineId).filter((n) => !removed.includes(n));
    const seen = new Set(out.map((n) => n.toLowerCase()));
    (invAdds[lineId] || []).forEach((n) => { if (!seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.push(n); } });
    return out;
  }

  function invAddSimple(lineId) {
    const label = lineId === "celluma" ? "Celluma variant" : "machine / device";
    const name = (window.prompt("Add new " + label + " — name:") || "").trim();
    if (!name) return;
    if (invSimpleItems(lineId).some((n) => n.toLowerCase() === name.toLowerCase())) { window.alert("That item already exists."); return; }
    (invAdds[lineId] = invAdds[lineId] || []).push(name);
    invRemovals[lineId] = (invRemovals[lineId] || []).filter((n) => n.toLowerCase() !== name.toLowerCase());
    saveEdits("Added inventory item: " + name);
    renderTab("order");
  }
  function invEditSimple(lineId, oldName) {
    const nn = (window.prompt("Rename item:", oldName) || "").trim();
    if (!nn || nn === oldName) return;
    if (invSimpleItems(lineId).some((n) => n.toLowerCase() === nn.toLowerCase())) { window.alert("An item with that name already exists."); return; }
    const data = orderState.lineData[lineId] = orderState.lineData[lineId] || {};
    if (data[oldName] != null) { data[nn] = data[oldName]; delete data[oldName]; }
    if ((invAdds[lineId] || []).includes(oldName)) {
      invAdds[lineId] = invAdds[lineId].map((n) => (n === oldName ? nn : n));
    } else {
      (invRemovals[lineId] = invRemovals[lineId] || []).push(oldName);
      (invAdds[lineId] = invAdds[lineId] || []).push(nn);
    }
    saveEdits("Renamed inventory item: " + oldName + " → " + nn);
    renderTab("order");
  }
  function invDeleteSimple(lineId, name) {
    if (!window.confirm('Delete "' + name + '" from inventory? This removes it for everyone.')) return;
    const data = orderState.lineData[lineId]; if (data) delete data[name];
    if ((invAdds[lineId] || []).includes(name)) invAdds[lineId] = invAdds[lineId].filter((n) => n !== name);
    else (invRemovals[lineId] = invRemovals[lineId] || []).push(name);
    saveEdits("Deleted inventory item: " + name);
    renderTab("order");
  }

  // Prompt for an Esthemax item's fields (existing = prefill for edit).
  function esthPromptItem(existing) {
    const g = (msg, def) => window.prompt(msg, def == null ? "" : String(def));
    const name = (g("Item name:", existing ? existing.name : "") || "").trim();
    if (!name) return null;
    const category = (g("Category (JAR / RETAIL / Accessory / SAMPLE):", existing ? existing.category : "JAR") || "").trim() || "Accessory";
    const num = (msg, def) => { const v = parseFloat(g(msg, def)); return isNaN(v) ? 0 : Math.max(0, v); };
    const requiredStock = num("Required stock:", existing ? existing.requiredStock : 0);
    const currentStock = num("Current stock:", existing ? existing.currentStock : 0);
    const unitUSD = num("Unit price USD (optional — for reorder cost):", existing ? existing.unitUSD : 0);
    const transport = num("Transport per unit ₹ (optional):", existing ? existing.transport : 0);
    return { name, category, requiredStock, currentStock, unitUSD, transport,
      monthly: existing && Array.isArray(existing.monthly) ? existing.monthly : [],
      sixMoAvg: existing && existing.sixMoAvg != null ? existing.sixMoAvg : null };
  }
  function esthAddItem() {
    const it = esthPromptItem(null); if (!it) return;
    ensureEsthBase();
    const exists = (esthBaseItems || []).concat(invAdds.esthemax || []).some((x) => x.name.toLowerCase() === it.name.toLowerCase());
    if (exists) { window.alert("That item already exists."); return; }
    remapEsthStateByName(() => {
      (invAdds.esthemax = invAdds.esthemax || []).push(it);
      invRemovals.esthemax = (invRemovals.esthemax || []).filter((n) => n.toLowerCase() !== it.name.toLowerCase());
      rebuildEsthItems();
    });
    saveEdits("Added Esthemax item: " + it.name);
    renderTab("order");
  }
  function esthEditItem(name) {
    const cur = D.esthemaxOrder.items.find((x) => x.name === name); if (!cur) return;
    const it = esthPromptItem(cur); if (!it) return;
    remapEsthStateByName(() => {
      if ((invAdds.esthemax || []).some((x) => x.name === name)) {
        invAdds.esthemax = invAdds.esthemax.map((x) => (x.name === name ? it : x));
      } else if (it.name !== name) {
        (invRemovals.esthemax = invRemovals.esthemax || []).push(name);
        (invAdds.esthemax = invAdds.esthemax || []).push(it);
      } else {
        esthOverrides[name] = { category: it.category, requiredStock: it.requiredStock, currentStock: it.currentStock, unitUSD: it.unitUSD, transport: it.transport };
      }
      rebuildEsthItems();
    });
    saveEdits("Edited Esthemax item: " + name);
    renderTab("order");
  }
  function esthDeleteItem(name) {
    if (!window.confirm('Delete Esthemax item "' + name + '"? This removes it for everyone.')) return;
    remapEsthStateByName(() => {
      if ((invAdds.esthemax || []).some((x) => x.name === name)) invAdds.esthemax = invAdds.esthemax.filter((x) => x.name !== name);
      else (invRemovals.esthemax = invRemovals.esthemax || []).push(name);
      delete esthOverrides[name];
      rebuildEsthItems();
    });
    saveEdits("Deleted Esthemax item: " + name);
    renderTab("order");
  }

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

    if (line.simple) return renderSimpleInventory(line);

    setTimeout(() => {
      const lineSel = document.getElementById("invLine");
      if (lineSel) lineSel.onchange = (e) => { inventoryLine = e.target.value; renderTab("order"); };
      if (!line.ready) return; // placeholder view has no other controls to wire
      const wire = (id, key, factor) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) { orderState[key] = factor ? v / 100 : v; orderPaint(); saveEdits("Updated " + id.replace(/^ord/, "")); }
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
        saveEdits(); renderTab("order");
      };
      const addBtn = document.getElementById("ordAddBtn");
      if (addBtn) addBtn.onclick = () => esthAddItem();
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

      ${isAdmin() ? `<div class="card" style="margin-bottom:18px">
        <div class="order-params">
          <label class="ord-field"><span>USD → INR</span><input id="ordUsd" type="number" step="0.01" value="${orderState.usdInr}"></label>
          <label class="ord-field"><span>Customs rate (%)</span><input id="ordCustoms" type="number" step="1" value="${+(orderState.customs * 100).toFixed(2)}"></label>
          <label class="ord-field"><span>JAR min order</span><input id="ordMoqJar" type="number" step="1" min="1" value="${orderState.moqJar}"></label>
          <label class="ord-field"><span>Retail min order</span><input id="ordMoqRetail" type="number" step="1" min="1" value="${orderState.moqRetail}"></label>
          <div class="ord-field"><span>Coverage</span><b>${esc(p.dermaMonths)} derma + ${esc(p.salonMonths)} salon mo</b></div>
          <button id="ordReset" class="ghost-btn" type="button">Reset</button>
        </div>
      </div>` : ""}

      <div id="orderKpis" class="grid kpi-grid" style="margin-bottom:18px"></div>

      <div class="controls">
        <input id="ordSearch" class="search" type="search" placeholder="Search item…" value="${esc(orderState.q)}" />
        <div class="seg">${catSeg}</div>
        ${isAdmin() ? `<button id="ordAddBtn" class="dl-btn" type="button">＋ Add Esthemax item</button>` : ""}
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>
            ${isAdmin()
              ? `<th>Item</th><th>Category</th><th>Status</th><th class="num">6-mo avg</th><th>Trend</th>
                 <th class="num">Required</th><th class="num">Current</th>${isSuperAdmin() ? `<th class="num">To Buy</th>
                 <th>ETA (arrival)</th>` : ""}<th></th>`
              : `<th>Product</th><th class="num">Current stock</th><th>Status</th>${isSuperAdmin() ? `<th>Estimated arrival</th>` : ""}`}
          </tr></thead>
          <tbody id="orderBody"></tbody>
        </table>
      </div>
      ${isAdmin() ? `<div class="muted-note">Current stock is editable — type a new value to re-plan.${isSuperAdmin() ? ` To Buy rounds the shortfall to the nearest minimum-order lot (JAR ${orderState.moqJar} / Retail ${orderState.moqRetail}); “need” shows the raw shortfall. Order quantity &amp; arrival are visible to super admins only.` : ""}</div>` : ""}`;
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
    const admin = isAdmin();
    const kpis = [
      { cls: "k-good", label: "Can sell now", value: inr(canSell), note: `of ${filtered.length} shown` },
      { cls: "", label: "SKUs to reorder", value: inr(toOrder), note: "stock below required" },
    ].concat(isSuperAdmin() ? [{ cls: "k-teal", label: "Units to buy", value: inr(Math.round(units)), note: "min-order rounded" }] : [])
      .map((x) => `<div class="card kpi ${x.cls}"><div class="kpi-label">${x.label}</div><div class="kpi-value">${x.value}</div><div class="kpi-note">${esc(x.note)}</div></div>`).join("");
    const kEl = document.getElementById("orderKpis");
    if (kEl) kEl.innerHTML = kpis;

    const sorted = filtered.slice().sort((a, b) => b.money - a.money || b.toBuy - a.toBuy);
    const body = sorted.map((r) => {
      const status = r.canSell
        ? `<span class="badge b-good">Can sell</span>`
        : `<span class="badge b-warn">Reorder</span>`;
      if (!admin) {
        // View: Product · Current stock · Status (arrival is super-admin only).
        return `<tr>
          <td class="t-name">${esc(r.it.name)}</td>
          <td class="num">${inr(r.current)}</td>
          <td>${status}</td>
          ${isSuperAdmin() ? `<td>${orderState.eta[r.i] ? esc(orderState.eta[r.i]) : "—"}</td>` : ""}
        </tr>`;
      }
      const catCls = { JAR: "b-accent", RETAIL: "b-teal", Accessory: "b-neutral", SAMPLE: "b-warn" }[r.it.category] || "b-neutral";
      return `<tr>
        <td class="t-name">${esc(r.it.name)}</td>
        <td><span class="badge ${catCls}">${esc(r.it.category)}</span></td>
        <td>${status}</td>
        <td class="num">${isNum(r.it.sixMoAvg) ? r.it.sixMoAvg.toFixed(1) : "—"}</td>
        <td class="spark-cell">${sparkline(r.it.monthly)}</td>
        <td class="num">${inr(r.it.requiredStock)}</td>
        <td class="num"><input class="stock-input" type="number" data-idx="${r.i}" value="${r.current}" /></td>
        ${isSuperAdmin() ? `<td class="num ${r.toBuy > 0 ? "buy-pos" : ""}">${inr(Math.round(r.toBuy))}${r.toBuy !== r.need ? `<div class="cell-note" style="font-weight:600">need ${inr(Math.round(r.need))}</div>` : ""}</td>
        <td><input class="eta-input" type="date" data-idx="${r.i}" value="${esc(orderState.eta[r.i] || "")}" title="Expected arrival at Primelaze" /></td>` : ""}
        <td style="white-space:nowrap"><button class="ghost-btn esth-edit" data-item="${esc(r.it.name)}">Edit</button> <button class="ghost-btn danger esth-del" data-item="${esc(r.it.name)}">Delete</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="${admin ? (isSuperAdmin() ? 10 : 8) : 3}" class="empty">No matching items.</td></tr>`;
    const bEl = document.getElementById("orderBody");
    if (bEl) {
      bEl.innerHTML = body; orderBindStockInputs();
      if (admin) {
        bEl.querySelectorAll(".esth-edit").forEach((b) => (b.onclick = () => esthEditItem(b.dataset.item)));
        bEl.querySelectorAll(".esth-del").forEach((b) => (b.onclick = () => esthDeleteItem(b.dataset.item)));
      }
    }
  }

  // Simple stock log for Devices / Celluma (no reorder maths, no money).
  function simpleInvRows(items, data, q, admin) {
    return items.filter((n) => !q || n.toLowerCase().includes(q)).map((name) => {
      const d = data[name] || {};
      const stockCell = admin
        ? `<input class="inv-simple stock-input" data-item="${esc(name)}" data-f="stock" type="number" min="0" value="${esc(d.stock == null ? "" : d.stock)}">`
        : (d.stock == null || d.stock === "" ? "—" : esc(d.stock));
      const statusCell = admin
        ? `<select class="inv-simple demo-select" data-item="${esc(name)}" data-f="status" style="max-width:160px"><option value="">—</option>${INV_STATUS.map((s) => `<option${d.status === s ? " selected" : ""}>${s}</option>`).join("")}</select>`
        : (d.status || "—");
      // Arrival date ("when it arrived") is visible to super admins only.
      const etaCell = admin
        ? `<input class="inv-simple eta-input" data-item="${esc(name)}" data-f="eta" type="date" value="${esc(d.eta || "")}">`
        : (d.eta || "—");
      const etaTd = isSuperAdmin() ? `<td>${etaCell}</td>` : "";
      const actionTd = admin ? `<td style="white-space:nowrap"><button class="ghost-btn inv-edit" data-item="${esc(name)}">Edit</button> <button class="ghost-btn danger inv-del" data-item="${esc(name)}">Delete</button></td>` : "";
      return `<tr><td class="t-name">${esc(name)}</td><td class="num">${stockCell}</td><td>${statusCell}</td>${etaTd}${actionTd}</tr>`;
    }).join("") || `<tr><td colspan="${3 + (isSuperAdmin() ? 1 : 0) + (admin ? 1 : 0)}" class="empty">No items.</td></tr>`;
  }

  function wireSimpleInv(lineId) {
    if (!isAdmin()) return;
    const data = orderState.lineData[lineId] = orderState.lineData[lineId] || {};
    document.querySelectorAll(".inv-simple").forEach((el) => {
      el.onchange = () => {
        const rec = data[el.dataset.item] = data[el.dataset.item] || {};
        rec[el.dataset.f] = el.dataset.f === "stock" ? (el.value === "" ? "" : Math.max(0, parseFloat(el.value) || 0)) : el.value;
        saveEdits(`${el.dataset.item} · ${el.dataset.f} → ${el.value || "—"}`);
      };
    });
    const addBtn = document.getElementById("invAddBtn");
    if (addBtn) addBtn.onclick = () => invAddSimple(lineId);
    document.querySelectorAll(".inv-edit").forEach((b) => (b.onclick = () => invEditSimple(lineId, b.dataset.item)));
    document.querySelectorAll(".inv-del").forEach((b) => (b.onclick = () => invDeleteSimple(lineId, b.dataset.item)));
  }

  function renderSimpleInventory(line) {
    const admin = isAdmin();
    const items = invSimpleItems(line.id);
    const data = orderState.lineData[line.id] = orderState.lineData[line.id] || {};
    const lineOpts = INVENTORY_LINES.map((l) => `<option value="${l.id}"${l.id === inventoryLine ? " selected" : ""}>${esc(l.label)}</option>`).join("");

    setTimeout(() => {
      const lineSel = document.getElementById("invLine");
      if (lineSel) lineSel.onchange = (e) => { inventoryLine = e.target.value; renderTab("order"); };
      const s = document.getElementById("ordSearch");
      if (s) s.oninput = (e) => {
        orderState.q = e.target.value.toLowerCase();
        const b = document.getElementById("simpleInvBody");
        if (b) { b.innerHTML = simpleInvRows(items, data, orderState.q, admin); wireSimpleInv(line.id); }
      };
      wireSimpleInv(line.id);
    }, 0);

    return `
      <div class="section-head"><h1>Inventory — ${esc(line.label)}</h1></div>
      <div class="controls">
        <label class="inv-line"><span>Inventory line</span><select id="invLine" class="select">${lineOpts}</select></label>
      </div>
      <div class="controls"><input id="ordSearch" class="search" type="search" placeholder="Search ${line.id === "celluma" ? "variant" : "machine"}…" value="${esc(orderState.q)}">${admin ? `<button id="invAddBtn" class="dl-btn" type="button">＋ Add ${line.id === "celluma" ? "variant" : "device"}</button>` : ""}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Item</th><th class="num">Current stock</th><th>Status</th>${isSuperAdmin() ? `<th>Estimated arrival</th>` : ""}${admin ? `<th></th>` : ""}</tr></thead>
        <tbody id="simpleInvBody">${simpleInvRows(items, data, orderState.q, admin)}</tbody>
      </table></div>
      ${admin ? `<div class="muted-note">Enter current stock and status for each ${line.id === "celluma" ? "Celluma variant" : "machine"}. Use <b>＋ Add</b>, or <b>Edit</b> / <b>Delete</b> per row, to manage the list.${isSuperAdmin() ? " Expected arrival is visible to super admins only." : ""} Saved for everyone.</div>` : ""}`;
  }

  function orderBindStockInputs() {
    document.querySelectorAll(".stock-input").forEach((inp) => {
      inp.onchange = (e) => {
        const idx = +e.target.dataset.idx;
        const v = parseFloat(e.target.value);
        orderState.stock[idx] = isNaN(v) ? 0 : v;
        orderPaint();
        const it = D.esthemaxOrder.items[idx];
        saveEdits(`Stock · ${(it && it.name) || "item"} → ${orderState.stock[idx]}`);
      };
    });
    // ETA (expected arrival at Primelaze) — informational, no recompute needed.
    document.querySelectorAll(".eta-input").forEach((inp) => {
      inp.onchange = (e) => { orderState.eta[+e.target.dataset.idx] = e.target.value; saveEdits("Updated expected arrival"); };
    });
  }

  /* ---------------- shell / routing ---------------- */
  function renderTab(id) { go(id); }

  function mountTabs() {
    const nav = $("#tabs");
    const visible = TABS.filter((t) => canSeePage(t.id));
    let lastGroup = null;
    nav.innerHTML = visible.map((t) => {
      const sep = (lastGroup !== null && t.group && t.group !== lastGroup) ? `<span class="tab-sep" aria-hidden="true"></span>` : "";
      lastGroup = t.group;
      return `${sep}<button class="tab" data-tab="${t.id}" role="tab" title="${esc(t.group || "")}">${t.label}</button>`;
    }).join("");
    nav.querySelectorAll(".tab").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
  }

  function firstVisibleTab() {
    const t = TABS.find((x) => canSeePage(x.id));
    return t ? t.id : "overview";
  }

  function go(id) {
    let tab = TABS.find((t) => t.id === id);
    if (!tab || !canSeePage(tab.id)) tab = TABS.find((t) => t.id === firstVisibleTab()) || TABS[0];
    currentTab = tab.id;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab.id));
    $("#view").innerHTML = pageEditNote(tab.id) + tab.render();
    wirePageEditNote();
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

  // Admins can flip their own editing on/off. Non-admins never see the toggle.
  function initMode() {
    const btn = document.getElementById("modeToggle");
    if (!btn) return;
    if (!roleIsAdmin()) { btn.hidden = true; return; }
    btn.hidden = false;
    const paint = () => {
      btn.textContent = isAdmin() ? "🔓 Admin" : "👁 View";
      btn.classList.toggle("admin-on", isAdmin());
    };
    paint();
    btn.onclick = () => { appMode = isAdmin() ? "view" : "admin"; paint(); mountTabs(); go(currentTab); };
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

  let booted = false;
  function bootApp() {
    const pill = document.getElementById("userPill");
    if (pill) { pill.textContent = (sessionUser && sessionUser.email ? sessionUser.email : "") + (roleIsAdmin() ? " · admin" : " · view"); pill.hidden = false; }
    const lo = document.getElementById("logoutBtn");
    if (lo) { lo.hidden = false; lo.onclick = () => auth && auth.signOut(); }
    mountTabs();
    initMode();
    go(location.hash.slice(1) || firstVisibleTab());
    if (!booted) {
      booted = true;
      const viewEl = $("#view");
      if (viewEl) new MutationObserver(() => enhanceTables()).observe(viewEl, { childList: true, subtree: true });
    }
  }

  /* ---------------- data decryption ---------------- */
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

  /* ---------------- Firebase auth + Firestore ---------------- */
  const DEFAULT_DATA_KEY = "prime@1986"; // seeds config/app.dataKey on first admin login

  function initFirebase() {
    if (!window.firebase || !window.FIREBASE_CONFIG) return false;
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      return true;
    } catch (e) { console.error("Firebase init failed", e); return false; }
  }

  async function loadSession(user) {
    sessionUser = user;
    const email = (user.email || "").toLowerCase();
    const isBootstrap = email && email === String(window.BOOTSTRAP_ADMIN_EMAIL || "").toLowerCase();

    let udoc = null;
    try { const s = await db.collection("users").doc(user.uid).get(); if (s.exists) udoc = s.data(); }
    catch (e) { console.warn("users read failed", e); }

    if (!udoc && isBootstrap) {
      udoc = { email, role: "superadmin", pages: "all", hqs: "all", landing: true, managerInc: true, editPages: "all", name: "Administrator" };
      try { await db.collection("users").doc(user.uid).set(udoc); } catch (e) { console.warn("bootstrap write failed", e); }
    } else if (udoc && isBootstrap && udoc.role !== "superadmin") {
      // Keep the bootstrap admin labelled as Super Admin.
      udoc.role = "superadmin";
      try { await db.collection("users").doc(user.uid).set({ role: "superadmin" }, { merge: true }); } catch (e) {}
    }
    if (!udoc) throw new Error("no-access");

    // "superadmin" and "admin" both edit all content; only super manages users.
    // The bootstrap admin is always super, regardless of the stored role.
    userRole = (udoc.role === "admin" || udoc.role === "superadmin") ? "admin" : "view";
    userSuper = udoc.role === "superadmin" || isBootstrap;
    perms = { pages: udoc.pages || [], hqs: udoc.hqs || [], landing: !!udoc.landing, managerInc: !!udoc.managerInc, editPages: udoc.editPages || [] };
    // Migration: the old "esthemax" tab was merged into "prices" (Pricing).
    // Preserve access for users who were granted only the old page.
    ["pages", "editPages"].forEach((k) => {
      if (Array.isArray(perms[k]) && perms[k].includes("esthemax") && !perms[k].includes("prices")) perms[k].push("prices");
    });
    appMode = "view";

    // data decryption key (kept in Firestore, readable only by signed-in users)
    let key = DEFAULT_DATA_KEY;
    try {
      const cs = await db.collection("config").doc("app").get();
      if (cs.exists) {
        const cd = cs.data() || {};
        if (cd.dataKey) key = cd.dataKey;
        else if (roleIsAdmin()) await db.collection("config").doc("app").set({ dataKey: DEFAULT_DATA_KEY }, { merge: true });
        if (cd.challanLogo) brandLogo = cd.challanLogo;
        if (cd.challanSignature) brandSign = cd.challanSignature;
      } else if (roleIsAdmin()) await db.collection("config").doc("app").set({ dataKey: DEFAULT_DATA_KEY }, { merge: true });
    } catch (e) { console.warn("config read failed, using default key", e); }

    D = await decryptData(key);
    await loadEdits();
  }

  async function loadEdits() {
    try {
      const s = await db.collection("edits").doc("overrides").get();
      if (!s.exists) return;
      const e = s.data() || {};
      // Rebuild admin-managed inventory items BEFORE stock/eta (which key by name→index).
      ["esthemax", "devices", "celluma"].forEach((k) => {
        if (e.invAdds && Array.isArray(e.invAdds[k])) invAdds[k] = e.invAdds[k];
        if (e.invRemovals && Array.isArray(e.invRemovals[k])) invRemovals[k] = e.invRemovals[k];
      });
      if (e.esthOverrides && typeof e.esthOverrides === "object") Object.keys(e.esthOverrides).forEach((k) => { esthOverrides[k] = e.esthOverrides[k]; });
      rebuildEsthItems();
      if (e.stock || e.eta) {
        D.esthemaxOrder.items.forEach((it, i) => {
          if (e.stock && e.stock[it.name] != null) orderState.stock[i] = e.stock[it.name];
          if (e.eta && e.eta[it.name] != null) orderState.eta[i] = e.eta[it.name];
        });
      }
      if (e.hqTargets) Object.keys(e.hqTargets).forEach((k) => { hqEdits[k] = e.hqTargets[k]; });
      if (e.demo) ["current", "status", "movement", "packing"].forEach((k) => Object.assign(demoEdits[k], e.demo[k] || {}));
      if (e.demoAdds) {
        ["current", "status", "movement", "packing"].forEach((k) => { if (Array.isArray(e.demoAdds[k])) demoAdds[k] = e.demoAdds[k]; });
        const ids = Object.values(demoAdds).flat().map((x) => +String(x.id).slice(1)).filter((n) => !isNaN(n));
        demoAddSeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
      if (e.roster) Object.assign(rosterEdits, e.roster);
      if (Array.isArray(e.rosterAdds)) {
        rosterAdds.length = 0; e.rosterAdds.forEach((p) => rosterAdds.push(p));
        const ids = rosterAdds.map((x) => +String(x._aid).slice(1)).filter((n) => !isNaN(n));
        rosterAddSeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
      if (Array.isArray(e.rosterRemovals)) { rosterRemovals.length = 0; e.rosterRemovals.forEach((n) => rosterRemovals.push(n)); }
      if (Array.isArray(e.customHQs)) { customHQs.length = 0; e.customHQs.forEach((h) => customHQs.push(h)); }
      if (Array.isArray(e.customDesignations)) { customDesignations.length = 0; e.customDesignations.forEach((d) => customDesignations.push(d)); }
      if (Array.isArray(e.paymentAdds)) {
        paymentAdds.length = 0; e.paymentAdds.forEach((r) => paymentAdds.push(r));
        const ids = paymentAdds.map((r) => +String(r.id).replace(/^u/, "")).filter((n) => !isNaN(n));
        paySeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
      if (Array.isArray(e.customPeople)) { customPeople.length = 0; e.customPeople.forEach((h) => customPeople.push(h)); }
      if (Array.isArray(e.customAddresses)) { customAddresses.length = 0; e.customAddresses.forEach((a) => customAddresses.push(a)); }
      if (e.vacancies) Object.keys(e.vacancies).forEach((k) => { vacancyEdits[k] = e.vacancies[k]; });
      if (e.hqAdds) Object.keys(e.hqAdds).forEach((k) => { hqAdds[k] = e.hqAdds[k]; });
      if (e.hqQtr) Object.keys(e.hqQtr).forEach((k) => { hqQtr[k] = e.hqQtr[k]; });
      if (e.hqSales) Object.keys(e.hqSales).forEach((k) => { if (Array.isArray(e.hqSales[k])) hqSales[k] = e.hqSales[k]; });
      if (e.hqEsthSales) Object.keys(e.hqEsthSales).forEach((k) => { if (Array.isArray(e.hqEsthSales[k])) hqEsthSales[k] = e.hqEsthSales[k]; });
      {
        const ids = Object.values(hqSales).concat(Object.values(hqEsthSales)).flat().map((x) => +String(x.id).slice(1)).filter((n) => !isNaN(n));
        hqSaleSeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
      if (Array.isArray(e.newDevices)) { newDevices.length = 0; e.newDevices.forEach((d) => newDevices.push(d)); }
      if (e.invLines && typeof e.invLines === "object") orderState.lineData = e.invLines;
      // Restore the admin-set FX / customs / lot sizes (orderInit only fills
      // these when still null, so restored values survive the first render).
      if (e.usdInr != null) orderState.usdInr = e.usdInr;
      if (e.customs != null) orderState.customs = e.customs;
      if (e.moqJar != null) orderState.moqJar = e.moqJar;
      if (e.moqRetail != null) orderState.moqRetail = e.moqRetail;
      if (e.orgTop && typeof e.orgTop === "object") orgTop = { name: e.orgTop.name || "CTO", title: e.orgTop.title || "" };
      editsUpdatedAt = e.updatedAt || 0; editsUpdatedBy = e.updatedBy || "";
      if (Array.isArray(e.log)) { editsLog.length = 0; e.log.forEach((x) => editsLog.push(x)); }
      updateLastUpdatedUI();
    } catch (err) { console.warn("edits read failed", err); }
  }

  let saveTimer = null;
  function saveEdits(what) {
    if (!db || !(roleIsAdmin() || hasAnyEditGrant())) return;
    clearTimeout(saveTimer);
    const desc = (what == null ? "" : String(what)).slice(0, 120);
    saveTimer = setTimeout(async () => {
      const stock = {}, eta = {};
      D.esthemaxOrder.items.forEach((it, i) => {
        if (orderState.stock[i] != null) stock[it.name] = orderState.stock[i];
        if (orderState.eta[i]) eta[it.name] = orderState.eta[i];
      });
      const by = (sessionUser && sessionUser.email) || "";
      const at = Date.now();
      const tabLabel = (TABS.find((t) => t.id === currentTab) || {}).label || currentTab;
      editsUpdatedAt = at; editsUpdatedBy = by;
      editsLog.unshift({ by, at, tab: tabLabel, what: desc });
      if (editsLog.length > 60) editsLog.length = 60;
      updateLastUpdatedUI();
      try {
        await db.collection("edits").doc("overrides").set(
          { stock, eta, usdInr: orderState.usdInr, customs: orderState.customs, moqJar: orderState.moqJar, moqRetail: orderState.moqRetail, hqTargets: hqEdits, demo: demoEdits, demoAdds, roster: rosterEdits, rosterAdds, rosterRemovals, customHQs, customDesignations, customPeople, customAddresses, paymentAdds, vacancies: vacancyEdits, hqAdds, hqQtr, hqSales, hqEsthSales, newDevices, invLines: orderState.lineData, invAdds, invRemovals, esthOverrides, orgTop, updatedBy: by, updatedAt: at, log: editsLog }, { merge: true });
      } catch (e) { console.warn("edits save failed", e); }
    }, 800);
  }

  // ---- Last-updated / activity log ----
  let editsUpdatedAt = 0, editsUpdatedBy = "";
  const editsLog = [];
  function fmtWhen(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function updateLastUpdatedUI() {
    const el = document.getElementById("lastUpdated");
    const dot = document.getElementById("luDot");
    const txt = editsUpdatedAt ? `Last updated ${fmtWhen(editsUpdatedAt)}${editsUpdatedBy ? " · " + editsUpdatedBy : ""}` : "";
    if (el) el.textContent = txt;
    if (dot) dot.hidden = !txt;
    refreshPageEditNote();
  }

  // All changes recorded for a specific page (newest first), by its tab label.
  function pageEditsFor(tabId) {
    const label = (TABS.find((t) => t.id === tabId) || {}).label;
    if (!label) return [];
    return editsLog.filter((e) => e.tab === label);
  }
  // Inner HTML for the per-page change note: last change + expandable history.
  function pageEditInner(tabId) {
    const list = pageEditsFor(tabId);
    if (!list.length) return "";
    const e = list[0];
    const who = e.by || "someone";
    const what = e.what ? ` — <span class="pen-what">${esc(e.what)}</span>` : "";
    const more = list.length > 1
      ? `<button type="button" class="linkish pen-toggle">History (${list.length})</button>` : "";
    const rows = list.slice(0, 20).map((x) =>
      `<li><span class="peh-when">${esc(fmtWhen(x.at))}</span> · <b>${esc(x.by || "—")}</b>${x.what ? ` — ${esc(x.what)}` : ""}</li>`).join("");
    return `<div class="pen-line"><span class="pen-ico">✎</span> Last change by <b>${esc(who)}</b> · ${esc(fmtWhen(e.at))}${what}${more}</div>` +
      (list.length > 1 ? `<ul class="pen-history" hidden>${rows}</ul>` : "");
  }
  // The banner element markup, prepended to every rendered page.
  function pageEditNote(tabId) {
    const h = pageEditInner(tabId);
    return `<div id="pageEditNote" class="page-edit-note"${h ? "" : " hidden"}>${h}</div>`;
  }
  function wirePageEditNote() {
    const pt = document.querySelector("#pageEditNote .pen-toggle");
    if (pt) pt.onclick = () => {
      const h = document.querySelector("#pageEditNote .pen-history");
      if (h) { h.hidden = !h.hidden; pt.textContent = h.hidden ? `History (${pageEditsFor(currentTab).length})` : "Hide history"; }
    };
  }
  function refreshPageEditNote() {
    const pe = document.getElementById("pageEditNote");
    if (!pe) return;
    const h = pageEditInner(currentTab);
    pe.innerHTML = h;
    pe.hidden = !h;
    wirePageEditNote();
  }

  function authErr(e) {
    const c = (e && e.code) || "";
    if (c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-credential") || c.includes("invalid-email"))
      return "Incorrect email or password.";
    if (c.includes("too-many-requests")) return "Too many attempts — try again later.";
    if (c.includes("network")) return "Network error — check your connection.";
    return (e && e.message) || "Sign-in failed.";
  }

  function showLogin() {
    const s = $("#lockScreen"); if (s) s.style.display = "flex";
    const app = $("#app"); if (app) app.hidden = true;
    ["userPill", "modeToggle", "logoutBtn"].forEach((id) => { const el = document.getElementById(id); if (el) el.hidden = true; });
    const b = $("#lockBtn"); if (b) { b.disabled = false; b.textContent = "Sign in"; }
  }

  function showApp() {
    const s = $("#lockScreen"); if (s) s.style.display = "none";
    const app = $("#app"); if (app) app.hidden = false;
    bootApp();
  }

  function isLocalHost() {
    const h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "" || location.protocol === "file:";
  }

  // Local-only dev fallback so the dashboard is testable without Firebase.
  // Never active on a real host (Firebase loads there). Decrypts with the data
  // password typed in the password field; role via ?role=view|admin.
  function initLocalDev(form, errEl, btn) {
    errEl.textContent = "Local dev mode — Firebase not loaded. Enter the data password.";
    btn.textContent = "Dev sign in";
    const forgot = document.getElementById("forgotLink");
    if (forgot) forgot.hidden = true; // reset email needs Firebase
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.textContent = ""; btn.disabled = true;
      try {
        D = await decryptData($("#lockPass").value || "");
        const role = new URLSearchParams(location.search).get("role");
        userRole = role === "view" ? "view" : "admin";
        perms = { pages: "all", hqs: "all", landing: userRole === "admin", managerInc: userRole === "admin", editPages: userRole === "admin" ? "all" : [] };
        sessionUser = { email: "dev@localhost" };
        showApp();
      } catch (err) {
        errEl.textContent = "Wrong data password."; btn.disabled = false;
      }
    });
  }

  function initAuthGate() {
    const form = $("#lockForm"), errEl = $("#lockError"), btn = $("#lockBtn");
    if (!initFirebase()) {
      if (isLocalHost()) return initLocalDev(form, errEl, btn);
      errEl.textContent = "Could not load Firebase — check your connection and refresh.";
      return;
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errEl.style.color = ""; errEl.textContent = ""; btn.disabled = true; btn.textContent = "Signing in…";
      try {
        await auth.signInWithEmailAndPassword(($("#lockUser").value || "").trim(), $("#lockPass").value || "");
        // onAuthStateChanged finishes the flow
      } catch (err) {
        errEl.style.color = ""; errEl.textContent = authErr(err); btn.disabled = false; btn.textContent = "Sign in";
      }
    });

    // Forgot password → Firebase sends a reset link to the email.
    const forgot = document.getElementById("forgotLink");
    if (forgot) forgot.onclick = async () => {
      const email = ($("#lockUser").value || "").trim();
      errEl.style.color = "";
      if (!email) { errEl.textContent = "Enter your email above, then tap “Forgot password”."; return; }
      forgot.disabled = true;
      try {
        await auth.sendPasswordResetEmail(email);
        errEl.style.color = "var(--good)";
        errEl.textContent = "Reset link sent to " + email + " — check your inbox (and spam).";
      } catch (err) {
        errEl.textContent = authErr(err);
      } finally { forgot.disabled = false; }
    };
    auth.onAuthStateChanged(async (user) => {
      if (!user) { showLogin(); return; }
      try { await loadSession(user); showApp(); }
      catch (err) {
        console.warn("session load", err);
        errEl.textContent = err && err.message === "no-access"
          ? "This account has no access yet. Ask your administrator to add you."
          : "Sign-in problem: " + ((err && err.message) || err);
        try { await auth.signOut(); } catch (e) {}
        showLogin();
      }
    });
  }

  /* ---------------- Admin: user & permission management ---------------- */
  const PERMISSION_PAGES = TABS.filter((t) => t.id !== "admin");
  let editingUid = null; // set while editing an existing user's access
  let editingUserData = null; // the user's existing perms (for scoped merges)

  // Pages the current admin may grant to others (PERMISSION_PAGES subset).
  function adminScopePages() {
    const e = myEditablePages();
    return e === "all" ? PERMISSION_PAGES : PERMISSION_PAGES.filter((t) => e.includes(t.id));
  }

  function renderAdmin() {
    editingUid = null; editingUserData = null;
    const superMode = isSuperAdmin();
    if (!superMode && !isPageAdmin()) return `<div class="section-head"><h1>Admin</h1></div><div class="empty">Administrator access only.</div>`;
    setTimeout(initAdminUI, 0);
    const scope = superMode ? PERMISSION_PAGES : adminScopePages();
    // Super admin: default No access, options depend on chosen role (JS-driven).
    // Page admin: only grants View / No-access for their own pages.
    const accessRows = scope.map((t) =>
      `<label class="chk perm-access-row"><span style="flex:1">${esc(t.label)}</span><select class="perm-access select" data-page="${t.id}">${superMode ? `<option value="edit">Admin</option><option value="view">View</option><option value="none" selected>No access</option>` : `<option value="view" selected>View</option><option value="none">No access</option>`}</select></label>`).join("");
    const hqChecks = D.hqTargets.map((h) => {
      const n = h.title.split("—")[0].trim();
      return `<label class="chk"><input type="checkbox" class="perm-hq" value="${esc(n)}" checked> ${esc(n)}</label>`;
    }).join("");
    const roleField = superMode
      ? `<label class="ord-field"><span>Role</span>
           <select id="auRole" class="select"><option value="view">Viewer — read-only</option><option value="admin">Admin — manages the page(s) you pick</option><option value="superadmin">Super Admin — full access &amp; users</option></select>
         </label>`
      : `<input type="hidden" id="auRole" value="view">`;
    const scopeNote = superMode
      ? `<b>Admin</b> = can edit that page and grant view access to others for it. <b>Viewer</b> = read-only.`
      : `Grant <b>View</b> on the page(s) you administer, or <b>No access</b> to hide it.`;
    return `
      <div class="section-head">
        <h1>${superMode ? "Admin — Users &amp; Access" : "Manage viewers for your pages"}</h1>
        <p>${superMode ? "Create accounts and control which pages and HQs each person can see." : "Add and manage view-only users for the pages you administer. You can add them, edit their access and revoke them."}</p>
      </div>
      <div class="two-col">
        <div class="card">
          <h2 style="margin-top:0">Add ${superMode ? "user" : "viewer"}</h2>
          <form id="addUserForm" class="admin-form" autocomplete="off">
            <label class="ord-field"><span>Email</span><input id="auEmail" type="email" required placeholder="person@primelaze.com"></label>
            <label class="ord-field"><span>${superMode ? "Temp password" : "Set password"}</span><input id="auPass" type="text" required placeholder="min 6 chars"></label>
            ${roleField}
            ${superMode ? `<div id="permExtras"><label class="chk chk-strong"><input type="checkbox" id="auLanding"> Can see landing/cost prices</label>
            <label class="chk chk-strong"><input type="checkbox" id="auMgrInc"> Can see Sales Manager incentives</label></div>` : ""}
            <div class="perm-group" id="permPageGroup"><div class="perm-title">Page access ${superMode ? `<span>
              <button type="button" class="linkish" data-access="all">all</button> ·
              <button type="button" class="linkish" data-access="none">none</button></span>` : ""}</div>
              <div class="perm-grid">${accessRows}</div>
              <div class="muted-note" id="permPageNote" style="margin-top:6px">${scopeNote}</div></div>
            ${superMode ? `<div class="perm-group" id="permHqGroup"><div class="perm-title">HQ access <button type="button" class="linkish" data-all="perm-hq">all/none</button></div><div class="perm-grid">${hqChecks}</div></div>` : ""}
            <div style="display:flex;gap:10px;flex-wrap:wrap"><button type="submit" class="dl-btn" id="auSubmit">Create ${superMode ? "user" : "viewer"}</button><button type="button" class="ghost-btn" id="auCancel" hidden>Cancel edit</button></div>
            <div id="auMsg" class="lock-error" style="min-height:16px"></div>
          </form>
        </div>
        <div class="card">
          <h2 style="margin-top:0">${superMode ? "Existing users" : "Viewers you manage"}</h2>
          <p class="muted-note" style="margin-top:0">${superMode
            ? `Set a password when adding a user. To change it later, click <b>Reset pwd</b> — the user gets an email to choose a new one. (To set an exact password directly, use the Firebase console → Authentication → Users.)`
            : `<b>Every viewer</b> in the system is listed below — including people other admins added. Set your page to <b>View</b> to grant access or <b>No access</b> to remove it. Their access to other pages (set by other admins) stays untouched. Use <b>Reset pwd</b> to email them a new-password link.`}</p>
          <div id="userList"><div class="empty">Loading…</div></div>
        </div>
      </div>
      ${superMode ? `<div class="card" style="margin-top:20px">
        <h2 style="margin-top:0">Activity log</h2>
        <p class="muted-note" style="margin-top:0">Most recent edits (who changed which page, and when). Last ${editsLog.length} shown.</p>
        ${editsLog.length ? `
        <div class="controls">
          <label class="ord-field"><span>User</span><select id="logUserFilter" class="select"><option value="all">All users</option>${Array.from(new Set(editsLog.map((e) => e.by).filter(Boolean))).sort().map((u) => `<option>${esc(u)}</option>`).join("")}</select></label>
          <label class="ord-field"><span>Page</span><select id="logPageFilter" class="select"><option value="all">All pages</option>${Array.from(new Set(editsLog.map((e) => e.tab).filter(Boolean))).sort().map((p) => `<option>${esc(p)}</option>`).join("")}</select></label>
        </div>
        <div class="table-wrap"><table><thead><tr><th>When</th><th>By</th><th>Page</th><th>What changed</th></tr></thead>
          <tbody id="logRows">${editsLog.map((e) => `<tr data-by="${esc(e.by || "")}" data-tab="${esc(e.tab || "")}"><td>${esc(fmtWhen(e.at))}</td><td class="t-name">${esc(e.by || "—")}</td><td>${esc(e.tab || "—")}</td><td>${esc(e.what || "—")}</td></tr>`).join("")}</tbody>
        </table></div>`
          : `<div class="empty">No activity recorded yet.</div>`}
      </div>` : ""}`;
  }

  // Three roles only:
  //  • Super Admin  → full access + user management.
  //  • Admin        → administers the selected page(s): edit them + grant view
  //                   access to others for them. Stored as role "view" + editPages.
  //  • Viewer       → read-only on the selected page(s).
  function collectPerms() {
    const gc = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    const access = {};
    document.querySelectorAll(".perm-access").forEach((s) => { access[s.dataset.page] = s.value; });
    const N = PERMISSION_PAGES.length;
    const hqs = Array.from(document.querySelectorAll(".perm-hq:checked")).map((c) => c.value);
    const hasHqGrid = document.querySelector(".perm-hq") != null;
    const hqVal = hasHqGrid ? (hqs.length === D.hqTargets.length ? "all" : hqs) : "all";
    const roleEl = document.getElementById("auRole");
    const roleVal = roleEl ? roleEl.value : "view";

    if (roleVal === "superadmin" && isSuperAdmin()) {
      return { role: "superadmin", landing: true, managerInc: true, pages: "all", hqs: "all", editPages: "all" };
    }
    if (roleVal === "admin" && isSuperAdmin()) {
      const adminPages = PERMISSION_PAGES.filter((t) => access[t.id] === "edit").map((t) => t.id);
      const all = adminPages.length === N;
      return { role: "view", landing: gc("auLanding"), managerInc: gc("auMgrInc"),
        pages: all ? "all" : adminPages, hqs: hqVal, editPages: all ? "all" : adminPages };
    }
    // Viewer (also the only role a page admin can create)
    const viewPages = PERMISSION_PAGES.filter((t) => access[t.id] === "view" || access[t.id] === "edit").map((t) => t.id);
    const all = viewPages.length === N;
    return { role: "view", landing: gc("auLanding"), managerInc: gc("auMgrInc"),
      pages: all ? "all" : viewPages, hqs: hqVal, editPages: [] };
  }

  // Show/hide + relabel the page grid to match the chosen role.
  function updateAddUserRoleUI() {
    const roleSel = document.getElementById("auRole");
    if (!roleSel) return;
    const role = roleSel.value;
    const isSuperSel = role === "superadmin";
    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? "" : "none"; };
    show("permPageGroup", !isSuperSel);
    show("permExtras", !isSuperSel);
    show("permHqGroup", !isSuperSel);
    document.querySelectorAll(".perm-access").forEach((sel) => {
      const cur = sel.value;
      const opts = role === "admin" ? [["edit", "Admin"], ["none", "No access"]] : [["view", "View"], ["none", "No access"]];
      const keep = opts.some(([v]) => v === cur) ? cur : "none";
      sel.innerHTML = opts.map(([v, l]) => `<option value="${v}"${v === keep ? " selected" : ""}>${l}</option>`).join("");
    });
    const note = document.getElementById("permPageNote");
    if (note) note.innerHTML = isSuperSel
      ? "<b>Super Admin</b> has full access to every page and manages users — no page selection needed."
      : (role === "admin"
        ? "Tick the page(s) this admin manages — they can edit those pages and grant view access to others for them."
        : "Tick the page(s) this viewer can see (read-only).");
  }

  // Merge a page admin's edits (only their scoped pages) onto a viewer's
  // existing perms, so pages they don't administer are left untouched. Edit
  // grants, HQ, landing and manager-incentive flags are never changed here.
  function mergeScopedViewerPerms(prev, next, scope) {
    const ALL = PERMISSION_PAGES.map((t) => t.id);
    const asList = (v) => (v === "all" ? ALL.slice() : (Array.isArray(v) ? v.slice() : []));
    const inScope = scope === "all" ? ALL : scope;
    const prevPages = asList(prev.pages);
    const nextPages = asList(next.pages);
    const kept = prevPages.filter((p) => !inScope.includes(p));      // outside my control
    const granted = nextPages.filter((p) => inScope.includes(p));     // my decisions
    const pages = Array.from(new Set(kept.concat(granted)));
    return {
      role: "view",
      landing: !!prev.landing,
      managerInc: !!prev.managerInc,
      pages: pages.length === ALL.length ? "all" : pages,
      hqs: prev.hqs || "all",
      editPages: prev.editPages || [],
    };
  }

  // Load an existing user's access into the form for editing.
  function fillUserForm(u, uid) {
    editingUid = uid;
    editingUserData = u;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const chk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
    const emailEl = document.getElementById("auEmail");
    if (emailEl) { emailEl.value = u.email || ""; emailEl.readOnly = true; }
    const pagesAll = u.pages === "all", editAll = u.editPages === "all";
    const pagesList = Array.isArray(u.pages) ? u.pages : [], editList = Array.isArray(u.editPages) ? u.editPages : [];
    // Map stored perms → one of the 3 UI roles.
    const uiRole = u.role === "superadmin" ? "superadmin"
      : (u.role === "admin" || editAll || editList.length) ? "admin"
      : "view";
    set("auRole", uiRole);
    updateAddUserRoleUI(); // rebuild grid options for this role BEFORE setting values
    chk("auLanding", u.landing); chk("auMgrInc", u.managerInc);
    document.querySelectorAll(".perm-access").forEach((s) => {
      const id = s.dataset.page;
      let val = "none";
      if (uiRole === "admin") val = (editAll || editList.includes(id)) ? "edit" : "none";
      else if (uiRole === "view") val = (pagesAll || pagesList.includes(id)) ? "view" : "none";
      if (Array.from(s.options).some((o) => o.value === val)) s.value = val;
    });
    const hqsAll = u.hqs === "all", hqList = Array.isArray(u.hqs) ? u.hqs : [];
    document.querySelectorAll(".perm-hq").forEach((c) => { c.checked = hqsAll || hqList.includes(c.value); });
    const passEl = document.getElementById("auPass");
    if (passEl) { passEl.required = false; passEl.value = ""; const f = passEl.closest(".ord-field"); if (f) f.style.display = "none"; }
    const sub = document.getElementById("auSubmit"); if (sub) sub.textContent = "Save changes";
    const cancel = document.getElementById("auCancel"); if (cancel) cancel.hidden = false;
    const msg = document.getElementById("auMsg"); if (msg) { msg.style.color = "var(--text-2)"; msg.textContent = "Editing " + (u.email || "") + " — change access, then Save."; }
    const form = document.getElementById("addUserForm"); if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function adminUpdateUser(uid, docData) {
    await db.collection("users").doc(uid).set(docData, { merge: true });
  }

  async function adminCreateUser(email, pass, docData) {
    // use a throwaway secondary app so creating the user doesn't sign the admin out
    const sec = firebase.initializeApp(window.FIREBASE_CONFIG, "sec-" + Math.floor(performance.now()));
    try {
      let uid;
      try {
        const cred = await sec.auth().createUserWithEmailAndPassword(email, pass);
        uid = cred.user.uid;
      } catch (err) {
        // The Auth account already exists (e.g. a previously-revoked user, or
        // an account from another app in this project). Revoke only deletes the
        // Firestore doc, not the Auth login — so re-grant by signing in with the
        // password to get the uid and (re)writing the permission doc.
        if (err && err.code === "auth/email-already-in-use") {
          try {
            const cred = await sec.auth().signInWithEmailAndPassword(email, pass);
            uid = cred.user.uid;
          } catch (e2) {
            throw new Error("This email already has an account. Enter that account's current password to re-grant access (or send a password reset first).");
          }
        } else throw err;
      }
      await db.collection("users").doc(uid).set({ email: email.toLowerCase(), ...docData });
      try { await sec.auth().signOut(); } catch (e) {}
    } finally { try { await sec.delete(); } catch (e) {} }
  }

  async function initAdminUI() {
    document.querySelectorAll("[data-all]").forEach((b) => {
      b.onclick = () => {
        const boxes = document.querySelectorAll("." + b.dataset.all);
        const anyOff = Array.from(boxes).some((x) => !x.checked);
        boxes.forEach((x) => (x.checked = anyOff));
      };
    });
    document.querySelectorAll("[data-access]").forEach((b) => {
      b.onclick = () => {
        const role = (document.getElementById("auRole") || {}).value || "view";
        const val = b.dataset.access === "all" ? (role === "admin" ? "edit" : "view") : "none";
        document.querySelectorAll(".perm-access").forEach((s) => { if (Array.from(s.options).some((o) => o.value === val)) s.value = val; });
      };
    });
    const roleSel = document.getElementById("auRole");
    if (roleSel) roleSel.onchange = () => updateAddUserRoleUI();
    updateAddUserRoleUI(); // sync grid to the initial role
    const luf = document.getElementById("logUserFilter"), lpf = document.getElementById("logPageFilter");
    const applyLogFilter = () => {
      const u = luf ? luf.value : "all", p = lpf ? lpf.value : "all";
      document.querySelectorAll("#logRows tr").forEach((tr) => {
        const show = (u === "all" || tr.dataset.by === u) && (p === "all" || tr.dataset.tab === p);
        tr.style.display = show ? "" : "none";
      });
    };
    if (luf) luf.onchange = applyLogFilter;
    if (lpf) lpf.onchange = applyLogFilter;
    const cancelBtn = document.getElementById("auCancel");
    if (cancelBtn) cancelBtn.onclick = () => go("admin"); // reset the form to create mode
    const form = document.getElementById("addUserForm");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const msg = document.getElementById("auMsg"), sub = document.getElementById("auSubmit");
      const editing = !!editingUid;
      msg.style.color = ""; msg.textContent = ""; sub.disabled = true; sub.textContent = editing ? "Saving…" : "Creating…";
      try {
        if (editing) {
          let perms2 = collectPerms();
          // A page admin's form only shows their own pages — merge so a user's
          // access to pages OUTSIDE that scope (managed by others) is preserved.
          if (!isSuperAdmin() && editingUserData) perms2 = mergeScopedViewerPerms(editingUserData, perms2, myEditablePages());
          const em = (document.getElementById("auEmail").value || "").trim().toLowerCase();
          if (em === String(window.BOOTSTRAP_ADMIN_EMAIL || "").toLowerCase()) { perms2.role = "superadmin"; perms2.editPages = "all"; perms2.pages = "all"; perms2.hqs = "all"; }
          await adminUpdateUser(editingUid, perms2);
          editingUid = null; editingUserData = null;
          msg.style.color = "var(--good)"; msg.textContent = "Access updated ✓";
          go("admin");
          return;
        }
        const email = document.getElementById("auEmail").value.trim();
        const pass = document.getElementById("auPass").value;
        await adminCreateUser(email, pass, collectPerms());
        msg.style.color = "var(--good)"; msg.textContent = "User created ✓";
        form.reset();
        document.querySelectorAll(".perm-hq").forEach((c) => (c.checked = true));
        document.querySelectorAll(".perm-access").forEach((s) => (s.value = "view"));
        loadUserList();
      } catch (err) {
        msg.style.color = "var(--bad)"; msg.textContent = authErr(err);
      } finally { sub.disabled = false; sub.textContent = editingUid ? "Save changes" : (isSuperAdmin() ? "Create user" : "Create viewer"); }
    };
    loadUserList();
  }

  // Full, readable access breakdown for one user (shown by the "View" toggle).
  function userAccessDetail(u) {
    const role = u.role || "view";
    const isAdm = role === "admin" || role === "superadmin";
    const editAll = u.editPages === "all", pagesAll = u.pages === "all";
    const editList = Array.isArray(u.editPages) ? u.editPages : [];
    const pagesList = Array.isArray(u.pages) ? u.pages : [];
    const pageRows = PERMISSION_PAGES.map((t) => {
      let lvl, cls;
      if (isAdm || editAll || editList.includes(t.id)) { lvl = "Admin"; cls = "b-good"; }
      else if (pagesAll || pagesList.includes(t.id)) { lvl = "View"; cls = "b-info"; }
      else { lvl = "No access"; cls = "b-neutral"; }
      return `<div class="ua-row"><span>${esc(t.label)}</span><span class="badge ${cls}">${lvl}</span></div>`;
    }).join("");
    const canAdmin = role === "superadmin";
    const hqs = u.hqs === "all" ? "All HQs" : ((u.hqs || []).length ? (u.hqs || []).join(", ") : "None");
    return `<div class="ua-detail">
      <div class="ua-title">Page access</div>
      <div class="ua-grid">${pageRows}</div>
      <div class="ua-meta"><b>HQ access:</b> ${esc(hqs)}</div>
      <div class="ua-meta"><b>Landing / cost prices:</b> ${u.landing ? "Yes" : "No"} &nbsp;·&nbsp; <b>Manager incentives:</b> ${u.managerInc ? "Yes" : "No"}</div>
      <div class="ua-meta"><b>User management:</b> ${canAdmin ? "Yes (Super Admin)" : "No"}</div>
    </div>`;
  }

  // A page admin grants/removes VIEW access to one of THEIR pages for a viewer,
  // leaving every other page (granted by other admins) untouched.
  async function pageAdminSetAccess(uid, permsJson, pageId, level, sel) {
    let prev; try { prev = JSON.parse(permsJson); } catch (e) { return; }
    const ALL = PERMISSION_PAGES.map((t) => t.id);
    let pages = prev.pages === "all" ? ALL.slice() : (Array.isArray(prev.pages) ? prev.pages.slice() : []);
    if (level === "view") { if (!pages.includes(pageId)) pages.push(pageId); }
    else { pages = pages.filter((p) => p !== pageId); }
    const newPerms = {
      role: "view",
      landing: !!prev.landing,
      managerInc: !!prev.managerInc,
      pages: pages.length === ALL.length ? "all" : pages,
      hqs: prev.hqs || "all",
      editPages: prev.editPages || [],
    };
    if (sel) sel.disabled = true;
    try { await adminUpdateUser(uid, newPerms); await loadUserList(); }
    catch (e) { window.alert("Could not update access: " + (e.message || e)); if (sel) sel.disabled = false; }
  }

  // Page-admin viewer manager: lists ALL viewers (created by any admin) and lets
  // this admin toggle view access to their own page(s) only.
  function renderPageAdminUserList(box, snap) {
    const scopeAll = myEditablePages();
    const scopePages = scopeAll === "all" ? PERMISSION_PAGES : PERMISSION_PAGES.filter((t) => scopeAll.includes(t.id));
    const scopeIds = scopePages.map((t) => t.id);
    const selfUid = sessionUser && sessionUser.uid;
    const rows = [];
    snap.forEach((doc) => {
      const u = doc.data();
      if (u.role === "admin" || u.role === "superadmin") return; // only view users
      if (doc.id === selfUid) return;
      const hasPage = (pid) => u.pages === "all" || (Array.isArray(u.pages) && u.pages.includes(pid)) || u.editPages === "all" || (Array.isArray(u.editPages) && u.editPages.includes(pid));
      const permsJson = esc(JSON.stringify({ email: u.email || "", role: "view", landing: !!u.landing, managerInc: !!u.managerInc, pages: u.pages || [], hqs: u.hqs || [], editPages: u.editPages || [] }));
      const cells = scopePages.map((t) => {
        const has = hasPage(t.id);
        return `<td><select class="pa-access select" data-uid="${doc.id}" data-page="${t.id}" data-perms="${permsJson}" style="max-width:150px"><option value="view"${has ? " selected" : ""}>View</option><option value="none"${!has ? " selected" : ""}>No access</option></select></td>`;
      }).join("");
      const otherPages = PERMISSION_PAGES.filter((t) => !scopeIds.includes(t.id) && hasPage(t.id)).map((t) => t.label);
      const otherCell = `<td class="t-muted">${otherPages.length ? esc(otherPages.join(", ")) : "—"}</td>`;
      const pwdCell = `<td style="white-space:nowrap"><button class="ghost-btn u-pwd" data-email="${esc(u.email || "")}">Reset pwd</button></td>`;
      rows.push(`<tr><td class="t-name">${esc(u.email || "—")}</td>${cells}${otherCell}${pwdCell}</tr>`);
    });
    box.innerHTML = rows.length
      ? table(["Viewer", ...scopePages.map((t) => t.label), "Other access", ""].map((h) => `<th>${esc(h)}</th>`).join(""), rows.join(""))
      : `<div class="empty">No viewers yet. Use “Add viewer” on the left to create one, then grant page access here.</div>`;
    box.querySelectorAll(".pa-access").forEach((sel) => {
      sel.onchange = () => pageAdminSetAccess(sel.dataset.uid, sel.dataset.perms, sel.dataset.page, sel.value, sel);
    });
    box.querySelectorAll(".u-pwd").forEach((b) => {
      b.onclick = async () => {
        const email = b.dataset.email; if (!email) return;
        if (!window.confirm("Send a password-reset email to " + email + "?\n\nThey'll get a link to set a new password themselves.")) return;
        const orig = b.textContent; b.disabled = true; b.textContent = "Sending…";
        try { await auth.sendPasswordResetEmail(email); window.alert("Reset link sent to " + email + " ✓"); }
        catch (e) { window.alert("Could not send reset email: " + (e.message || e)); }
        finally { b.disabled = false; b.textContent = orig; }
      };
    });
  }

  async function loadUserList() {
    const box = document.getElementById("userList");
    if (!box) return;
    try {
      const snap = await db.collection("users").get();
      const rows = [];
      const superMode = isSuperAdmin();
      if (!superMode) { renderPageAdminUserList(box, snap); return; }
      snap.forEach((doc) => {
        const u = doc.data();
        const isAdm = u.role === "admin" || u.role === "superadmin";
        const editN = u.editPages === "all" ? "all" : (u.editPages || []).length;
        const scope = [
          isAdm ? "all pages" : (u.pages === "all" ? "all pages" : ((u.pages || []).length + " pages")),
          isAdm ? "edits all" : (editN === "all" || editN > 0 ? "edits " + editN : "view-only"),
          u.hqs === "all" ? "all HQs" : ((u.hqs || []).length + " HQs"),
          u.landing ? "landing✓" : "no-landing",
          u.managerInc ? "mgr-inc✓" : "no-mgr-inc",
        ].join(" · ");
        // A view user with edit rights on page(s) is a "page admin" — label it
        // by the page(s) they administer (e.g. "Inventory admin", "Demo admin").
        const editList = u.editPages === "all" ? "all" : (Array.isArray(u.editPages) ? u.editPages : []);
        let roleLabel, roleCls;
        if (u.role === "superadmin") { roleLabel = "super admin"; roleCls = "b-good"; }
        else if (u.role === "admin") { roleLabel = "admin"; roleCls = "b-good"; }
        else if (editList === "all") { roleLabel = "page admin (all)"; roleCls = "b-info"; }
        else if (editList.length) {
          const names = editList.map((id) => (PERMISSION_PAGES.find((t) => t.id === id) || {}).label || id);
          roleLabel = names.join(" + ") + " admin"; roleCls = "b-info";
        } else { roleLabel = "view"; roleCls = "b-neutral"; }
        const permsJson = esc(JSON.stringify({ email: u.email || "", role: u.role || "view", landing: !!u.landing, managerInc: !!u.managerInc, pages: u.pages || [], hqs: u.hqs || [], editPages: u.editPages || [] }));
        rows.push(`<tr>
          <td class="t-name">${esc(u.email || "—")}</td>
          <td><span class="badge ${roleCls}">${esc(roleLabel)}</span></td>
          <td class="t-muted">${esc(scope)}</td>
          <td style="white-space:nowrap"><button class="ghost-btn u-view" data-uid="${doc.id}">View</button> <button class="ghost-btn u-edit" data-uid="${doc.id}" data-perms="${permsJson}">Edit</button> <button class="ghost-btn u-pwd" data-email="${esc(u.email || "")}">Reset pwd</button> <button class="ghost-btn danger u-del" data-uid="${doc.id}" data-email="${esc(u.email || "")}">Revoke</button></td>
        </tr>
        <tr class="ua-tr" data-uid="${doc.id}" hidden><td colspan="4">${userAccessDetail(u)}</td></tr>`);
      });
      box.innerHTML = rows.length
        ? table(["User", "Role", "Access", ""].map((h) => `<th>${h}</th>`).join(""), rows.join(""))
        : `<div class="empty">No users yet.</div>`;
      box.querySelectorAll(".u-view").forEach((b) => {
        b.onclick = () => {
          const det = box.querySelector('.ua-tr[data-uid="' + b.dataset.uid + '"]');
          if (det) { det.hidden = !det.hidden; b.textContent = det.hidden ? "View" : "Hide"; }
        };
      });
      box.querySelectorAll(".u-edit").forEach((b) => {
        b.onclick = () => { try { fillUserForm(JSON.parse(b.dataset.perms), b.dataset.uid); } catch (e) {} };
      });
      box.querySelectorAll(".u-pwd").forEach((b) => {
        b.onclick = async () => {
          const email = b.dataset.email;
          if (!email) return;
          if (!window.confirm("Send a password-reset email to " + email + "?\n\nThey'll get a link to set a new password themselves. (To set a specific password directly, use the Firebase console.)")) return;
          const orig = b.textContent; b.disabled = true; b.textContent = "Sending…";
          try { await auth.sendPasswordResetEmail(email); window.alert("Reset link sent to " + email + " ✓"); }
          catch (e) { window.alert("Could not send reset email: " + (e.message || e)); }
          finally { b.disabled = false; b.textContent = orig; }
        };
      });
      box.querySelectorAll(".u-del").forEach((b) => {
        b.onclick = async () => {
          if (b.dataset.email.toLowerCase() === String(window.BOOTSTRAP_ADMIN_EMAIL || "").toLowerCase()) {
            window.alert("The bootstrap admin can't be revoked here."); return;
          }
          if (!window.confirm("Revoke access for " + b.dataset.email + "?\n\nThis removes their permissions from the database only. Their login still exists — to re-grant later, use Add user with the same email (enter their password to re-link).")) return;
          try { await db.collection("users").doc(b.dataset.uid).delete(); loadUserList(); }
          catch (e) { window.alert("Could not revoke: " + (e.message || e)); }
        };
      });
    } catch (e) {
      box.innerHTML = `<div class="empty">Could not load users (${esc(e.message || "" + e)}).</div>`;
    }
  }

  // boot: theme applies immediately; Firebase drives access.
  initTheme();
  initAuthGate();
})();
