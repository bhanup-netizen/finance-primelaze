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
  let auth = null, db = null, storage = null; // firebase handles

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
    { id: "leads", label: "Casovil Leads", group: "Sales", render: renderLeads },
    { id: "targets", label: "HQ Targets", group: "Sales", render: renderTargets },
    { id: "incentives", label: "Incentives", group: "Sales", render: renderIncentives },
    { id: "prices", label: "Pricing", group: "Catalog", render: renderPricing },
    { id: "order", label: "Inventory", group: "Operations", render: renderOrder },
    { id: "demo", label: "Demo Machines", group: "Operations", render: renderDemo },
    { id: "challan", label: "Delivery Challan", group: "Operations", render: renderChallan },
    { id: "payments", label: "Outstanding Payment", group: "Records", render: renderPayments },
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
  let teamFilter = "all", teamSearch = "", teamDivision = "all", teamTab = "roster", orgDept = "Sales", orgSalesDiv = "Derma";
  let orgTop = { name: "CTO", title: "Chief — position vacant", empId: "" }; // editable top node
  let orgNsm = { name: "Arjun", desig: "National Sales Manager", empId: "" };  // editable NSM node
  let orgEditId = null; // which card is currently open for editing ("aid:x"/"num:n"/"nsm"/"cto")
  const rosterEdits = {}; // `${num}#${field}` -> value
  const rosterAdds = [];  // [{_aid, name, designation, division, baseHQ, reportsTo, zone}]
  let rosterAddSeq = 0;
  const customHQs = [];   // admin-added base-HQ cities
  const customDesignations = []; // admin-added designations/roles
  const rosterRemovals = []; // nums of original roster people deleted by admin
  // Uploaded KRA docs per position, keyed by card id ("aid:xx" / "num:xx").
  // Value: { name, url, path, size, at, by }. File bytes live in Firebase Storage.
  const kraFiles = {};
  // One-time seed: Service team org (Dhinesh = Service Director under the CEO).
  // Added to the roster on first admin load, de-duplicated by employee number.
  const SEED_SERVICE_TEAM = [
    { empId: "PLM001", name: "Dhinesh Ramalingam", designation: "Service Director", reportsTo: "CTO", dept: "Service" },
    { empId: "PLM0029", name: "Akash Anbarasan", designation: "Service Engineer", reportsTo: "Dhinesh Ramalingam", dept: "Service" },
    { empId: "PLM0013", name: "Avinesh Periyasamy", designation: "Service Manager", reportsTo: "Dhinesh Ramalingam", dept: "Service" },
    { empId: "PLM0025", name: "Balaji Balu B", designation: "Service Technician", reportsTo: "Dhinesh Ramalingam", dept: "Service" },
    { empId: "PLM0031", name: "Pankaj Verma", designation: "Service Engineer", reportsTo: "Dhinesh Ramalingam", dept: "Service" },
    { empId: "PLM0062", name: "Santhosh Kumar R", designation: "Service Engineer", reportsTo: "Dhinesh Ramalingam", dept: "Service" },
    { empId: "PLM0063", name: "Sonal Swapnil Lad", designation: "Finance Manager", reportsTo: "Dhinesh Ramalingam", dept: "Finance" },
    { empId: "PLM0104", name: "SumithraDevi", designation: "Admin Assistant", reportsTo: "Dhinesh Ramalingam", dept: "Service" },
    { empId: "PLM0098", name: "Viisvesh S", designation: "Junior Accounts Executive", reportsTo: "Sonal Swapnil Lad", dept: "Finance" },
    // Support & marketing staff reporting to Arjun (Sales Director), per the org chart.
    { empId: "PLM0003", name: "Ayush Sharma", designation: "Admin Manager", reportsTo: "Arjun", dept: "Admin" },
    { empId: "PLM0113", name: "Vikas Parouha", designation: "Sales Project Manager", reportsTo: "Arjun", dept: "Sales" },
    { empId: "PLM0100", name: "Sandeepika Bhardwaj", designation: "Human Resource Manager", reportsTo: "Arjun", dept: "HR" },
    { empId: "PLM0044", name: "Akshay Dahiya", designation: "Graphic Designer", reportsTo: "Arjun", dept: "Marketing" },
    { empId: "PLM0054", name: "Rashmi Jadli", designation: "Graphic Designer", reportsTo: "Arjun", dept: "Marketing" },
    { empId: "PLM103", name: "Avedan Sharma", designation: "Program Manager", reportsTo: "Arjun", dept: "Marketing" },
    { empId: "PLM0094", name: "Brajeshkumar Veeramuthu", designation: "Sales Executive", reportsTo: "Arjun", baseHQ: "Chennai", dept: "Sales" },
    { empId: "PLM0116", name: "Ashutosh Galge", designation: "Trainee", reportsTo: "Ms. Lubdha", division: "Salon/Spa", dept: "Sales" },
  ];
  // Employee numbers for existing base-roster people, matched by exact name.
  const EMP_ID_BY_NAME = {
    "Akshay Jain": "PLM0096", "Ambika Anand": "PLM0041", "Ibrahim": "PLM0006",
    "Ms. Lubdha": "PLM0112", "Vamshi Krishna": "PLM0102", "Sandeep Kukadiya": "PLM0004",
    "Sushma S": "PLM0105", "D. Siva": "PLM0115", "Bimal Kumar": "PLM0090", "Naresh Chaudhary": "PLM0101",
  };
  // Employee numbers to drop from any earlier seed (people the user asked to ignore).
  const SEED_REMOVE_EMPIDS = new Set(["PLM0014", "LHR0011", "LHR0007"]); // Bala; Harshita; Manjot
  // People to remove by exact name (base roster rows the user asked to delete).
  const SEED_REMOVE_NAMES = new Set(["Ranjith"]);
  // Bump whenever the seed definitions above change so the reconcile re-applies once.
  const SEED_VERSION = 3;
  let seedVersion = 0; // last applied seed version, restored from the edits doc
  function seedServiceTeam() {
    if (!(roleIsAdmin() || hasAnyEditGrant())) return; // only writers seed + persist
    let changed = 0;
    // Drop ignored people that a previous seed may have added.
    for (let i = rosterAdds.length - 1; i >= 0; i--) {
      if (SEED_REMOVE_EMPIDS.has(String(rosterAdds[i].empId || "").toUpperCase())
        || SEED_REMOVE_NAMES.has(String(rosterAdds[i].name || "").trim())) { rosterAdds.splice(i, 1); changed++; }
    }
    // Remove named base-roster people (via rosterRemovals, keyed by num).
    (D.roster.people || []).forEach((p) => {
      if (SEED_REMOVE_NAMES.has(String(p.name || "").trim()) && !rosterRemovals.includes(p.num)) { rosterRemovals.push(p.num); changed++; }
    });
    const have = new Set(roster().map((p) => String(rval(p, "empId") || "").toUpperCase()).filter(Boolean));
    SEED_SERVICE_TEAM.forEach((s) => {
      if (have.has(s.empId.toUpperCase())) return;
      rosterAdds.push({ _aid: "r" + (rosterAddSeq++), name: s.name, designation: s.designation, division: s.division || "Derma", dept: s.dept || "Sales", baseHQ: s.baseHQ || "", reportsTo: s.reportsTo, zone: "", status: "active", empId: s.empId });
      changed++;
    });
    // When the seed definitions change (SEED_VERSION bumped), reconcile already-
    // seeded rows ONCE — updates designation/reporting/etc. without clobbering
    // later manual edits (which happen at the same or a newer seed version).
    if (seedVersion < SEED_VERSION) {
      SEED_SERVICE_TEAM.forEach((s) => {
        const rp = rosterAdds.find((x) => String(x.empId || "").toUpperCase() === s.empId.toUpperCase());
        if (!rp) return;
        const want = { name: s.name, designation: s.designation, reportsTo: s.reportsTo, division: s.division || "Derma", dept: s.dept || "Sales", baseHQ: s.baseHQ || "" };
        Object.keys(want).forEach((k) => { if (rp[k] !== want[k]) { rp[k] = want[k]; changed++; } });
      });
      seedVersion = SEED_VERSION;
      changed++;
    }
    // Attach employee numbers to existing people (base rows via rosterEdits).
    roster().forEach((p) => {
      const nm = String(rval(p, "name") || "").trim();
      const code = EMP_ID_BY_NAME[nm];
      if (!code || String(rval(p, "empId") || "").trim()) return;
      if (p._aid != null) { const rp = rosterAdds.find((x) => x._aid === p._aid); if (rp) rp.empId = code; }
      else rosterEdits[p.num + "#empId"] = code;
      changed++;
    });
    // Arjun (NSM node) → Sales Director with employee number PLM007.
    if (orgNsm.desig !== "Sales Director" || !orgNsm.empId) {
      if (!orgNsm.name || orgNsm.name === "Arjun") orgNsm.name = "Arjun Sharma";
      orgNsm.desig = "Sales Director";
      if (!orgNsm.empId) orgNsm.empId = "PLM007";
      changed++;
    }
    if (changed) saveEdits("Applied org-chart update (" + changed + ")");
  }

  // People fields (demo machines, outstanding payments) carry messy short/
  // misspelled names. Map each known variant (lower-cased) to the proper name.
  const PERSON_NAME_FIX = {
    "avinesh": "Avinesh Periyasamy", "avinesh periyasamy": "Avinesh Periyasamy",
    "ibrahim": "Ibrahim", "ibrahim mohamad": "Ibrahim",
    "ayush": "Ayush Sharma", "ayush sharma": "Ayush Sharma",
    "sandeep": "Sandeep Kukadiya", "sandeep sir": "Sandeep Kukadiya", "sandeep kumar dhirajlal kukadiya": "Sandeep Kukadiya",
    "ramandeep": "Ramandeep Kaur", "ramandeep kaur": "Ramandeep Kaur",
    "brajesh": "Brajeshkumar Veeramuthu", "brajeshkumar veeramuthu": "Brajeshkumar Veeramuthu",
    "brajesh kumar": "Brajeshkumar Veeramuthu", "brajeshkumar": "Brajeshkumar Veeramuthu", "brijesh": "Brajeshkumar Veeramuthu",
    "dhinesh ramalingam": "Dhinesh Ramalingam",
    "akshay jain": "Akshay Jain",
    "lubdha dangle": "Ms. Lubdha", "lubdha": "Ms. Lubdha",
    "ambika": "Ambika Anand", "ambika anand": "Ambika Anand",
    "dhinesh": "Dhinesh Ramalingam",
    "mr. arjun": "Arjun Sharma", "arjun": "Arjun Sharma",
    "sushma": "Sushma S",
    "vamsi": "Vamshi Krishna", "vamsi arudra": "Vamshi Krishna",
    "naresh": "Naresh Chaudhary", "bimal": "Bimal Kumar",
    // Kuldeep resigned — reassign everything from him to Akshay Jain.
    "kudeep": "Akshay Jain", "kuldeep": "Akshay Jain", "kuldeep singh": "Akshay Jain",
    // Puneet's sales are credited to Primelaze direct (PLM).
    "puneet": "PLM",
  };
  // Lookup key: lower-case, single-spaced, honorifics stripped (Mr./Dr./…,
  // trailing sir/ji) so "Dhinesh sir", "Brajesh  Kumar", "Mr. Arjun" all collapse.
  const personFixKey = (n) => {
    let key = String(n == null ? "" : n).trim().toLowerCase().replace(/\s+/g, " ");
    return key.replace(/^(mr|mr\.|dr|dr\.|ms|ms\.|mrs|mrs\.|shri)\s+/, "")
              .replace(/[\s,]+(sir|ji|madam|mam|ma'am)\.?$/, "").trim();
  };
  // Proper roster name for a person value ("PLM" and unknowns pass through).
  const properPersonName = (n) => PERSON_NAME_FIX[personFixKey(n)] || String(n == null ? "" : n).trim();
  // Person-name column indices per demo view (Manager / Salesperson / Confirmed-by).
  const DEMO_NAME_COLS = { current: [5], status: [5, 6], movement: [], packing: [] };
  function seedDemoNames() {
    if (!(roleIsAdmin() || hasAnyEditGrant())) return;
    if (!D || !D.demoMachines) return;
    let changed = 0;
    Object.keys(DEMO_NAME_COLS).forEach((view) => {
      const t = D.demoMachines[view];
      if (!t || !Array.isArray(t.rows)) return;
      demoEdits[view] = demoEdits[view] || {};
      t.rows.forEach((row, r) => {
        DEMO_NAME_COLS[view].forEach((ci) => {
          const key = r + "#" + ci;
          const cur = demoEdits[view][key] != null ? demoEdits[view][key] : row[ci];
          const proper = PERSON_NAME_FIX[personFixKey(cur)];
          if (proper && proper !== cur) { demoEdits[view][key] = proper; changed++; }
        });
      });
    });
    if (changed) saveEdits("Demo names normalized (" + changed + ")");
  }
  // Prompt + target list for the "＋ Add new…" option, keyed by roster field.
  const customListFor = (field) =>
    field === "designation"
      ? { label: "Add new designation / role:", list: customDesignations }
      : { label: "Add new HQ (city):", list: customHQs };
  const DIVISIONS = ["Derma", "Salon/Spa"];
  // Display names (internal values kept for stored data compatibility).
  const DIV_LABELS = { "Derma": "Primelaze", "Salon/Spa": "Casovil" };
  const divLabel = (v) => DIV_LABELS[v] || v || "";
  // Org-chart departments (tabs). People with no explicit dept default to Sales.
  const ORG_DEPTS = ["Sales", "Marketing", "Admin", "HR", "Service", "Finance"];
  const deptOf = (p) => (rval(p, "dept") || "").trim() || "Sales";
  // Fixed sales zones — Zone is chosen from this list (City stays free text).
  const ZONES = ["North1", "North2", "East+NE", "West", "South"];
  // Non-sales staff (Marketing/Admin/HR/Service/Finance) use location options.
  const NONSALES_ZONES = ["WFH", "Zirakpur", "Pondicherry"];
  const zonesFor = (dept) => (dept === "Sales" ? ZONES : NONSALES_ZONES);
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
  // Hiring pipeline status for a vacancy; "hired" moves the row to Team Roster.
  const VAC_STATUS = [
    { id: "notstarted", label: "Not yet started", cls: "b-neutral" },
    { id: "inprogress", label: "In progress", cls: "b-info" },
    { id: "offered", label: "Offered", cls: "b-warn" },
    { id: "hired", label: "Hired", cls: "b-good" },
  ];
  const vacancyEdits = {}; // `${vkey}` -> { priority, remark, fillBy, vstatus }
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

  // Build the reporting-hierarchy tree from Reports-To + designation data,
  // filtered to one department tab (Sales / Marketing / Admin / HR / Service / Finance).
  function renderOrgChart(deptFilter) {
    deptFilter = deptFilter || "Sales";
    const ed = isAdmin();
    const CTO = (orgTop.name || "CTO").trim() || "CTO";
    const NSM = (orgNsm.name || "Arjun").trim() || "Arjun";
    const isCto = (r) => /^cto$/i.test(r) || r === CTO;
    const all = roster()
      .filter((p) => deptOf(p) === deptFilter)
      // Sales is additionally split by division (Primelaze / Casovil).
      .filter((p) => deptFilter !== "Sales" || (rval(p, "division") || "Derma") === orgSalesDiv)
      .map((p) => ({
      _aid: p._aid, num: p.num,
      name: (rval(p, "name") || "").trim(),
      desig: rval(p, "designation") || "",
      rep: (rval(p, "reportsTo") || "").trim(),
      hq: rval(p, "baseHQ") || "",
      zone: rval(p, "zone") || "",
      div: rval(p, "division") || "Derma",
      dept: deptOf(p),
      empId: rval(p, "empId") || "",
      st: estatus(p),
    })).filter((x) => x.name && x.st !== "vacant"); // vacant seats live on the Vacancies tab, not the chart
    const byName = {}; all.forEach((x) => { byName[x.name] = x; });
    const childrenOf = (mgr) => all.filter((x) => x.rep === mgr && x.name !== mgr)
      .sort((a, b) => orgRank(a.desig) - orgRank(b.desig) || a.name.localeCompare(b.name));
    const rank = (a, b) => orgRank(a.desig) - orgRank(b.desig) || a.name.localeCompare(b.name);

    const names = all.map((x) => x.name);
    const cardId = (x) => (x._aid != null ? "aid:" + x._aid : "num:" + x.num);
    const oid = (x) => (x._aid != null ? `data-aid="${esc(x._aid)}"` : `data-num="${x.num}"`);
    const opt = (v, l, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? " selected" : ""}>${esc(l)}</option>`;
    const icons = (x) => `<div class="org-icons"><button class="org-editbtn" data-id="${cardId(x)}" title="Edit">✎</button><button class="org-add" data-name="${esc(x.name)}" title="Add a report under ${esc(x.name)}">＋</button><button class="org-del" ${oid(x)} data-name="${esc(x.name)}" title="Remove">✕</button></div>`;
    // Read-only KRA chip for a compact card (download link when a file exists).
    const kraChip = (key) => {
      const k = kraFiles[key];
      if (!k || !k.url) return "";
      return `<a class="org-kra" href="${esc(k.url)}" target="_blank" rel="noopener" title="Open KRA: ${esc(k.name || "document")}">📄 KRA</a>`;
    };
    const compact = (x, cls) => {
      const hq = x.hq && x.hq !== "—" ? `<span class="org-hq">${esc(x.hq)}</span>` : "";
      const zone = x.zone && x.zone !== "—" ? `<span class="org-zone">${esc(x.zone)}</span>` : "";
      const emp = x.empId ? `<span class="org-emp">${esc(x.empId)}</span>` : "";
      return `<div class="org-card ${cls}"><div class="org-cardmain"><span class="org-name">${esc(x.name)}</span>${emp}<span class="org-desig">${esc(x.desig)}</span>${hq}${zone}${kraChip(cardId(x))}</div>${ed ? icons(x) : ""}</div>`;
    };
    // KRA upload/replace/remove block inside the edit form (keyed by card id
    // for regular people, "sp:nsm" / "sp:cto" for the special top nodes).
    const kraEdit = (key) => {
      const k = kraFiles[key];
      const cur = k && k.url
        ? `<div class="org-kra-cur"><a href="${esc(k.url)}" target="_blank" rel="noopener">📄 ${esc(k.name || "KRA document")}</a><button class="org-kra-del" data-krakey="${esc(key)}" type="button" title="Remove KRA">✕</button></div>`
        : "";
      const label = k && k.url ? "Replace KRA file" : "Upload KRA file";
      return `<div class="org-kra-edit">${cur}
        <label class="org-kra-up">${esc(label)}<input type="file" class="org-kra-file" data-krakey="${esc(key)}" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"></label>
        <span class="org-kra-msg" data-krakey="${esc(key)}"></span></div>`;
    };
    const editForm = (x, cls) => {
      const repOpts = [CTO, NSM].concat(names.filter((n) => n !== x.name)).map((n) => opt(n, n, x.rep)).join("");
      const statOpts = STATUS_OPTIONS.map((o) => opt(o.id, o.label, x.st)).join("");
      const divOpts = DIVISIONS.map((dv) => opt(dv, divLabel(dv), x.div)).join("");
      const deptOpts = ORG_DEPTS.map((d) => opt(d, d, x.dept)).join("");
      return `<div class="org-card org-edit ${cls}" ${oid(x)}>
        <input class="org-in org-in-name" data-field="name" value="${esc(x.name)}" placeholder="Name" title="Name">
        <input class="org-in" data-field="empId" value="${esc(x.empId)}" placeholder="Employee no. (e.g. PLM001)" title="Employee number">
        <input class="org-in" data-field="designation" value="${esc(x.desig)}" placeholder="Designation" title="Designation">
        <div class="org-in-row"><select class="org-in org-sel" data-field="dept" title="Department">${deptOpts}</select><select class="org-in org-sel" data-field="division" title="Division">${divOpts}</select></div>
        <div class="org-in-row"><select class="org-in org-sel" data-field="status" title="Status">${statOpts}</select></div>
        <input class="org-in" data-field="baseHQ" value="${esc(x.hq)}" placeholder="City" title="City / base HQ">
        <select class="org-in org-sel" data-field="zone" title="${x.dept === "Sales" ? "Zone" : "Location"}"><option value="">— ${x.dept === "Sales" ? "zone" : "location"} —</option>${zonesFor(x.dept).concat(x.zone && !zonesFor(x.dept).includes(x.zone) ? [x.zone] : []).map((z) => opt(z, z, x.zone)).join("")}</select>
        <label class="org-rep">Reports to <select class="org-in org-sel" data-field="reportsTo">${repOpts}</select></label>
        ${kraEdit(cardId(x))}
        <div class="org-actions"><button class="org-done" title="Done">✓ Done</button><button class="org-del" ${oid(x)} data-name="${esc(x.name)}" title="Delete">✕ Delete</button></div>
      </div>`;
    };
    const cardHtml = (x, cls) => (ed && orgEditId === cardId(x)) ? editForm(x, cls) : compact(x, cls);
    const node = (x, seen) => {
      // Dedup by unique card id (not name): two people can share a name
      // (e.g. several "New person" rows) and each must render + be deletable.
      const uid = cardId(x);
      if (skipNames.has(x.name) || seen.has(uid)) return "";
      seen.add(uid);
      const kids = childrenOf(x.name);
      const cls = x.st === "vacant" ? "org-vacant" : x.st === "tojoin" ? "org-tojoin" : (x.div === "Salon/Spa" ? "org-spa" : "");
      return `<li class="org-node">
        ${cardHtml(x, cls)}
        ${kids.length ? `<ul class="org-children">${kids.map((k) => node(k, seen)).join("")}</ul>` : ""}
      </li>`;
    };

    // Special top nodes (NSM = Arjun, CTO) — each editable via its own pencil.
    const specialCard = (key, cls, name, sub, subField, emp) => {
      const kkey = "sp:" + key;
      if (ed && orgEditId === key) {
        return `<div class="org-card ${cls} org-edit" data-special="${key}">
          <input class="org-in org-in-name" data-field="name" value="${esc(name)}" placeholder="Name">
          <input class="org-in" data-field="empId" value="${esc(emp || "")}" placeholder="Employee no. (e.g. PLM007)" title="Employee number">
          <input class="org-in" data-field="${subField}" value="${esc(sub)}" placeholder="Designation / title">
          ${kraEdit(kkey)}
          <div class="org-actions"><button class="org-done" title="Done">✓ Done</button></div></div>`;
      }
      const empChip = emp ? `<span class="org-emp">${esc(emp)}</span>` : "";
      const addBtn = key === "nsm" ? `<button class="org-add" data-name="${esc(name)}" title="Add a report under ${esc(name)}">＋</button>` : "";
      return `<div class="org-card ${cls}"><div class="org-cardmain"><span class="org-name">${esc(name)}</span>${empChip}<span class="org-desig">${esc(sub)}</span>${kraChip(kkey)}</div>${ed ? `<div class="org-icons"><button class="org-editbtn" data-id="${key}" title="Edit">✎</button>${addBtn}</div>` : ""}</div>`;
    };

    // Special node names never render as ordinary cards; card-id set tracks
    // what's already been drawn so same-named people don't collapse into one.
    const skipNames = new Set([NSM, CTO, "Arjun", "CTO"]);
    const seen = new Set();

    let inner;
    if (deptFilter === "Sales") {
      // Sales keeps the CEO → Sales Director (Arjun/NSM) → sales-team structure.
      const arjunKids = all.filter((x) => x.name !== NSM && !isCto(x.rep) && (x.rep === NSM || x.rep === "Arjun" || !byName[x.rep])).sort(rank);
      const ctoPeers = all.filter((x) => x.name !== NSM && isCto(x.rep)).sort(rank);
      const arjunNode = `<li class="org-node">
        ${specialCard("nsm", "org-root", NSM, orgNsm.desig || "National Sales Manager", "desig", orgNsm.empId)}
        <ul class="org-children">${arjunKids.map((k) => node(k, seen)).join("")}</ul>
      </li>`;
      inner = `${arjunNode}${ctoPeers.map((k) => node(k, seen)).join("")}`;
    } else {
      // Other departments: everyone whose manager is outside this department
      // becomes a top-level card under the CEO; in-department reports nest.
      const roots = all.filter((x) => !byName[x.rep] || x.rep === x.name).sort(rank);
      let html = roots.map((k) => node(k, seen)).join("");
      // Safety net: render anyone not reached from a root (orphaned manager).
      all.filter((x) => !seen.has(cardId(x))).sort(rank).forEach((x) => { html += node(x, seen); });
      inner = html;
    }

    return `<ul class="org-tree">
      <li class="org-node">
        ${specialCard("cto", "org-cto", CTO, orgTop.title || "", "title", orgTop.empId)}
        <ul class="org-children">${inner || `<li class="org-node"><div class="org-empty-dept">No one in this department yet.</div></li>`}</ul>
      </li>
    </ul>`;
  }

  // Write an edited field from an org card back to the roster (add or base row).
  function orgCardWrite(card, field, val) {
    if (!card) return;
    const aid = card.getAttribute("data-aid"), num = card.getAttribute("data-num");
    if (aid !== null) { const p = rosterAdds.find((x) => x._aid === aid); if (p) p[field] = val; }
    else if (num !== null) rosterEdits[num + "#" + field] = val;
  }
  function mountOrgChart() {
    const box = document.getElementById("orgScroll");
    if (box) box.innerHTML = renderOrgChart(orgDept);
    wireOrgChart();
  }
  function wireOrgChart() {
    if (!isAdmin()) return;
    // pencil → open this card for editing
    document.querySelectorAll("#orgScroll .org-editbtn").forEach((b) => {
      b.onclick = () => { orgEditId = b.dataset.id; mountOrgChart(); };
    });
    // ✓ Done → close the open editor
    document.querySelectorAll("#orgScroll .org-done").forEach((b) => {
      b.onclick = () => { orgEditId = null; mountOrgChart(); };
    });
    // field edits (person cards + the special NSM/CTO cards)
    document.querySelectorAll("#orgScroll .org-in").forEach((el) => {
      const card = el.closest(".org-card");
      const special = card.getAttribute("data-special");
      const commit = () => {
        const f = el.dataset.field;
        const v = el.tagName === "SELECT" ? el.value : el.value.trim();
        if (special === "nsm") orgNsm[f] = v;
        else if (special === "cto") { orgTop[f] = v; }
        else orgCardWrite(card, f, v);
        saveEdits("Roster · " + f);
        if (el.tagName === "SELECT") mountOrgChart();
      };
      if (el.tagName === "SELECT") el.onchange = commit; else el.onblur = commit;
    });
    // ＋ add a report under this person, and open it for editing
    document.querySelectorAll("#orgScroll .org-add").forEach((b) => {
      b.onclick = () => {
        const parent = b.dataset.name || "Arjun";
        const aid = "r" + (rosterAddSeq++);
        // Inherit the department (and Sales division) currently on screen so
        // the new card stays visible under the active tab instead of vanishing.
        const ndiv = orgDept === "Sales" ? orgSalesDiv : "Derma";
        rosterAdds.push({ _aid: aid, name: "New person", designation: "", division: ndiv, dept: orgDept, baseHQ: "", reportsTo: parent, zone: "", status: "active" });
        saveEdits("Added a report under " + parent);
        orgEditId = "aid:" + aid; // open the new card so it's ready to fill in
        mountOrgChart();
      };
    });
    // ✕ delete a person
    document.querySelectorAll("#orgScroll .org-del").forEach((b) => {
      b.onclick = () => {
        if (!window.confirm("Remove " + (b.dataset.name || "this person") + " from the roster?")) return;
        const aid = b.getAttribute("data-aid"), num = b.getAttribute("data-num");
        removePerson(aid !== null ? { _aid: aid } : { num: +num });
        orgEditId = null;
        mountOrgChart();
      };
    });
    // KRA file upload
    document.querySelectorAll("#orgScroll .org-kra-file").forEach((inp) => {
      inp.onchange = () => {
        const file = inp.files && inp.files[0];
        if (file) uploadKra(kraKeyFromEl(inp), file, inp);
      };
    });
    // KRA remove
    document.querySelectorAll("#orgScroll .org-kra-del").forEach((b) => {
      b.onclick = () => {
        if (!window.confirm("Remove the uploaded KRA file?")) return;
        removeKra(kraKeyFromEl(b));
      };
    });
  }

  // Derive the KRA storage key from a card element. Regular cards carry
  // data-krakey ("aid:xx" / "num:xx"); special top nodes use "sp:nsm" / "sp:cto".
  function kraKeyFromEl(el) {
    return el.getAttribute("data-krakey") || "";
  }
  async function uploadKra(key, file, inp) {
    const msg = document.querySelector(`#orgScroll .org-kra-msg[data-krakey="${key}"]`);
    const setMsg = (t, bad) => { if (msg) { msg.textContent = t; msg.style.color = bad ? "var(--bad)" : "var(--text-3)"; } };
    if (!storage) { setMsg("⚠ File storage is not enabled yet — ask the admin to turn on Firebase Storage.", true); return; }
    if (!(roleIsAdmin() || hasAnyEditGrant())) { setMsg("⚠ You don't have edit access.", true); return; }
    if (file.size > 15 * 1024 * 1024) { setMsg("⚠ File too large (max 15 MB).", true); return; }
    setMsg("Uploading…");
    try {
      const safe = String(file.name).replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = "kra/" + key.replace(/[:]/g, "_") + "/" + Date.now() + "-" + safe;
      const ref = storage.ref().child(path);
      await ref.put(file, { contentType: file.type || "application/octet-stream" });
      const url = await ref.getDownloadURL();
      // Clean up any previous file for this position (best effort).
      const prev = kraFiles[key];
      kraFiles[key] = { name: file.name, url, path, size: file.size, at: Date.now(), by: (sessionUser && sessionUser.email) || "" };
      if (prev && prev.path && prev.path !== path) { try { await storage.ref().child(prev.path).delete(); } catch (e) {} }
      saveEdits("KRA uploaded");
      mountOrgChart();
    } catch (e) {
      console.warn("KRA upload failed", e);
      setMsg("⚠ Upload failed: " + (e && e.code ? e.code : "error") + ". Storage may not be enabled or rules block it.", true);
      if (inp) inp.value = "";
    }
  }
  async function removeKra(key) {
    const rec = kraFiles[key];
    delete kraFiles[key];
    saveEdits("KRA removed");
    mountOrgChart();
    if (rec && rec.path && storage) { try { await storage.ref().child(rec.path).delete(); } catch (e) {} }
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
      const selCell = (p, field, opts, addNew, labelFn) => {
        const lf = labelFn || ((x) => x);
        const cur = rval(p, field) || "";
        const options = opts.slice();
        if (cur && !options.includes(cur)) options.unshift(cur);
        let html = `<option value=""${cur === "" ? " selected" : ""}>—</option>`;
        html += options.map((o) => `<option value="${esc(o)}"${o === cur ? " selected" : ""}>${esc(lf(o))}</option>`).join("");
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
          const hay = `${name} ${rval(p, "designation")} ${rval(p, "baseHQ")} ${rval(p, "zone")} ${rval(p, "reportsTo")} ${division} ${divLabel(division)} ${p.notes || ""}`.toLowerCase();
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
        const divBadge = `<span class="badge ${division === "Salon/Spa" ? "b-teal" : "b-accent"}">${esc(divLabel(division))}</span>`;
        const divCell = ed
          ? selCell(p, "division", DIVISIONS, false, divLabel)
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
      wireOrgChart();
      document.querySelectorAll("[data-orgdept]").forEach((b) => {
        b.onclick = () => {
          orgDept = b.dataset.orgdept;
          document.querySelectorAll("[data-orgdept]").forEach((x) => x.classList.toggle("active", x === b));
          const bar = document.getElementById("orgSalesDivBar");
          if (bar) bar.style.display = orgDept === "Sales" ? "" : "none";
          mountOrgChart();
        };
      });
      document.querySelectorAll("[data-orgsalesdiv]").forEach((b) => {
        b.onclick = () => {
          orgSalesDiv = b.dataset.orgsalesdiv;
          document.querySelectorAll("[data-orgsalesdiv]").forEach((x) => x.classList.toggle("active", x === b));
          mountOrgChart();
        };
      });
    }, 0);

    return teamSubnav() + `
      <div class="section-head">
        <h1>Team Roster</h1>
        <p>Reporting hierarchy for ${esc(D.meta.fiscalYear)}.${isAdmin() ? " Click <b>✎</b> on any card to edit that person, <b>＋</b> to add a report under them, <b>✕</b> to remove." : ""}</p>
      </div>
      <div class="card" style="margin-bottom:20px"><div class="stat-row">${summaryCards}</div></div>
      <div class="card">
        <div class="controls" style="margin:0 0 12px">
          <div class="seg org-dept-seg">
            ${ORG_DEPTS.map((d) => `<button data-orgdept="${esc(d)}" class="${orgDept === d ? "active" : ""}">${esc(d)}</button>`).join("")}
          </div>
          ${isAdmin() ? `<div class="hq-actions"><button id="rosterAddBtn" class="dl-btn" type="button" title="Add a person to this department">＋ Add person</button></div>` : ""}
        </div>
        <div class="controls" id="orgSalesDivBar" style="margin:0 0 12px${orgDept === "Sales" ? "" : ";display:none"}">
          <div class="seg">
            ${DIVISIONS.map((dv) => `<button data-orgsalesdiv="${esc(dv)}" class="${orgSalesDiv === dv ? "active" : ""}">${esc(divLabel(dv))}</button>`).join("")}
          </div>
        </div>
        <div class="org-scroll" id="orgScroll">${renderOrgChart(orgDept)}</div>
        ${isAdmin() ? `<div class="muted-note" style="margin-top:10px">Tabs above filter the chart by <b>department</b>. On each card: <b>✎</b> edit (incl. department &amp; the top CEO/Sales Director), <b>＋</b> add a report under them, <b>✕</b> delete. <b>＋ Add person</b> (top) adds into the current department under the Sales Director. Vacant seats live on the <b>Vacancies</b> tab.</div>` : ""}
      </div>`;
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
      // New person joins the current department; under the Sales Director for
      // Sales, otherwise as a top-level card in that department.
      const parent = orgDept === "Sales" ? "Arjun" : (orgNsm.name || "Arjun");
      const ndiv = orgDept === "Sales" ? orgSalesDiv : "Derma";
      rosterAdds.push({ _aid: aid, name: "New person", designation: "", division: ndiv, dept: orgDept, baseHQ: "", reportsTo: parent, zone: "", status: "active" });
      saveEdits("Added a person");
      orgEditId = "aid:" + aid;
      mountOrgChart();
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
    // Priority is now a unique rank number (1 = top). Blank sorts last.
    const prNum = (p) => { const n = parseInt(vget(p, "priority"), 10); return isNaN(n) ? 9999 : n; };
    const vstat = (p) => vget(p, "vstatus") || "notstarted";
    const vsMeta = (id) => VAC_STATUS.find((o) => o.id === id) || VAC_STATUS[0];

    const sorted = list.slice().sort((a, b) => {
      if (vacancySort === "fillBy") {
        const fa = vget(a, "fillBy") || "9999-12-31", fb = vget(b, "fillBy") || "9999-12-31";
        return fa < fb ? -1 : fa > fb ? 1 : 0;
      }
      return prNum(a) - prNum(b);
    });

    const ed = isAdmin();
    const open = list.filter((p) => !vget(p, "fillBy")).length;
    const inPipe = list.filter((p) => vstat(p) === "inprogress" || vstat(p) === "offered").length;

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

    const N = list.length;
    const rows = sorted.map((p, i) => {
      const name = rval(p, "name"), pr = vget(p, "priority") || "";
      const vs = vstat(p);
      const nameCell = ed
        ? `<td class="t-name vac-rname" contenteditable="true" ${ridAttr(p)} data-field="name">${esc(name)}</td>`
        : `<td class="t-name">${esc(name)}</td>`;
      const prCell = ed
        ? `<td><select class="vac-in" data-k="${vkey(p)}" data-field="priority"><option value="">—</option>${
            Array.from({ length: N }, (_, n) => { const v = String(n + 1); return `<option value="${v}"${pr === v ? " selected" : ""}>${v}</option>`; }).join("")
          }</select></td>`
        : `<td>${pr ? `<span class="badge b-info">Priority ${esc(pr)}</span>` : "<span class='t-muted'>—</span>"}</td>`;
      const statusCell = ed
        ? `<td><select class="vac-in" data-k="${vkey(p)}" data-field="vstatus">${
            VAC_STATUS.map((o) => `<option value="${o.id}"${o.id === vs ? " selected" : ""}>${o.label}</option>`).join("")
          }</select></td>`
        : `<td><span class="badge ${vsMeta(vs).cls}">${esc(vsMeta(vs).label)}</span></td>`;
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
        ${statusCell}
        ${fillCell}
        ${remarkCell}
      </tr>`;
    }).join("") || `<tr><td colspan="9" class="empty">No vacant positions — every seat is filled. 🎉</td></tr>`;

    const head = ["#", "Position / Name", "Designation", "Base HQ", "Zone", "Priority", "Hiring status", "Target fill by", "Remark"]
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
        <p>Open positions across the team${ed ? " — every field is editable: refine the role details, set a unique <b>priority</b> (1 = top; no two can share a number), a <b>hiring status</b>, a target fill date and a remark. Set status to <b>Hired</b> to move the position into the Team Roster as an active member. Changes save for everyone." : ". An administrator prioritises and schedules these."}</p>
      </div>
      <div class="card" style="margin-bottom:20px"><div class="stat-row">
        <div class="stat"><b>${list.length}</b><span>Vacant positions</span></div>
        <div class="stat"><b>${inPipe}</b><span>In progress / offered</span></div>
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
        const k = el.dataset.k, field = el.dataset.field;
        if (field === "priority") { setVacancyPriority(k, el.value); return; }
        if (field === "vstatus") { setVacancyStatus(k, el.value); return; }
        (vacancyEdits[k] || (vacancyEdits[k] = {}))[field] = el.value;
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

  // Set a vacancy's priority, keeping numbers unique: if another vacancy already
  // holds this number, it takes over the one we're vacating (a swap).
  function setVacancyPriority(k, val) {
    const vkeys = new Set(vacantPeople().map(vkey));
    const prev = (vacancyEdits[k] && vacancyEdits[k].priority) || "";
    if (val) {
      Object.keys(vacancyEdits).forEach((ok) => {
        if (ok !== k && vkeys.has(ok) && vacancyEdits[ok] && String(vacancyEdits[ok].priority) === String(val)) {
          vacancyEdits[ok].priority = prev; // swap: give it our old slot (may be blank)
        }
      });
    }
    (vacancyEdits[k] || (vacancyEdits[k] = {})).priority = val;
    saveEdits("Vacancy priority → " + (val || "—"));
    go("team");
  }

  // Set a vacancy's hiring status. "Hired" moves the position into the Team
  // Roster as an active member (it then leaves the Vacancies list).
  function setVacancyStatus(k, val) {
    const p = vacantPeople().find((x) => vkey(x) === k);
    if (val === "hired") {
      const nm = p ? rval(p, "name") : "";
      if (!window.confirm('Mark "' + (nm || "this position") + '" as Hired and move it to the Team Roster as an Active member?')) { go("team"); return; }
      const setRoster = (field, v) => {
        if (!p) return;
        if (p._aid != null) { const rp = rosterAdds.find((x) => x._aid === p._aid); if (rp) rp[field] = v; }
        else rosterEdits[p.num + "#" + field] = v;
      };
      // If the row still has a placeholder name, capture the hired person's name.
      let finalName = nm;
      if (p && (!nm || /vacant|new position/i.test(nm))) {
        const entered = (window.prompt("Name of the hired person:", "") || "").trim();
        if (entered) { finalName = entered; setRoster("name", entered); }
      }
      (vacancyEdits[k] || (vacancyEdits[k] = {})).vstatus = "hired";
      setRoster("status", "active");
      saveEdits("Hired — moved " + (finalName || "position") + " to Team Roster");
      go("team");
      return;
    }
    (vacancyEdits[k] || (vacancyEdits[k] = {})).vstatus = val;
    saveEdits("Vacancy status → " + val);
    go("team");
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
  // New model: quarterly targets by salesperson × product per HQ.
  // `${sheet}` -> [{ id, person, product, q2, q3, q4 }]
  // Standard fiscal quarters: Q2 = Jul–Sep 2026, Q3 = Oct–Dec 2026, Q4 = Jan–Mar 2027.
  const hqSpTargets = {};
  let hqTgtSeq = 0;
  // Official Sep-26 → Mar-27 targets (from finance's target sheet), by HQ.
  // Q2 = Sep-26, Q3 = Oct+Nov+Dec-26, Q4 = Jan+Feb+Mar-27.
  const SEED_HQ_TARGETS = {
      "Punjab HQ": [
        { person: "Akshay Jain", product: "Cellina PR", q2: 0, q3: 3, q4: 3 },
        { person: "Akshay Jain", product: "Biaxis", q2: 1, q3: 3, q4: 6 },
        { person: "Akshay Jain", product: "Vossman", q2: 0, q3: 2, q4: 3 },
        { person: "Akshay Jain", product: "Magic Pulse", q2: 0, q3: 1, q4: 3 },
        { person: "Akshay Jain", product: "Blaumman", q2: 0, q3: 0, q4: 2 },
        { person: "Akshay Jain", product: "Torr RF", q2: 0, q3: 0, q4: 2 },
        { person: "Akshay Jain", product: "Polylase", q2: 0, q3: 0, q4: 2 },
        { person: "Akshay Jain", product: "Celluma", q2: 1, q3: 5, q4: 6 },
      ],
      "Delhi HQ": [
        { person: "Ambika Anand", product: "Cellina PR", q2: 0, q3: 3, q4: 3 },
        { person: "Ambika Anand", product: "Biaxis", q2: 0, q3: 0, q4: 3 },
        { person: "Ambika Anand", product: "Vossman", q2: 0, q3: 2, q4: 3 },
        { person: "Ambika Anand", product: "Magic Pulse", q2: 0, q3: 0, q4: 3 },
        { person: "Ambika Anand", product: "Blaumman", q2: 0, q3: 0, q4: 2 },
        { person: "Ambika Anand", product: "Torr RF", q2: 0, q3: 0, q4: 2 },
        { person: "Ambika Anand", product: "Polylase", q2: 0, q3: 0, q4: 1 },
        { person: "Ambika Anand", product: "Celluma", q2: 1, q3: 5, q4: 6 },
      ],
      "West HQ": [
        { person: "Bimal Kumar", product: "Cellina PR", q2: 1, q3: 3, q4: 4 },
        { person: "Bimal Kumar", product: "Biaxis", q2: 0, q3: 1, q4: 3 },
        { person: "Bimal Kumar", product: "Vossman", q2: 0, q3: 2, q4: 3 },
        { person: "Bimal Kumar", product: "Magic Pulse", q2: 0, q3: 0, q4: 2 },
        { person: "Bimal Kumar", product: "Earbrium Glass", q2: 0, q3: 0, q4: 1 },
        { person: "Bimal Kumar", product: "Blaumman", q2: 0, q3: 0, q4: 2 },
        { person: "Bimal Kumar", product: "Torr RF", q2: 0, q3: 0, q4: 1 },
        { person: "Bimal Kumar", product: "Polylase", q2: 0, q3: 0, q4: 2 },
        { person: "Bimal Kumar", product: "Celluma", q2: 1, q3: 5, q4: 6 },
        { person: "Sandeep Kukadiya", product: "Cellina PR", q2: 1, q3: 3, q4: 6 },
        { person: "Sandeep Kukadiya", product: "Biaxis", q2: 0, q3: 0, q4: 2 },
        { person: "Sandeep Kukadiya", product: "Vossman", q2: 0, q3: 0, q4: 3 },
        { person: "Sandeep Kukadiya", product: "Magic Pulse", q2: 0, q3: 0, q4: 3 },
        { person: "Sandeep Kukadiya", product: "Blaumman", q2: 0, q3: 0, q4: 3 },
        { person: "Sandeep Kukadiya", product: "Torr RF", q2: 0, q3: 0, q4: 2 },
        { person: "Sandeep Kukadiya", product: "Polylase", q2: 0, q3: 0, q4: 1 },
        { person: "Sandeep Kukadiya", product: "Celluma", q2: 1, q3: 5, q4: 6 },
      ],
      "Vijayawada HQ": [
        { person: "Vamshi Krishna", product: "Cellina PR", q2: 0, q3: 3, q4: 3 },
        { person: "Vamshi Krishna", product: "Biaxis", q2: 0, q3: 0, q4: 3 },
        { person: "Vamshi Krishna", product: "Vossman", q2: 0, q3: 0, q4: 3 },
        { person: "Vamshi Krishna", product: "Magic Pulse", q2: 0, q3: 0, q4: 3 },
        { person: "Vamshi Krishna", product: "Earbrium Glass", q2: 0, q3: 0, q4: 1 },
        { person: "Vamshi Krishna", product: "Blaumman", q2: 0, q3: 0, q4: 1 },
        { person: "Vamshi Krishna", product: "Torr RF", q2: 0, q3: 0, q4: 1 },
        { person: "Vamshi Krishna", product: "Polylase", q2: 0, q3: 0, q4: 1 },
        { person: "Vamshi Krishna", product: "Celluma", q2: 1, q3: 5, q4: 6 },
      ],
      "Hyderabad HQ": [
        { person: "Ibrahim / Siva", product: "Cellina PR", q2: 1, q3: 3, q4: 6 },
        { person: "Ibrahim / Siva", product: "Biaxis", q2: 0, q3: 1, q4: 3 },
        { person: "Ibrahim / Siva", product: "Vossman", q2: 0, q3: 2, q4: 3 },
        { person: "Ibrahim / Siva", product: "Magic Pulse", q2: 0, q3: 0, q4: 3 },
        { person: "Ibrahim / Siva", product: "Blaumman", q2: 0, q3: 3, q4: 3 },
        { person: "Ibrahim / Siva", product: "Torr RF", q2: 0, q3: 0, q4: 2 },
        { person: "Ibrahim / Siva", product: "Polylase", q2: 0, q3: 0, q4: 2 },
        { person: "Ibrahim / Siva", product: "Celluma", q2: 1, q3: 5, q4: 6 },
      ],
      "Chennai HQ": [
        { person: "Dhinesh Ramalingam", product: "Cellina PR", q2: 0, q3: 3, q4: 3 },
        { person: "Dhinesh Ramalingam", product: "Biaxis", q2: 0, q3: 2, q4: 3 },
        { person: "Dhinesh Ramalingam", product: "Vossman", q2: 0, q3: 2, q4: 3 },
        { person: "Dhinesh Ramalingam", product: "Magic Pulse", q2: 0, q3: 0, q4: 3 },
        { person: "Dhinesh Ramalingam", product: "Earbrium Glass", q2: 0, q3: 2, q4: 3 },
        { person: "Dhinesh Ramalingam", product: "Blaumman", q2: 0, q3: 0, q4: 2 },
        { person: "Dhinesh Ramalingam", product: "Torr RF", q2: 0, q3: 0, q4: 5 },
        { person: "Dhinesh Ramalingam", product: "Polylase", q2: 0, q3: 0, q4: 1 },
        { person: "Dhinesh Ramalingam", product: "Celluma", q2: 1, q3: 5, q4: 6 },
        { person: "Dhinesh / Arjun (Direct)", product: "Celluma (Direct)", q2: 16, q3: 49, q4: 51 },
      ],
    };
  const HQ_TARGET_SEED_VERSION = 1;
  let hqTargetSeedVersion = 0; // last applied HQ-target seed version (from edits doc)
  function seedHqTargets() {
    if (!(roleIsAdmin() || hasAnyEditGrant())) return;
    if (hqTargetSeedVersion >= HQ_TARGET_SEED_VERSION) return; // apply once
    Object.keys(SEED_HQ_TARGETS).forEach((sheet) => {
      hqSpTargets[sheet] = SEED_HQ_TARGETS[sheet].map((r) => ({
        id: "t" + (hqTgtSeq++), person: r.person, product: r.product, q2: r.q2, q3: r.q3, q4: r.q4,
      }));
    });
    hqTargetSeedVersion = HQ_TARGET_SEED_VERSION;
    saveEdits("Imported HQ targets Sep26-Mar27");
  }

  const HQ_QUARTERS = [
    { key: "q2", label: "Q2 · Jul–Sep 2026" },
    { key: "q3", label: "Q3 · Oct–Dec 2026" },
    { key: "q4", label: "Q4 · Jan–Mar 2027" },
  ];
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
  // Only active SALES-department people — used for HQ sales targets. Includes
  // the Sales Director (Arjun) and any custom-added names.
  const salesStaffList = () => {
    const s = new Set();
    roster().forEach((p) => {
      const n = (rval(p, "name") || "").trim();
      if (n && !/^vacant/i.test(n) && estatus(p) !== "vacant" && deptOf(p) === "Sales") s.add(n);
    });
    if (orgNsm && orgNsm.name) s.add(orgNsm.name.trim());
    customPeople.forEach((n) => n && s.add(n));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  };
  const newDevices = []; // admin-added devices for the Device (price book) tab
  const idfor = (s) => s.replace(/[^a-z0-9]/gi, "_");

  // All devices available for pricing & target selection = price book + added.
  // Admin price edits (ovEdits "pdev:<device>:<field>") are merged in.
  const DEVICE_PRICE_FIELDS = ["landingCost", "quotation", "standard", "minimum"];
  const deviceList = () => (D && D.costs ? D.costs.device : []).concat(newDevices).map((r) => {
    let o = null;
    DEVICE_PRICE_FIELDS.forEach((f) => { const v = ovEdits["pdev:" + r.device + ":" + f]; if (v != null) { o = o || Object.assign({}, r); o[f] = v; } });
    return o || r;
  });
  const deviceNames = () => deviceList().map((d) => d.device).filter(Boolean);
  const deviceByName = (n) => deviceList().find((d) => d.device === n);

  function hqAllowed(h) {
    const a = allowedHQs();
    if (a === "all") return true;
    const name = h.title.split("—")[0].trim();
    return a.includes(name) || a.includes(h.sheet);
  }

  // "PLM" = Primelaze's own direct sales.
  const spLabel = (s) => (/^plm$/i.test(String(s || "").trim()) ? "Primelaze (PLM)" : s);
  function payAllSalespeople() {
    const set = new Set();
    payAll().forEach((r) => { const n = (r.salesPerson || "").trim(); if (n) set.add(n); });
    return Array.from(set);
  }
  // Best-effort match of the logged-in user to a salesperson name (by email/name).
  function myPaySalesperson() {
    const email = ((sessionUser && sessionUser.email) || "").toLowerCase();
    const nmeRaw = (email.split("@")[0] || "").replace(/[^a-z0-9]/g, "");
    if (!nmeRaw) return null;
    const names = payAllSalespeople();
    const nz = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    return names.find((n) => nz(n) === nmeRaw)
      || names.find((n) => nz(n) && (nmeRaw.includes(nz(n)) || nz(n).includes(nmeRaw)))
      || null;
  }
  // Aggregate imported payment data → region → salesperson → {salesValue, received, outstanding}.
  function paySalesByRegion(scopeName) {
    const byRegion = {};
    payAll().forEach((r) => {
      const sp = (r.salesPerson || "—").trim() || "—";
      if (scopeName && sp !== scopeName) return;
      const region = (r.hq || "—").trim() || "—";
      const reg = byRegion[region] || (byRegion[region] = {});
      const o = reg[sp] || (reg[sp] = { sv: 0, received: 0, pending: 0, n: 0 });
      o.sv += payNum(r.salesValue); o.received += r.received; o.pending += r.pending; o.n++;
    });
    return byRegion;
  }
  // Section shown on the HQ page: sales & outstanding by salesperson, by region.
  function hqSalesByPersonSection() {
    if (!payAll().length) return "";
    const scopeName = (!isSuperAdmin() && !roleIsAdmin()) ? myPaySalesperson() : null;
    const data = paySalesByRegion(scopeName);
    const regions = Object.keys(data).sort();
    if (!regions.length) return `<div class="card" style="margin-top:24px"><h2 style="margin-top:0">💳 Sales &amp; Outstanding by Salesperson</h2><p class="muted-note">No sales data${scopeName ? ` for ${esc(spLabel(scopeName))}` : ""} yet — import the payment sheet on the Outstanding Payment page.</p></div>`;
    const cards = regions.map((region) => {
      const people = Object.entries(data[region]).sort((a, b) => b[1].sv - a[1].sv);
      let tsv = 0, tr = 0, tp = 0, tn = 0;
      const body = people.map(([sp, o]) => { tsv += o.sv; tr += o.received; tp += o.pending; tn += o.n; return `<tr>
        <td class="t-name">${esc(spLabel(sp))}</td>
        <td class="num">${o.n}</td>
        <td class="num">${rupeeShort(o.sv)}</td>
        <td class="num">${rupeeShort(o.received)}</td>
        <td class="num">${o.pending ? rupeeShort(o.pending) : "—"}</td></tr>`; }).join("");
      return `<div class="card" style="margin-bottom:14px">
        <h3 style="margin:0 0 8px">${esc(region)}</h3>
        <div class="table-wrap"><table><thead><tr><th>Salesperson</th><th class="num">Records</th><th class="num">Sales value</th><th class="num">Received</th><th class="num">Outstanding</th></tr></thead>
        <tbody>${body}<tr class="pay-totals"><td class="num"><b>Total</b></td><td class="num">${tn}</td><td class="num"><b>${rupeeShort(tsv)}</b></td><td class="num"><b>${rupeeShort(tr)}</b></td><td class="num"><b>${tp ? rupeeShort(tp) : "—"}</b></td></tr></tbody></table></div>
      </div>`;
    }).join("");
    return `<div style="margin-top:24px">
      <div class="section-title" style="margin:0 0 6px"><h2 style="margin:0">💳 Sales &amp; Outstanding by Salesperson${scopeName ? ` — ${esc(spLabel(scopeName))} (your data)` : ""}</h2></div>
      <p class="muted-note" style="margin-top:0">From the imported Outstanding-Payment data, grouped by region. ${scopeName ? "You’re seeing only your own sales." : "PLM = Primelaze’s own direct sales."}</p>
      ${cards}
    </div>`;
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
        <p>Quarterly sales targets by salesperson &amp; product per regional headquarters — <b>Q2 (Jul–Sep 2026)</b>, <b>Q3 (Oct–Dec 2026)</b>, <b>Q4 (Jan–Mar 2027)</b>. Salespeople are linked from the Team Roster.</p>
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
    const h = D.hqTargets[hqIndex];
    if (!h) return;
    const rows = hqSpTargets[h.sheet] || (hqSpTargets[h.sheet] = []);
    // Edit salesperson / product / Q1 / Q2 on a target row.
    document.querySelectorAll(".hqt-in").forEach((el) => {
      el.onchange = () => {
        const rec = rows.find((x) => x.id === el.dataset.id);
        if (!rec) return;
        const f = el.dataset.field;
        const isQtr = HQ_QUARTERS.some((q) => q.key === f);
        if (isQtr) {
          let v = parseFloat(el.value);
          rec[f] = el.value === "" || isNaN(v) ? "" : Math.max(0, v);
          saveEdits("HQ target · " + f);
          mountHqDetail(h); // refresh totals
        } else {
          rec[f] = el.value;
          saveEdits("HQ target · " + f);
        }
      };
    });
    // Delete a target row.
    document.querySelectorAll(".hqt-rm").forEach((b) => {
      b.onclick = () => {
        if (!window.confirm("Delete this target row?")) return;
        const i = rows.findIndex((x) => x.id === b.dataset.id);
        if (i >= 0) rows.splice(i, 1);
        saveEdits("Removed HQ target row");
        mountHqDetail(h);
      };
    });
    // Add a target row.
    const add = document.getElementById("hqTgtAdd");
    if (add) add.onclick = () => {
      const rec = { id: "t" + (hqTgtSeq++), person: "", product: "" };
      HQ_QUARTERS.forEach((q) => { rec[q.key] = ""; });
      rows.push(rec);
      saveEdits("Added HQ target row");
      mountHqDetail(h);
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
  // Combined product list for a target row: HQ plan products + devices + Esthemax.
  function hqAllProducts(h) {
    const s = new Set();
    hqProductNames(h).forEach((n) => n && s.add(n));
    esthemaxProductNames().forEach((n) => n && s.add(n));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }
  function hqDetail(h) {
    const admin = isAdmin();
    const rows = hqSpTargets[h.sheet] || (hqSpTargets[h.sheet] = []);
    const people = salesStaffList();
    const products = hqAllProducts(h);

    const optList = (arr, cur, ph) =>
      `<option value="">${ph}</option>` +
      arr.concat(cur && !arr.includes(cur) ? [cur] : []).map((n) => `<option${n === cur ? " selected" : ""}>${esc(n)}</option>`).join("");
    const personCell = (rec) => admin
      ? `<select class="hqt-in" data-id="${rec.id}" data-field="person">${optList(people, rec.person, "— salesperson —")}</select>`
      : esc(rec.person || "—");
    const productCell = (rec) => admin
      ? `<select class="hqt-in" data-id="${rec.id}" data-field="product">${optList(products, rec.product, "— product —")}</select>`
      : esc(rec.product || "—");
    const qCell = (rec, q) => admin
      ? `<td class="num"><input class="hqt-in" type="number" min="0" data-id="${rec.id}" data-field="${q}" value="${esc(rec[q] ?? "")}" style="max-width:92px"></td>`
      : `<td class="num">${rec[q] == null || rec[q] === "" ? "—" : inr(rec[q])}</td>`;

    const qTot = {}; HQ_QUARTERS.forEach((q) => { qTot[q.key] = 0; });
    const body = rows.map((rec) => {
      let tot = 0;
      HQ_QUARTERS.forEach((q) => { const v = parseFloat(rec[q.key]) || 0; qTot[q.key] += v; tot += v; });
      return `<tr>
        ${admin ? `<td class="num"><button class="ghost-btn danger hqt-rm" data-id="${rec.id}" title="Delete this target">🗑</button></td>` : ""}
        <td>${personCell(rec)}</td>
        <td>${productCell(rec)}</td>
        ${HQ_QUARTERS.map((q) => qCell(rec, q.key)).join("")}
        <td class="num">${tot ? inr(tot) : "—"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="${4 + HQ_QUARTERS.length + (admin ? 1 : 0)}" class="empty">No targets yet.${admin ? " Click “Add target row”." : ""}</td></tr>`;

    const head = (admin ? [""] : []).concat("Salesperson", "Product", HQ_QUARTERS.map((q) => q.label), "Total")
      .map((x, i) => `<th class="${i >= (admin ? 3 : 2) ? "num" : ""}">${esc(x)}</th>`).join("");
    const grand = HQ_QUARTERS.reduce((s, q) => s + qTot[q.key], 0);
    const totalRow = `<tr class="total-row"><td colspan="${admin ? 3 : 2}">TOTAL</td>${HQ_QUARTERS.map((q) => `<td class="num">${inr(qTot[q.key])}</td>`).join("")}<td class="num">${inr(grand)}</td></tr>`;
    const addCtrl = admin ? `<div class="hq-add-row" style="margin-top:12px"><button id="hqTgtAdd" class="dl-btn" type="button">＋ Add target row</button></div>` : "";

    return `
      <div class="callout">${esc(h.title)}</div>
      <div class="muted-note" style="margin-bottom:8px">Set a quarterly target per <b>salesperson × product</b>. Salespeople come from the <b>Team Roster</b>. ${admin ? "Add, edit or delete rows below." : ""}</div>
      ${table(head, body + totalRow)}
      ${addCtrl}`;
  }

  /* ---- HQ target PDF (targets + incentives + T&C) ---- */
  function pTable(headers, bodyRows) {
    const h = headers.map((x) => `<th class="${x.num ? "num" : ""}">${esc(x.label)}</th>`).join("");
    return `<table><thead><tr>${h}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  }

  // True if any salesperson tied to this HQ has a direct report in the roster
  // (i.e. is a manager) — used to decide whether to print Sales-Manager tables.
  function hqHasManager(h) {
    const people = new Set();
    (hqSpTargets[h.sheet] || []).forEach((r) => { if (r.person) people.add(String(r.person).trim()); });
    (h.plans || []).forEach((pl) => { const m = /—\s*([^(]+?)\s*(?:\(|$)/.exec(pl.label || ""); if (m) people.add(m[1].trim()); });
    if (!people.size) return false;
    const managers = new Set(roster().map((p) => String(rval(p, "reportsTo") || "").trim()).filter(Boolean));
    for (const nm of people) { if (managers.has(nm)) return true; }
    return false;
  }
  function buildHqPrint(h) {
    const stamp = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

    // Current-FY target only — drop last-year actuals, Std Value and YoY Stretch.
    const summary = (h.summary || [])
      .filter((s) => !/25-26|actual|std\s*value|value\s*\(l\)|yoy|stretch/i.test(s.label))
      .map((s) => `<tr><td>${esc(s.label)}</td><td class="num">${isNum(s.value) ? inr(s.value) : esc(s.value)}</td><td>${esc(s.note || "")}</td></tr>`).join("");

    const plansHtml = (h.plans || []).map((pl, pi) => {
      const pk = h.sheet + "#" + pi;
      let tu = 0;
      const body = pl.rows.filter((r) => !r.isTotal).map((r, ri) => {
        const v = hqEdits[pk + "#" + ri] != null ? hqEdits[pk + "#" + ri] : r.fy2627;
        if (isNum(v)) tu += v;
        return `<tr><td>${esc(r.product)}</td><td class="num">${isNum(v) ? inr(v) : esc(v ?? "—")}</td></tr>`;
      }).join("");
      const headers = [{ label: "Product" }, { label: "FY26-27 Target", num: 1 }];
      return `<h3>${esc(pl.label || "Product plan")}</h3>${pTable(headers, body + `<tr><td><b>TOTAL</b></td><td class="num"><b>${inr(tu)}</b></td></tr>`)}`;
    }).join("");

    // Quarterly split — units only (drop the Value-in-Lakhs row).
    const qRows = (h.quarterly || []).filter((q) => !isMoney(q.basis));
    const qHtml = qRows.length
      ? `<h3>Quarterly split</h3>${pTable([{ label: "Basis" }, { label: "Annual", num: 1 }, { label: "Q1", num: 1 }, { label: "Q2", num: 1 }, { label: "Q3", num: 1 }, { label: "Q4", num: 1 }],
          qRows.map((q) => `<tr><td>${esc(q.basis)}</td><td class="num">${isNum(q.annual) ? inr(q.annual) : esc(q.annual)}</td>${["q1", "q2", "q3", "q4"].map((k) => `<td class="num">${isNum(q[k]) ? inr(q[k]) : esc(q[k] ?? "—")}</td>`).join("")}</tr>`).join(""))}`
      : "";

    return `
      <div class="p-section">
        <h1>${esc(D.meta.company)} — ${esc(h.title.split("—")[0].trim())} — FY 2026-27 Targets</h1>
        <div class="p-sub">${esc(h.subtitle || h.title)}</div>
        <p class="p-meta">Generated ${esc(stamp)} · Figures excl. GST · FY26-27 quantities as edited in the dashboard.</p>
        ${summary ? `<h2>Summary</h2>${pTable([{ label: "Metric" }, { label: "Value", num: 1 }, { label: "Note" }], summary)}` : ""}
        ${plansHtml}
        ${qHtml}
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
  // Incentive terms & conditions (from the Sales-Person / Manager incentive sheets).
  const INCENTIVE_TERMS = [
    { title: "General criteria", items: [
      "Employee must be on Primelaze Meditech payroll at the time of disbursement.",
      "Employee must adhere to company policies and protocols.",
      "Employee must complete 2 months to be eligible for incentives; new joiners are eligible from the calendar month following joining.",
      "Incentive eligibility is at management's discretion, explained monthly, and announced at the monthly review meeting after the review.",
    ] },
    { title: "Product incentives", items: [
      "Disbursed in two parts — 50% after receipt of a minimum 10% advance, and the remaining 50% after 100% receipt of payment.",
      "Machines sold below the minimum eligible product cost are not eligible for incentives.",
      "Standard payment terms are up to 6 months; incentives for machines sold on terms beyond 6 months are at management's discretion.",
      "A maximum of 1 month delay over and above the MOU terms is allowed; no product incentive is payable if payment is delayed by more than 1 month.",
      "For every additional sales amount above the Standard Product Cost, 10% over and above the standard incentive is payable.",
      "For every HO (direct) sale by Arjun & Dhinesh, the employee is eligible for the product incentive shown in the table.",
    ] },
    { title: "Monthly spot incentives", items: [
      "Awarded on the basis of monthly performance, BIGIN updates, and improvement in product / market knowledge.",
    ] },
    { title: "Quarterly incentives", items: [
      "Employee must complete a minimum of 80 days in the quarter to be eligible (applicable to new employees).",
      "No incentive is payable for less than 75% achievement of both unit and value.",
      "Additional incentive is payable for above 105% quarterly achievement (per the table).",
      "Disbursed as 70% confirmed and paid after 100% payment receipt, and the remaining 30% confirmed and paid only if the employee achieves a minimum of 50% of the next quarter's target.",
    ] },
    { title: "Annual bonus", items: [
      "A fully-paid foreign trip with spouse (3 nights / 4 days) for an employee performing at 100% or above in all 4 quarters — over and above the incentive amount.",
      "A fully-paid domestic trip with spouse (3 nights / 4 days) for an employee performing at a minimum of 90% in all 4 quarters — over and above the incentive amount.",
    ] },
    { title: "Esthemax — terms & conditions", items: [
      "Eligibility: must be on Primelaze Meditech payroll on the disbursement date; must adhere to company policies and protocols; new joiners are eligible from the calendar month following joining; incentive is forfeited if the employee resigns or is terminated before disbursement, with final-month pro-rata at management's discretion.",
      "What counts as a sale: only invoiced and dispatched units count — FOC, demo, sample, replacement and warranty units are excluded; corporate sales are excluded from the slab (a ₹50K onboarding bonus applies instead); the sales month is defined by the invoice date; incentive on reversed sales (returns within 60 days) is clawed back from the next month.",
      "Disbursement: released only after the customer's full payment is received; a payment-timing modifier applies based on the number of days from invoice to full payment.",
    ] },
  ];
  // Admin-editable override for the T&C (null = use the default INCENTIVE_TERMS).
  let termsOverride = null;
  const getTerms = () => (Array.isArray(termsOverride) ? termsOverride : INCENTIVE_TERMS);

  // ---- Admin overrides for incentive amounts & device prices ----
  // Keyed by "group:rowName:field" (e.g. "dsp:Bi-Axis Q Switch:stdIncentive",
  // "pdev:Inno Plus:standard"). Applied at render time and persisted.
  const ovEdits = {};
  const ovGet = (key, orig) => (ovEdits[key] != null ? ovEdits[key] : orig);
  const ovNumCell = (key, orig, useRupee) => {
    const eff = ovGet(key, orig);
    return isAdmin()
      ? `<td class="num"><input class="ov-in" data-key="${esc(key)}" data-t="num" type="number" step="any" value="${eff == null || eff === "" ? "" : esc(eff)}" style="max-width:108px"></td>`
      : `<td class="num">${eff == null || eff === "" ? "—" : (useRupee ? rupee(eff) : esc(eff))}</td>`;
  };
  const ovTxtCell = (key, orig) => {
    const eff = ovGet(key, orig);
    return isAdmin()
      ? `<td><input class="ov-in" data-key="${esc(key)}" data-t="txt" value="${esc(eff == null ? "" : eff)}" style="min-width:130px"></td>`
      : `<td class="cell-note">${esc(eff || "—")}</td>`;
  };
  function wireOverrides() {
    document.querySelectorAll(".ov-in").forEach((el) => {
      el.onchange = () => {
        const key = el.dataset.key;
        if (el.dataset.t === "num") {
          if (el.value === "") delete ovEdits[key];
          else { const v = parseFloat(el.value); if (!isNaN(v)) ovEdits[key] = v; }
        } else {
          if (el.value === "") delete ovEdits[key]; else ovEdits[key] = el.value;
        }
        saveEdits("Edited " + key.split(":")[0]);
      };
    });
  }
  // Build a downloadable incentive PDF for one audience ("salesperson" | "manager").
  function buildIncentivePdf(who) {
    const stamp = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    const label = who === "manager" ? "Sales Manager" : "Sales Person";
    const dg = who === "manager" ? "dmgr" : "dsp";
    const devTbl = pTable(
      [{ label: "Device" }, { label: "Standard (L)", num: 1 }, { label: "Minimum (L)", num: 1 }, { label: "Std Incentive", num: 1 }, { label: "Min Incentive", num: 1 }, { label: "Above Standard" }],
      (D.incentives.device[who] || []).map((r) => `<tr><td>${esc(r.device)}</td><td class="num">${ovGet(`${dg}:${r.device}:standard`, r.standard) ?? "—"}</td><td class="num">${ovGet(`${dg}:${r.device}:minimum`, r.minimum) ?? "—"}</td><td class="num">${rupee(ovGet(`${dg}:${r.device}:stdIncentive`, r.stdIncentive))}</td><td class="num">${rupee(ovGet(`${dg}:${r.device}:minIncentive`, r.minIncentive))}</td><td>${esc(ovGet(`${dg}:${r.device}:aboveStd`, r.aboveStd) || "—")}</td></tr>`).join(""));
    const celKey = who === "manager" ? "managerIncentive" : "salespersonIncentive";
    const celTbl = pTable(
      [{ label: "Celluma model" }, { label: "Selling", num: 1 }, { label: label + " incentive", num: 1 }],
      D.incentives.celluma.map((r) => `<tr><td>${esc(r.model)}</td><td class="num">${rupee(ovGet(`cel:${r.model}:sellingPrice`, r.sellingPrice))}</td><td class="num">${rupee(ovGet(`cel:${r.model}:${celKey}`, r[celKey]))}</td></tr>`).join(""));
    const eg = who === "manager" ? "emgr" : "esp";
    const esthTbl = pTable(
      [{ label: "Tier" }, { label: "Boxes min", num: 1 }, { label: "Boxes max", num: 1 }, { label: "₹/Box", num: 1 }, { label: "Label" }],
      (D.incentives.esthemax[who] || []).map((x) => `<tr><td>${esc(x.tier)}</td><td class="num">${ovGet(`${eg}:${x.tier}:min`, x.min)}</td><td class="num">${esc(ovGet(`${eg}:${x.tier}:max`, x.max))}</td><td class="num">${rupee(ovGet(`${eg}:${x.tier}:incentive`, x.incentive))}</td><td>${esc(ovGet(`${eg}:${x.tier}:label`, x.label))}</td></tr>`).join(""));
    const terms = getTerms().map((sec) => `<h3>${esc(sec.title)}</h3><ul>${sec.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>`).join("");
    return `
      <div class="p-section">
        <h1>${esc(D.meta.company)} — ${label} Incentives</h1>
        <div class="p-sub">FY 2026-27 · Devices, Celluma &amp; Esthemax</div>
        <p class="p-meta">Generated ${esc(stamp)} · All figures excl. GST</p>
        <h2>Devices</h2>${devTbl}
        <h2>Celluma</h2>${celTbl}
        <h2>Esthemax (slab)</h2>${esthTbl}
      </div>
      <div class="p-section p-break">
        <h2>Incentive terms &amp; conditions</h2>${terms}
      </div>`;
  }
  function downloadIncentivePdf(who) {
    let area = document.getElementById("printArea");
    if (!area) { area = document.createElement("div"); area.id = "printArea"; document.body.appendChild(area); }
    area.innerHTML = buildIncentivePdf(who);
    document.body.classList.add("printing");
    const cleanup = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 40);
  }

  let incView = "device", incWho = "sales";
  const incMgr = () => incWho === "manager" && canSeeManagerInc();
  function renderIncentives() {
    if (incWho === "manager" && !canSeeManagerInc()) incWho = "sales";
    const refresh = () => { $("#incBody").innerHTML = incBody(); wireAccordion(); wireTermsEditor(); wireOverrides(); };
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
      const dlSp = document.getElementById("incDlSp");
      if (dlSp) dlSp.onclick = () => downloadIncentivePdf("salesperson");
      const dlMgr = document.getElementById("incDlMgr");
      if (dlMgr) dlMgr.onclick = () => downloadIncentivePdf("manager");
      wireAccordion();
      wireTermsEditor();
      wireOverrides();
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
        <div class="hq-actions">
          <button id="incDlSp" class="dl-btn" type="button" title="Download the Sales Person incentive sheet (PDF)">⬇ Sales Person (PDF)</button>
          ${canSeeManagerInc() ? `<button id="incDlMgr" class="dl-btn" type="button" title="Download the Manager incentive sheet (PDF)">⬇ Manager (PDF)</button>` : ""}
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
    const mk = (rows, g) => {
      const head = ["Device", "Quotation (L)", "Standard (L)", "Minimum (L)", "Std Incentive", "Min Incentive", "Above-Std"]
        .map((x, i) => `<th class="${i >= 1 && i <= 5 ? "num" : ""}">${x}</th>`).join("");
      const body = rows.map((r) => `<tr>
        <td class="t-name">${esc(r.device)}</td>
        <td class="num">${r.quotation ?? "—"}</td>
        ${ovNumCell(`${g}:${r.device}:standard`, r.standard)}
        ${ovNumCell(`${g}:${r.device}:minimum`, r.minimum)}
        ${ovNumCell(`${g}:${r.device}:stdIncentive`, r.stdIncentive, true)}
        ${ovNumCell(`${g}:${r.device}:minIncentive`, r.minIncentive, true)}
        ${ovTxtCell(`${g}:${r.device}:aboveStd`, r.aboveStd)}</tr>`).join("");
      return table(head, body);
    };
    const mgr = incMgr();
    return `
      ${isAdmin() ? `<div class="muted-note" style="margin-bottom:8px">Admin: incentive amounts below are editable — changes save for everyone and appear in the incentive PDFs.</div>` : ""}
      ${mgr
        ? `<div class="block"><h2>Sales Manager plan</h2>${mk(D.incentives.device.manager, "dmgr")}</div>`
        : `<div class="block"><h2>Sales Person plan</h2>${mk(D.incentives.device.salesperson, "dsp")}</div>`}`;
  }

  function cellumaIncentive() {
    const showMgr = canSeeManagerInc();
    const cols = ["Model", "Selling Price (excl. GST)", "Salesperson Incentive"].concat(showMgr ? ["Sales Manager Incentive"] : []);
    const head = cols.map((x, i) => `<th class="${i >= 1 ? "num" : ""}">${x}</th>`).join("");
    const body = D.incentives.celluma.map((r) => `<tr>
      <td class="t-name">${esc(r.model)}</td>
      ${ovNumCell(`cel:${r.model}:sellingPrice`, r.sellingPrice, true)}
      ${ovNumCell(`cel:${r.model}:salespersonIncentive`, r.salespersonIncentive, true)}
      ${showMgr ? ovNumCell(`cel:${r.model}:managerIncentive`, r.managerIncentive, true) : ""}</tr>`).join("");
    return `
      <div class="callout teal">Single Standard (selling) price per model; no minimum. Sales Manager incentive is a flat 50% of the salesperson standard.</div>
      ${table(head, body)}`;
  }

  function esthemaxIncentive() {
    const mk = (tiers, g) => {
      const head = ["Tier", "Boxes/Month (Min)", "Boxes/Month (Max)", "Incentive ₹/Box", "Tier Label"]
        .map((x, i) => `<th class="${i >= 1 && i <= 3 ? "num" : ""}">${x}</th>`).join("");
      const body = tiers.map((t) => `<tr>
        <td class="t-name">${esc(t.tier)}</td>
        ${ovNumCell(`${g}:${t.tier}:min`, t.min)}
        ${ovNumCell(`${g}:${t.tier}:max`, t.max)}
        ${ovNumCell(`${g}:${t.tier}:incentive`, t.incentive, true)}
        ${ovTxtCell(`${g}:${t.tier}:label`, t.label)}</tr>`).join("");
      return table(head, body);
    };
    const mgr = incMgr();
    return `
      <div class="callout">Hydrojelly 6-tier per-box slab. Threshold = monthly box achievement; incentive applied per box, retrospective to box 1.</div>
      ${mgr
        ? `<div class="block"><h2>Sales Manager slab</h2>${mk(D.incentives.esthemax.manager, "emgr")}</div>`
        : `<div class="block"><h2>Sales Person slab</h2>${mk(D.incentives.esthemax.salesperson, "esp")}</div>`}`;
  }

  function termsView() {
    const terms = getTerms();
    if (isAdmin()) {
      const sec = terms.map((s, si) => `
        <div class="card tc-card">
          <div class="tc-secrow">
            <input class="tc-title" data-si="${si}" value="${esc(s.title)}" placeholder="Section title">
            <button class="ghost-btn danger tc-sec-del" data-si="${si}" title="Remove section">✕ Section</button>
          </div>
          <ul class="tc-list">
            ${s.items.map((it, ii) => `<li class="tc-itemrow">
              <textarea class="tc-item" data-si="${si}" data-ii="${ii}" rows="2" placeholder="Term / condition…">${esc(it)}</textarea>
              <button class="ghost-btn danger tc-item-del" data-si="${si}" data-ii="${ii}" title="Remove point">✕</button>
            </li>`).join("")}
          </ul>
          <button class="ghost-btn tc-item-add" data-si="${si}" type="button">＋ Add point</button>
        </div>`).join("");
      return `<div class="muted-note" style="margin-bottom:10px">Editing incentive Terms &amp; Conditions — changes save for everyone and appear in the incentive PDFs.${termsOverride ? "" : " (Showing the built-in defaults; your first edit starts an editable copy.)"}</div>
        ${sec}
        <button id="tcAddSec" class="dl-btn" type="button">＋ Add section</button>`;
    }
    const items = terms.map((s, i) => `
      <div class="acc-item ${i === 0 ? "open" : ""}">
        <button class="acc-head">${esc(s.title)}<span class="chev">›</span></button>
        <div class="acc-body">
          <ul>${s.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>
        </div>
      </div>`).join("");
    return `<div class="accordion">${items}</div>`;
  }

  function refreshIncBody() {
    const b = document.getElementById("incBody");
    if (b) { b.innerHTML = incBody(); wireAccordion(); wireTermsEditor(); }
  }
  function wireTermsEditor() {
    if (incView !== "terms" || !isAdmin()) return;
    const ensure = () => { if (!Array.isArray(termsOverride)) termsOverride = JSON.parse(JSON.stringify(INCENTIVE_TERMS)); return termsOverride; };
    document.querySelectorAll(".tc-title").forEach((el) => {
      el.onchange = () => { const t = ensure(); t[+el.dataset.si].title = el.value; saveEdits("Terms · section title"); };
    });
    document.querySelectorAll(".tc-item").forEach((el) => {
      el.onchange = () => { const t = ensure(); t[+el.dataset.si].items[+el.dataset.ii] = el.value; saveEdits("Terms · point"); };
    });
    document.querySelectorAll(".tc-item-add").forEach((b) => {
      b.onclick = () => { const t = ensure(); t[+b.dataset.si].items.push("New point"); saveEdits("Terms · added point"); refreshIncBody(); };
    });
    document.querySelectorAll(".tc-item-del").forEach((b) => {
      b.onclick = () => { const t = ensure(); t[+b.dataset.si].items.splice(+b.dataset.ii, 1); saveEdits("Terms · removed point"); refreshIncBody(); };
    });
    document.querySelectorAll(".tc-sec-del").forEach((b) => {
      b.onclick = () => { if (!window.confirm("Remove this whole section?")) return; const t = ensure(); t.splice(+b.dataset.si, 1); saveEdits("Terms · removed section"); refreshIncBody(); };
    });
    const addSec = document.getElementById("tcAddSec");
    if (addSec) addSec.onclick = () => { const t = ensure(); t.push({ title: "New section", items: ["New point"] }); saveEdits("Terms · added section"); refreshIncBody(); };
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
  function buildPricePdf() {
    const stamp = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    const adm = priceAdmin();
    const devHead = [{ label: "Device" }].concat(adm ? [{ label: "Landing (L)", num: 1 }] : []).concat([{ label: "Quotation (L)", num: 1 }, { label: "Standard (L)", num: 1 }, { label: "Minimum (L)", num: 1 }]);
    const devBody = deviceList().map((r) => `<tr><td>${esc(r.device)}</td>${adm ? `<td class="num">${r.landingCost ?? "—"}</td>` : ""}<td class="num">${r.quotation ?? "—"}</td><td class="num">${r.standard ?? "—"}</td><td class="num">${r.minimum ?? "—"}</td></tr>`).join("");
    const celBody = (D.costs.celluma || []).map((r) => `<tr><td>${esc(r.model)}</td><td class="num">${rupee(r.quotation)}</td><td class="num">${rupee(r.selling)}</td></tr>`).join("");
    return `
      <div class="p-section">
        <h1>${esc(D.meta.company)} — Price List</h1>
        <div class="p-sub">Devices &amp; Celluma · FY 2026-27</div>
        <p class="p-meta">Generated ${esc(stamp)} · All values excl. GST${adm ? "" : " · Selling prices"}</p>
        <h2>Devices (₹ Lakhs)</h2>${pTable(devHead, devBody)}
        <h2>Celluma (₹)</h2>${pTable([{ label: "Model" }, { label: "Quotation", num: 1 }, { label: "Selling", num: 1 }], celBody)}
      </div>`;
  }
  function downloadPricePdf() {
    let area = document.getElementById("printArea");
    if (!area) { area = document.createElement("div"); area.id = "printArea"; document.body.appendChild(area); }
    area.innerHTML = buildPricePdf();
    document.body.classList.add("printing");
    const cleanup = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 40);
  }

  function renderPrices() {
    const refresh = () => { $("#priceBody").innerHTML = priceBody(); wirePriceAdd(); wireProfitCalc(); wireOverrides(); };
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
      wirePriceAdd(); wireProfitCalc(); wireOverrides();
      const pdl = document.getElementById("priceDl");
      if (pdl) pdl.onclick = () => downloadPricePdf();
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
        <div class="hq-actions"><button id="priceDl" class="dl-btn" type="button" title="Download the price list (PDF)">⬇ Price list (PDF)</button></div>
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
      ${adm ? ovNumCell(`pdev:${r.device}:landingCost`, r.landingCost) : ""}
      ${ovNumCell(`pdev:${r.device}:quotation`, r.quotation)}
      ${ovNumCell(`pdev:${r.device}:standard`, r.standard)}
      ${ovNumCell(`pdev:${r.device}:minimum`, r.minimum)}</tr>`).join("");
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
  // Download the current Esthemax market + group price list as an Excel file
  // (a wide price matrix reads far better in a spreadsheet than a printed PDF).
  function downloadEsthemaxPrice() {
    const m = D.esthemaxPrices[mkt];
    if (!m) { window.alert("No pricing data to download."); return; }
    const cols = m.columns, rows = m.groups[mktGroup] || [], band = m.band || [];
    let newStart = band.findIndex((b, i) => i > 2 && String(b).toLowerCase().includes("new"));
    if (newStart < 0) newStart = Math.floor(cols.length / 2);
    const colIdx = [];
    if (String(cols[2] || "").trim() !== "") colIdx.push(2);
    cols.forEach((c, i) => { if (i >= newStart && String(c).trim() !== "") colIdx.push(i); });
    const mrpCol = cols.findIndex((c, i) => i >= newStart && /^mrp$/i.test(String(c).trim()));
    const header = ["Sr", "Name"].concat(colIdx.map((i) => String(cols[i]).replace(/\n/g, " ").trim()));
    const aoa = [header];
    rows.forEach((r) => {
      const row = [r.srNo, r.name];
      colIdx.forEach((i) => { let v = r.values[i]; if (i === mrpCol && mrpCol >= 0) v = ovGet(`emrp:${mkt}:${mktGroup}:${r.srNo}`, v); row.push(v == null ? "" : v); });
      aoa.push(row);
    });
    const grpLabel = (MKT_GROUPS.find((g) => g.id === mktGroup) || {}).label || mktGroup;
    const fname = ("Esthemax_" + (mkt === "salon" ? "Salon" : "Doctor") + "_" + grpLabel + "_prices").replace(/[^\w]+/g, "_") + ".xlsx";
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = header.map((h) => ({ wch: Math.max(10, String(h).length + 1) }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Prices");
      window.XLSX.writeFile(wb, fname);
    } else {
      const csv = aoa.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = fname.replace(/\.xlsx$/, ".csv");
      a.click();
    }
  }

  function renderEsthemax() {
    const refresh = () => { $("#mktBody").innerHTML = mktBody(); wireOverrides(); };
    setTimeout(() => {
      wireOverrides();
      const edl = document.getElementById("esthPriceDl");
      if (edl) edl.onclick = () => downloadEsthemaxPrice();
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
        <div class="hq-actions"><button id="esthPriceDl" class="dl-btn" type="button" title="Download this Esthemax price list (Excel)">⬇ Price list (Excel)</button></div>
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

    const mrpCol = cols.findIndex((c, i) => i >= newStart && /^mrp$/i.test(String(c).trim()));
    const body = rows.map((r) => {
      const cells = colIdx.map((i) => {
        const v = r.values[i];
        if (i === 2) return `<td class="t-muted">${v == null ? "—" : esc(v)}</td>`;
        // MRP is admin-editable (stored as an override keyed by market/group/row).
        if (i === mrpCol && mrpCol >= 0) {
          const key = `emrp:${mkt}:${mktGroup}:${r.srNo}`;
          const eff = ovGet(key, v);
          return isAdmin()
            ? `<td class="num"><input class="ov-in" data-key="${esc(key)}" data-t="num" type="number" step="1" value="${eff == null || eff === "" ? "" : esc(eff)}" style="max-width:90px"></td>`
            : `<td class="num">${isNum(eff) ? inr(eff) : (eff == null ? "—" : esc(eff))}</td>`;
        }
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
  const demoRemovals = { current: [], status: [], movement: [], packing: [] }; // base row indices removed by admin
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
    // Delete-row button on the first cell of every row (base + added).
    const rm = c === 0 ? `<button class="linkish demo-rm" data-id="${rid}" title="Remove this row">✕</button> ` : "";
    if (DATE_COLS.test(colName)) {
      return `<td class="${cls}">${rm}<input class="demo-date" type="date" data-r="${rid}" data-c="${c}" value="${esc(val)}"></td>`;
    }
    if (FREE_TEXT_COLS.test(colName)) {
      return `<td class="${cls}">${rm}<input class="demo-text" type="text" data-r="${rid}" data-c="${c}" value="${esc(val)}"></td>`;
    }
    const opts = demoOptions(colName, c, val, rid);
    const optionHtml = `<option value=""${val ? "" : " selected"}>—</option>` +
      opts.map((o) => `<option${o === val ? " selected" : ""}>${esc(o)}</option>`).join("") +
      (PERSON_COLS.test(colName) ? `<option value="__add__">＋ Add new…</option>` : "");
    return `<td class="${cls}">${rm}<select class="demo-select ${sc}" data-r="${rid}" data-c="${c}">${optionHtml}</select></td>`;
  }

  function demoTable() {
    const t = D.demoMachines[demoView];
    const ed = isAdmin();
    const head = t.columns.map((c) => `<th>${esc(demoColLabel(c))}</th>`).join("");
    const scIdx = demoStatusColIdx();
    const gone = demoRemovals[demoView] || [];
    let ids = t.rows.map((_, i) => String(i)).filter((rid) => !gone.includes(+rid)).concat((demoAdds[demoView] || []).map((x) => x.id));
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
    const goneF = demoRemovals[demoView] || [];
    const ids = t.rows.map((_, i) => String(i)).filter((rid) => !goneF.includes(+rid)).concat((demoAdds[demoView] || []).map((x) => x.id));
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
        const id = b.dataset.id;
        const label = demoRowLabel(id);
        if (!window.confirm("Remove this row" + (label ? " (" + label + ")" : "") + "?")) return;
        if (String(id).startsWith("a")) {
          demoAdds[demoView] = demoAdds[demoView].filter((x) => x.id !== id);
        } else if (!(demoRemovals[demoView] || []).includes(+id)) {
          (demoRemovals[demoView] = demoRemovals[demoView] || []).push(+id);
        }
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
  let payFilter = { cat: "", hq: "", sp: "", status: "", q: "", from: "", to: "", due: "", emi: "" };
  let payColFilters = {}; // Excel-style per-column filters on the detailed report
  let paySnapshots = [];  // [{at, by, total, rows, cust:{name:outstanding}}] — one per import, for collection tracking
  let payClearBefore = ""; // admin: hide commitments committed before this date
  let payHideAll = false;  // admin: "clear all" — hide every commitment
  let payHideBase = false; // after a Replace import: show only imported rows (hide the 232 built-in)
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
    const received = payNum(r.received);
    const out = payNum(r.outstanding);
    const ca = payNum(r.committedAmount);
    // Pending (balance still to collect). Finance sheets put the NET balance in
    // the Outstanding column (it differs from Committed Amount, which is often
    // blank); base data puts the GROSS commitment in both, so there we net off
    // what's received. This makes Pending match the sheet's Outstanding total.
    let pending;
    if (out > 0 && (ca === 0 || out !== ca)) pending = out;                 // net balance given
    else pending = Math.max(Math.max(ca, out) - received, 0);              // gross − received
    const committed = pending + received;                                  // total billed/committed
    let status = "grey", daysOverdue = 0;
    if (committed <= 0) status = "grey";
    else if (pending <= 0) status = "green";       // fully collected
    else if (received > 0) status = "yellow";      // partial
    else if (!r.committedDate) status = "grey";
    else {
      const cd = new Date(r.committedDate);
      const diff = Math.round((payToday() - cd) / 86400000);
      if (diff > 0) { status = "red"; daysOverdue = diff; } else status = "blue";
    }
    // Due days: use the sheet value if given, else compute from committed date.
    let dueDays;
    if (r.dueDays !== "" && r.dueDays != null && !isNaN(parseFloat(r.dueDays))) dueDays = Math.round(parseFloat(r.dueDays));
    else if (r.committedDate) dueDays = Math.round((payToday() - new Date(r.committedDate)) / 86400000);
    else dueDays = 0;
    // Machine install status → "Installed" / "Pending" / "".
    const ms = String(r.machineStatus || "");
    const machineStatus = /install/i.test(ms) ? "Installed" : /pend/i.test(ms) ? "Pending" : "";
    // Normalize the salesperson to the proper roster name (imports + base data).
    const salesPerson = properPersonName(r.salesPerson);
    return Object.assign({}, r, { salesPerson, committed, received, pending, status, daysOverdue, dueDays, machineStatus });
  }
  const payAll = () => {
    if (payHideAll) return [];
    const base = payHideBase ? [] : (D.payments || []);
    return base.concat(paymentAdds).map(payEnrich)
      // "Clear data (by date)": hide dated commitments before the admin's cutoff.
      .filter((r) => !payClearBefore || !r.committedDate || String(r.committedDate).slice(0, 10) >= payClearBefore);
  };
  const payUniq = (arr, key) => Array.from(new Set(arr.map((x) => x[key]).filter(Boolean))).sort();

  // Date used by the top date-range filter & period note = payment RECEIVED date
  // (committed dates in finance's sheet are unreliable).
  const payCd = (r) => (r.receivedDate ? String(r.receivedDate).slice(0, 10) : "");
  function payFiltered(rows) {
    return rows.filter((d) => {
      if (payFilter.cat && d.category !== payFilter.cat) return false;
      if (payFilter.hq && d.hq !== payFilter.hq) return false;
      if (payFilter.sp && d.salesPerson !== payFilter.sp) return false;
      if (payFilter.status && d.status !== payFilter.status) return false;
      // EMI filter: "emi" = rows with EMI details, "nonemi" = rows without.
      if (payFilter.emi === "emi" && !String(d.emi || "").trim()) return false;
      if (payFilter.emi === "nonemi" && String(d.emi || "").trim()) return false;
      // Commitment-date range (dated rows only when a range is set).
      if (payFilter.from || payFilter.to) {
        const cd = payCd(d);
        if (!cd) return false;
        if (payFilter.from && cd < payFilter.from) return false;
        if (payFilter.to && cd > payFilter.to) return false;
      }
      // 30-day due filter: Consumables & Esthemax by due days; Machines by
      // install status (Pending = below 30 group, Installed = above 30 group).
      if (payFilter.due) {
        const cat = String(d.category || "").toLowerCase();
        const isCE = cat.includes("consumable") || cat.includes("esthemax");
        const isMachine = cat.includes("machine");
        const dd = typeof d.dueDays === "number" ? d.dueDays : 0;
        const ms = (d.machineStatus || "").toLowerCase();
        if (payFilter.due === "below30") {
          if (!((isCE && dd < 30) || (isMachine && ms === "pending"))) return false;
        } else if (payFilter.due === "above30") {
          if (!((isCE && dd >= 30) || (isMachine && ms === "installed"))) return false;
        }
      }
      if (payFilter.q) {
        const hay = `${d.customer} ${d.product || ""} ${d.hq} ${d.salesPerson} ${d.category} ${d.invoiceNo || ""} ${d.remark}`.toLowerCase();
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
    const emiN = rows.filter((r) => String(r.emi || "").trim()).length;
    const nonN = rows.length - emiN;
    const emiRow = `<div class="pay-chips" style="margin-top:8px">
      <button data-payemi="" class="pay-chip ${payFilter.emi ? "" : "active"}">All<span class="pay-chip-n">${rows.length}</span></button>
      <button data-payemi="emi" class="pay-chip b-accent ${payFilter.emi === "emi" ? "active" : ""}">EMI<span class="pay-chip-n">${emiN}</span></button>
      <button data-payemi="nonemi" class="pay-chip ${payFilter.emi === "nonemi" ? "active" : ""}">Non-EMI<span class="pay-chip-n">${nonN}</span></button>
    </div>`;
    return `<div class="pay-chips">
      <button data-paystatus="" class="pay-chip ${payFilter.status ? "" : "active"}">All<span class="pay-chip-n">${rows.length}</span></button>
      ${PAY_ORDER.map(chip).join("")}</div>${emiRow}`;
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

  // Earliest → latest committed date in the current (filtered) view.
  function payDateRangeNote(rows) {
    const dated = rows.map((r) => payCd(r)).filter(Boolean).sort();
    const noDate = rows.length - dated.length;
    if (!dated.length) return `No received dates in view${noDate ? ` · ${noDate} with no received date` : ""}`;
    return `Received dates: <b>${esc(fmtDate(dated[0]))}</b> → <b>${esc(fmtDate(dated[dated.length - 1]))}</b>${noDate ? ` · ${noDate} not yet received` : ""}`;
  }

  // Text shown in each report column, used by the per-column filters.
  function payCellText(r, ci) {
    switch (ci) {
      case 0: return r.customer || "";
      case 1: return r.product || "";
      case 2: return r.invoiceNo || "";
      case 3: return r.invoiceDate ? fmtDate(r.invoiceDate) : "";
      case 4: return r.category || "";
      case 5: return r.hq || "";
      case 6: return r.salesPerson || "";
      case 7: return r.committedDate ? fmtDate(r.committedDate) : "no date";
      case 8: return typeof r.dueDays === "number" ? String(r.dueDays) : "";
      case 9: return r.salesValue ? String(r.salesValue) : "";
      case 10: return String(r.committed || "");
      case 11: return String(r.received || "");
      case 12: return String(r.pending || "");
      case 13: return r.machineStatus || "";
      case 14: return (PAY_STATUS[r.status] || {}).label || "";
      case 15: return r.remark || "";
      case 16: return r.receivedDate ? fmtDate(r.receivedDate) : "";
      case 17: return r.emi || "";
      default: return "";
    }
  }
  function applyColFilters(rows) {
    const active = Object.entries(payColFilters).filter(([, v]) => v !== "" && v != null);
    if (!active.length) return rows;
    return rows.filter((r) => active.every(([ci, val]) => payCellText(r, +ci).toLowerCase().includes(String(val).toLowerCase())));
  }
  // The Excel-style filter row (one control per column) under the report header.
  function payColFilterRow(rows0) {
    const sel = (i, opts) => `<th><select class="pay-cf select" data-ci="${i}" style="width:100%;min-width:90px;font-weight:400"><option value="">All</option>${opts.map((o) => `<option${String(payColFilters[i] || "") === String(o) ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></th>`;
    const txt = (i, ph) => `<th><input class="pay-cf" type="search" data-ci="${i}" value="${esc(payColFilters[i] || "")}" placeholder="${esc(ph)}" style="width:100%;min-width:70px;font-weight:400"></th>`;
    return `<tr class="pay-cf-row">${txt(0, "Customer")}${txt(1, "Product")}${txt(2, "Invoice")}${txt(3, "Date")}${sel(4, payUniq(rows0, "category"))}${sel(5, payUniq(rows0, "hq"))}${sel(6, payUniq(rows0, "salesPerson"))}${txt(7, "Date")}${txt(8, "Days")}${txt(9, "₹")}${txt(10, "₹")}${txt(11, "₹")}${txt(12, "₹")}${sel(13, ["Installed", "Pending"])}${sel(14, PAY_ORDER.map((s) => PAY_STATUS[s].label))}${txt(15, "Remark")}${txt(16, "Date")}${txt(17, "EMI")}`;
  }

  function payTableRows(rows) {
    const sorted = rows.slice().sort((a, b) => {
      const ra = PAY_ORDER.indexOf(a.status), rb = PAY_ORDER.indexOf(b.status);
      if (ra !== rb) return ra - rb;
      return b.daysOverdue - a.daysOverdue || b.pending - a.pending;
    });
    if (!sorted.length) return `<tr><td colspan="18" class="empty" style="text-align:center;padding:18px">No commitments match the current filters.</td></tr>`;
    return sorted.map((r) => {
      const m = PAY_STATUS[r.status];
      const mst = r.machineStatus ? `<span class="pay-badge ${r.machineStatus === "Installed" ? "pay-green" : "pay-yellow"}">${esc(r.machineStatus)}</span>` : "<span class='t-muted'>—</span>";
      return `<tr>
        <td class="t-name">${esc(r.customer || "—")}</td>
        <td>${r.product ? esc(r.product) : "<span class='t-muted'>—</span>"}</td>
        <td>${r.invoiceNo ? esc(r.invoiceNo) : "<span class='t-muted'>—</span>"}</td>
        <td>${r.invoiceDate ? esc(fmtDate(r.invoiceDate)) : "<span class='t-muted'>—</span>"}</td>
        <td>${esc(r.category || "—")}</td>
        <td>${esc(r.hq || "—")}</td>
        <td>${esc(r.salesPerson || "—")}</td>
        <td>${r.committedDate ? esc(fmtDate(r.committedDate)) : "<span class='t-muted'>no date</span>"}</td>
        <td class="num">${typeof r.dueDays === "number" ? r.dueDays : "—"}</td>
        <td class="num">${r.salesValue ? rupee(r.salesValue) : "—"}</td>
        <td class="num">${rupee(r.committed)}</td>
        <td class="num">${rupee(r.received)}</td>
        <td class="num">${r.pending ? rupee(r.pending) : "—"}</td>
        <td>${mst}</td>
        <td><span class="pay-badge ${m.cls}">${m.label}${r.status === "red" ? " · " + r.daysOverdue + "d" : ""}</span></td>
        <td class="t-muted">${esc(r.remark || "")}</td>
        <td>${r.receivedDate ? esc(fmtDate(r.receivedDate)) : "<span class='t-muted'>—</span>"}</td>
        <td class="t-muted">${esc(r.emi || "")}</td></tr>`;
    }).join("");
  }

  // Totals footer for the detailed report — Total Commitment / Received / Pending.
  function payTotalsRow(rows) {
    const c = rows.reduce((a, r) => a + r.committed, 0);
    const rec = rows.reduce((a, r) => a + r.received, 0);
    const pen = rows.reduce((a, r) => a + r.pending, 0);
    const sv = rows.reduce((a, r) => a + (payNum(r.salesValue) || 0), 0);
    return `<tr class="pay-totals">
      <td colspan="9" class="num"><b>Total — ${rows.length} commitment${rows.length === 1 ? "" : "s"}</b></td>
      <td class="num"><b>${sv ? rupee(sv) : "—"}</b></td>
      <td class="num"><b>${rupee(c)}</b></td>
      <td class="num"><b>${rupee(rec)}</b></td>
      <td class="num"><b>${pen ? rupee(pen) : "—"}</b></td>
      <td colspan="5"></td></tr>`;
  }

  // Record the just-imported data as a dated snapshot: total outstanding + a
  // per-customer breakdown, so later imports can show how much was collected.
  function payCaptureSnapshot() {
    const rows = paymentAdds.map(payEnrich);
    const cust = {};
    let total = 0;
    rows.forEach((r) => { const c = (r.customer || "—").trim(); cust[c] = (cust[c] || 0) + r.pending; total += r.pending; });
    paySnapshots.push({ at: Date.now(), by: (sessionUser && sessionUser.email) || "", total: Math.round(total), rows: rows.length, cust });
    if (paySnapshots.length > 12) paySnapshots = paySnapshots.slice(-12); // keep last 12
  }
  // Compare the latest two snapshots → who paid, how much, since when.
  function payCollections() {
    if (paySnapshots.length < 2) return null;
    const cur = paySnapshots[paySnapshots.length - 1];
    const prev = paySnapshots[paySnapshots.length - 2];
    const rows = [];
    const names = new Set(Object.keys(prev.cust).concat(Object.keys(cur.cust)));
    names.forEach((c) => {
      const before = prev.cust[c] || 0, after = cur.cust[c] || 0;
      const collected = before - after;
      if (collected > 0.5) rows.push({ customer: c, before, after, collected });
    });
    rows.sort((a, b) => b.collected - a.collected);
    return { prev, cur, rows, totalCollected: rows.reduce((a, r) => a + r.collected, 0) };
  }

  // The "Collections & outstanding trend" card: what was paid since the last
  // import, per customer, plus the total-outstanding history across imports.
  function payCollectionsCard() {
    const col = payCollections();
    const trend = paySnapshots.slice().reverse(); // newest first
    const cFrom = payFilter.from, cTo = payFilter.to;
    const ranged = !!(cFrom || cTo);
    let summary;
    if (ranged) {
      // Actual money RECEIVED in the chosen date range (by payment received
      // date) — computed from the payment records, not from the last upload.
      const byC = {};
      payAll().forEach((r) => {
        const rd = r.receivedDate ? String(r.receivedDate).slice(0, 10) : "";
        if (!rd || (cFrom && rd < cFrom) || (cTo && rd > cTo)) return;
        const amt = payNum(r.received); if (!(amt > 0)) return;
        const c = (r.customer || "—").trim();
        const o = byC[c] || (byC[c] = { customer: c, collected: 0, sp: r.salesPerson || "", hq: r.hq || "", rd: rd });
        o.collected += amt; if (rd > o.rd) o.rd = rd;
        if (!o.sp && r.salesPerson) o.sp = r.salesPerson;
        if (!o.hq && r.hq) o.hq = r.hq;
      });
      const crows = Object.values(byC).sort((a, b) => b.collected - a.collected);
      const total = crows.reduce((a, r) => a + r.collected, 0);
      const body = crows.slice(0, 300).map((r) => `<tr>
        <td class="t-name">${esc(r.customer)}</td>
        <td>${esc(r.sp ? spLabel(r.sp) : "—")}</td>
        <td>${esc(r.hq || "—")}</td>
        <td class="num" style="color:var(--good);font-weight:700">${rupeeShort(r.collected)}</td>
        <td>${r.rd ? esc(fmtDate(r.rd)) : "—"}</td></tr>`).join("")
        || `<tr><td colspan="5" class="empty">No payments received in this date range.</td></tr>`;
      summary = `<p>Collected <b style="color:var(--good)">${rupeeShort(total)}</b> across <b>${crows.length}</b> customer(s)${cFrom ? " from <b>" + esc(cFrom) + "</b>" : ""}${cTo ? " to <b>" + esc(cTo) + "</b>" : ""} — actual payments received in this period (by received date). Change the <b>date range</b> in the filter bar above.</p>
        <div class="table-wrap"><table><thead><tr><th>Customer (doctor/clinic)</th><th>Sales Person</th><th>State</th><th class="num">Collected</th><th>Collected on</th></tr></thead><tbody>${body}</tbody></table></div>`;
    } else if (!col) {
      summary = `<p class="muted-note">This shows how much outstanding was <b>collected</b> and <b>when</b>. Import your sheet now, then again after payments come in — the drop per customer will appear here. Or set a <b>date range</b> in the filter bar above to see actual payments received in a period. Snapshots so far: <b>${paySnapshots.length}</b>.</p>`;
    } else {
      // No date range: show the drop since the previous upload (snapshot diff).
      const meta = {};
      payAll().forEach((r) => {
        const c = (r.customer || "—").trim(); if (!c) return;
        const m = meta[c] || (meta[c] = { sp: r.salesPerson || "", hq: r.hq || "", rd: "" });
        if (!m.sp && r.salesPerson) m.sp = r.salesPerson;
        if (!m.hq && r.hq) m.hq = r.hq;
        const rd = r.receivedDate ? String(r.receivedDate).slice(0, 10) : "";
        if (rd && rd > m.rd) m.rd = rd;
      });
      const body = col.rows.slice(0, 200).map((r) => { const mm = meta[r.customer] || {}; return `<tr>
        <td class="t-name">${esc(r.customer)}</td>
        <td>${esc(mm.sp ? spLabel(mm.sp) : "—")}</td>
        <td>${esc(mm.hq || "—")}</td>
        <td class="num">${rupeeShort(r.before)}</td>
        <td class="num">${rupeeShort(r.after)}</td>
        <td class="num" style="color:var(--good);font-weight:700">↓ ${rupeeShort(r.collected)}</td>
        <td>${mm.rd ? esc(fmtDate(mm.rd)) : "—"}</td></tr>`; }).join("")
        || `<tr><td colspan="7" class="empty">No outstanding decreased since the previous import.</td></tr>`;
      summary = `<p>Since the previous update (<b>${esc(fmtWhen(col.prev.at))}</b> → <b>${esc(fmtWhen(col.cur.at))}</b>): collected <b style="color:var(--good)">${rupeeShort(col.totalCollected)}</b> across <b>${col.rows.length}</b> customer(s). Set a <b>date range</b> in the filter bar above to see actual payments received in a specific period.</p>
        <div class="table-wrap"><table><thead><tr><th>Customer (doctor/clinic)</th><th>Sales Person</th><th>State</th><th class="num">Outstanding was</th><th class="num">Now</th><th class="num">Collected</th><th>Collected on</th></tr></thead><tbody>${body}</tbody></table></div>`;
    }
    const trendRows = trend.map((s, i) => {
      const older = trend[i + 1];
      const change = older ? (older.total - s.total) : null; // +ve = collected since older
      const chCell = change == null ? "—"
        : change > 0.5 ? `<span style="color:var(--good)">↓ ${rupeeShort(change)}</span>`
        : change < -0.5 ? `<span style="color:var(--bad)">↑ ${rupeeShort(-change)}</span>` : "—";
      return `<tr><td>${esc(fmtWhen(s.at))}</td><td class="t-muted">${esc(s.by || "")}</td><td class="num">${s.rows}</td><td class="num">${rupeeShort(s.total)}</td><td class="num">${chCell}</td></tr>`;
    }).join("");
    return `<div class="card" style="margin-top:16px">
      <h2 style="margin-top:0">💰 Collections &amp; outstanding trend</h2>
      ${summary}
      ${trend.length ? `<h3 style="margin:16px 0 6px">Total outstanding at each update</h3>
      <div class="table-wrap"><table><thead><tr><th>Update (import)</th><th>By</th><th class="num">Rows</th><th class="num">Total outstanding</th><th class="num">Collected since prev</th></tr></thead><tbody>${trendRows}</tbody></table></div>` : ""}
    </div>`;
  }

  function payRepaint() {
    // Every summary reflects BOTH the top-bar filters and the per-column
    // filters, so totals (Committed/Received/Pending) always match the report.
    const rep = applyColFilters(payFiltered(payAll()));
    const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    setHtml("payKpis", payKpis(rep));
    setHtml("payChips", payStatusChips(rep));
    setHtml("payBody", payTableRows(rep));
    setHtml("payTotals", payTotalsRow(rep));
    const dc = document.getElementById("payDrillCount"); if (dc) dc.textContent = rep.length + " records";
    const dr = document.getElementById("payDateRange"); if (dr) dr.innerHTML = payDateRangeNote(rep);
    const ss = document.getElementById("payStatusSel"); if (ss) ss.value = payFilter.status; // keep in sync with chips
    wirePayChips();
    enhanceTables(); // re-add the "Filter this table…" box to the re-rendered breakdown tables
  }
  function wirePayChips() {
    document.querySelectorAll("[data-paystatus]").forEach((b) => {
      b.onclick = () => { payFilter.status = b.dataset.paystatus; payRepaint(); };
    });
    document.querySelectorAll("[data-payemi]").forEach((b) => {
      b.onclick = () => { payFilter.emi = b.dataset.payemi; payRepaint(); };
    });
  }

  // ---- Excel / CSV import (append) + template ----
  const PAY_HEADERS = ["Category", "HQ", "Sales Person", "Customer", "Committed Date", "Invoice No.", "Invoice Date", "Due Days", "Machine Status", "Product Sold", "Sales Value", "Outstanding", "Committed Amount", "Received", "Received Date", "EMI", "Remark", "Line Items"];
  function payNormDate(v) {
    if (!v) return "";
    if (v instanceof Date && !isNaN(v)) {
      const p = (n) => String(n).padStart(2, "0");
      // Excel dates come through as UTC midnight — use UTC parts so the day
      // doesn't shift by one in some timezones.
      return `${v.getUTCFullYear()}-${p(v.getUTCMonth() + 1)}-${p(v.getUTCDate())}`;
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
      invoiceNo: String(g("invoiceno", "invoice", "invno", "billno", "invoicenumber") || "").trim(),
      invoiceDate: payNormDate(g("invoicedate", "billdate", "invdate")),
      dueDays: g("duedays", "creditdays", "days", "outstandingdays"),
      machineStatus: String(g("machinestatus", "installstatus", "installationstatus", "machineinstalledorpending", "installedpending") || "").trim(),
      product: String(g("productsold", "productname", "product", "item", "description", "itemname") || "").trim(),
      salesValue: payNum(g("salesvalue", "salevalue", "sales", "dealvalue", "ordervalue", "invoicevalue")),
      outstanding: payNum(g("outstanding", "balance", "outstandingamount")),
      committedAmount: payNum(g("committedamount", "committed", "promisedamount", "amount")),
      received: payNum(g("received", "amountreceived", "collected", "receivedamount")),
      receivedDate: payNormDate(g("receiveddate", "paymentreceiveddate", "paymentdate", "collecteddate", "receiptdate")),
      emi: String(g("emi", "emidetails", "emiplan", "installment") || "").trim(),
      remark: String(g("remark", "remarks", "note", "notes", "comment") || "").trim(),
      lineItems: payNum(g("lineitems", "items", "noofitems")),
    };
  }
  // Broad key: only rows identical across ALL these fields count as duplicates,
  // so legit multiple rows per customer/invoice (partial receipts, line items)
  // are NOT dropped.
  const payKey = (r) => [r.category, r.customer, r.committedDate, r.invoiceNo || "", r.committedAmount, r.received, r.outstanding, r.salesValue || "", r.remark || ""].join("|").toLowerCase();
  // replace=true → the file becomes the imported set (recommended for master
  // sheets); replace=false → append only rows not already present.
  function payAppend(mapped, replace) {
    // Importing new data should always be visible — clear any "clear data" hide.
    payHideAll = false; payClearBefore = "";
    const valid = mapped.filter((r) => r.customer || r.committedAmount || r.outstanding || r.received || r.salesValue);
    if (replace) {
      paymentAdds.length = 0;
      valid.forEach((r) => paymentAdds.push(r));
      payHideBase = true; // show ONLY this file — hide the 232 built-in rows
      payCaptureSnapshot(); // record this import as a dated snapshot (for collections)
      saveEdits(`Payments · imported ${valid.length} row(s) (replaced previous imports)`);
      payRepaint();
      window.alert(`Imported ${valid.length} row(s), replacing any previously-imported data.` + (mapped.length - valid.length ? ` ${mapped.length - valid.length} blank row(s) skipped.` : ""));
      return;
    }
    const seen = new Set(payAll().map(payKey));
    let added = 0;
    valid.forEach((r) => { const k = payKey(r); if (!seen.has(k)) { seen.add(k); paymentAdds.push(r); added++; } });
    saveEdits(`Payments · appended ${added} new row(s)`);
    payRepaint();
    window.alert(`Imported ${added} new commitment row(s).` + (valid.length - added ? ` ${valid.length - added} already present (skipped).` : ""));
  }
  function payParseCSV(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) return [];
    const split = (line) => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; };
    const heads = split(lines[0]);
    return lines.slice(1).map((l) => { const cells = split(l); const o = {}; heads.forEach((h, i) => (o[h] = cells[i] != null ? cells[i] : "")); return o; });
  }
  function payImport(file, replace) {
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
        payAppend(rows.map(payMapRow), replace);
      } catch (err) { window.alert("Could not read the file: " + (err.message || err)); }
    };
    if (isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file);
  }
  function payDownloadTemplate() {
    const sample = ["Consumables", "Telangana", "Vamsi", "Sample Clinic (delete this row)", "2026-09-15", "INV-001", "2026-08-15", 25, "", "Hydrojelly Mask 850ml", 60000, 50000, 50000, 0, "2026-09-20", "", "By mid September", 2];
    const sample2 = ["Machine", "Karnataka", "Sushma S", "Sample Hospital (delete this row)", "2026-07-10", "INV-002", "2026-07-10", 45, "Pending", "Celluma Pro", 4500000, 4000000, 4000000, 0, "", "6 EMIs × ₹5L/month", "Awaiting installation", 1];
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([PAY_HEADERS, sample, sample2]);
      ws["!cols"] = PAY_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Commitments");
      window.XLSX.writeFile(wb, "payment_commitments_template.xlsx");
    } else {
      const csv = [PAY_HEADERS.join(","), sample.join(","), sample2.join(",")].join("\n");
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
      wire("payStatusSel", (e) => { payFilter.status = e.target.value; payRepaint(); });
      wire("payDueSel", (e) => { payFilter.due = e.target.value; payRepaint(); });
      wire("payFrom", (e) => { payFilter.from = e.target.value; payRepaint(); });
      wire("payTo", (e) => { payFilter.to = e.target.value; payRepaint(); });
      const s = document.getElementById("paySearch");
      if (s) s.oninput = (e) => { payFilter.q = e.target.value.toLowerCase(); payRepaint(); };
      // Explicit Apply — re-reads every control and applies (works even if a
      // dropdown's change event didn't fire).
      const applyBtn = document.getElementById("payApply");
      if (applyBtn) applyBtn.onclick = () => {
        const gv = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
        payFilter.cat = gv("payCat"); payFilter.hq = gv("payHq"); payFilter.sp = gv("paySp");
        payFilter.status = gv("payStatusSel"); payFilter.due = gv("payDueSel");
        payFilter.from = gv("payFrom"); payFilter.to = gv("payTo");
        payFilter.q = (gv("paySearch") || "").toLowerCase();
        payRepaint();
      };
      const tpl = document.getElementById("payTplBtn"); if (tpl) tpl.onclick = payDownloadTemplate;
      const up = document.getElementById("payUpload");
      if (up) up.onchange = (e) => {
        const f = e.target.files[0];
        if (f) {
          // Always REPLACE — re-importing refreshes the data instead of stacking
          // duplicates. Upload your full current sheet each time.
          if (window.confirm('Import "' + f.name + '"?\n\nThis REPLACES the current payment data with this file. Re-importing will not duplicate rows — always upload your full current sheet.')) payImport(f, true);
        }
        e.target.value = "";
      };
      // Excel-style per-column filters on the detailed report.
      document.querySelectorAll(".pay-cf").forEach((el) => {
        const handler = () => { payColFilters[el.dataset.ci] = el.value; payRepaint(); };
        if (el.tagName === "SELECT") el.onchange = handler; else el.oninput = handler;
      });
      const clr = document.getElementById("payClearFilters");
      if (clr) clr.onclick = () => { payFilter = { cat: "", hq: "", sp: "", status: "", q: "", from: "", to: "", due: "", emi: "" }; payColFilters = {}; renderTab("payments"); };
      const clearOld = document.getElementById("payClearOld");
      if (clearOld) clearOld.onclick = () => {
        const ans = window.prompt(
          "Clear commitment data (applies for everyone):\n\n" +
          "• Type ALL to clear ALL commitment data.\n" +
          "• Enter a date (YYYY-MM-DD) to clear commitments committed BEFORE it.\n" +
          "• Leave blank to restore everything.",
          payHideAll ? "ALL" : (payClearBefore || ""));
        if (ans === null) return;
        const v = ans.trim();
        if (/^all$/i.test(v)) {
          if (!window.confirm("Clear ALL commitment data (hide every commitment for everyone)? You can restore it later with “Show all again”.")) return;
          payHideAll = true; payClearBefore = "";
          saveEdits("Cleared ALL payment data");
          renderTab("payments"); return;
        }
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) { window.alert("Enter ALL, a date as YYYY-MM-DD (e.g. 2026-04-01), or leave blank."); return; }
        if (v && !window.confirm("Clear all commitments committed before " + v + " (for everyone)? Imported rows before this date are removed; you can restore the view with “Show all”.")) return;
        payHideAll = false; payClearBefore = v;
        // Drop imported rows before the cutoff too.
        if (v) { for (let i = paymentAdds.length - 1; i >= 0; i--) { const cd = paymentAdds[i].committedDate ? String(paymentAdds[i].committedDate).slice(0, 10) : ""; if (cd && cd < v) paymentAdds.splice(i, 1); } }
        saveEdits(v ? "Cleared payment data before " + v : "Restored all payment data");
        renderTab("payments");
      };
      const showAll = document.getElementById("payShowAll");
      if (showAll) showAll.onclick = () => { payClearBefore = ""; payHideAll = false; saveEdits("Restored all payment data"); renderTab("payments"); };
      const showBase = document.getElementById("payShowBase");
      if (showBase) showBase.onclick = () => { payHideBase = false; saveEdits("Showing built-in data too"); renderTab("payments"); };
      payRepaint(); // sync KPIs/report/totals to current filters on first paint
    }, 0);
    const opt = (v, cur) => `<option${v === cur ? " selected" : ""}>${esc(v)}</option>`;
    const sel = (id, cur, values, allLabel) => `<label class="ord-field"><span>${esc(allLabel)}</span><select id="${id}" class="select"><option value="">All</option>${values.map((v) => opt(v, cur)).join("")}</select></label>`;
    return `
      <div class="section-head">
        <h1>Outstanding Payments</h1>
        <p>Outstanding customer commitments &amp; collection status across Consumables, Machine and Esthemax. Overdue is calculated against today. ${admin ? "Import replaces the data with your uploaded sheet, so re-importing never creates duplicates — always upload your full current sheet." : "Read-only."}</p>
        <div class="callout" style="margin-top:8px;display:inline-flex;align-items:center;gap:8px;font-size:14px">📅 <span><b>Period of this data:</b> ${payDateRangeNote(rows0)} · <b>${rows0.length}</b> records</span></div>
      </div>
      <div id="payKpis">${payKpis(rows0)}</div>
      <div id="payChips">${payStatusChips(rows0)}</div>
      <div class="controls" style="margin-top:14px">
        <input id="paySearch" class="search" type="search" placeholder="Search customer, HQ, rep, remark…" value="${esc(payFilter.q)}">
        ${sel("payCat", payFilter.cat, payUniq(rows0, "category"), "Category")}
        ${sel("payHq", payFilter.hq, payUniq(rows0, "hq"), "HQ")}
        <label class="ord-field"><span>Sales Person</span><select id="paySp" class="select"><option value="">All</option>${payUniq(rows0, "salesPerson").map((v) => `<option value="${esc(v)}"${v === payFilter.sp ? " selected" : ""}>${esc(spLabel(v))}</option>`).join("")}</select></label>
        <label class="ord-field"><span>Status</span><select id="payStatusSel" class="select"><option value="">All</option>${PAY_ORDER.map((s) => `<option value="${s}"${payFilter.status === s ? " selected" : ""}>${esc(PAY_STATUS[s].label)}</option>`).join("")}</select></label>
        <label class="ord-field"><span>Due period</span><select id="payDueSel" class="select"><option value="">All</option><option value="below30"${payFilter.due === "below30" ? " selected" : ""}>Below 30 days / Pending machines</option><option value="above30"${payFilter.due === "above30" ? " selected" : ""}>Above 30 days / Installed machines</option></select></label>
        <label class="ord-field"><span>Received from</span><input id="payFrom" type="date" class="select" value="${esc(payFilter.from)}" title="Filters by payment received date"></label>
        <label class="ord-field"><span>Received to</span><input id="payTo" type="date" class="select" value="${esc(payFilter.to)}" title="Filters by payment received date"></label>
        <button id="payApply" class="dl-btn" type="button">Apply</button>
        <button id="payClearFilters" class="ghost-btn" type="button">Clear</button>
        <div class="hq-actions">
          <button id="payTplBtn" class="ghost-btn" type="button">⬇ Download input template</button>
          ${admin ? `<label class="dl-btn" style="cursor:pointer" title="Import an Excel/CSV — replaces the current data with your sheet (no duplicates)">⬆ Import (Excel/CSV)<input id="payUpload" type="file" accept=".xlsx,.xls,.csv" hidden></label>` : ""}
          ${admin ? `<button id="payClearOld" class="ghost-btn danger" type="button" title="Clear commitment data — by date or all">🗑 Clear data</button>` : ""}
        </div>
      </div>
      ${payHideAll ? `<div class="muted-note" style="margin:2px 0 8px">⚠ All commitment data is cleared (hidden).${admin ? ` <button id="payShowAll" class="linkish" type="button">Show all again</button>` : ""}</div>`
        : payClearBefore ? `<div class="muted-note" style="margin:2px 0 8px">Old data hidden — showing commitments committed on/after <b>${esc(payClearBefore)}</b>.${admin ? ` <button id="payShowAll" class="linkish" type="button">Show all again</button>` : ""}</div>` : ""}
      ${(!payHideAll && payHideBase) ? `<div class="muted-note" style="margin:2px 0 8px">Showing <b>imported data only</b> — the built-in sample rows are hidden.${admin ? ` <button id="payShowBase" class="linkish" type="button">Show built-in data too</button>` : ""}</div>` : ""}
      <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:18px 0 8px">
        <h2 style="margin:0">Detailed commitment report</h2>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="t-muted" id="payDateRange" style="font-size:13px">${payDateRangeNote(payFiltered(rows0))}</span><span class="tag" id="payDrillCount">${rows0.length} records</span></div>
      </div>
      <div class="table-wrap" data-colfilter="1"><table class="pay-report">
        <thead><tr><th>Customer</th><th>Product</th><th>Invoice No.</th><th>Invoice date</th><th>Category</th><th>HQ</th><th>Sales Person</th><th>Committed date</th><th class="num">Due days</th><th class="num">Sales value</th><th class="num">Committed</th><th class="num">Received</th><th class="num">Pending</th><th>Machine</th><th>Status</th><th>Remark</th><th>Received date</th><th>EMI</th></tr></thead>
        <tbody id="payBody">${payTableRows(applyColFilters(payFiltered(rows0)))}</tbody>
        <tfoot id="payTotals">${payTotalsRow(applyColFilters(payFiltered(rows0)))}</tfoot>
      </table></div>`;
  }

  /* ================= LEADS · SALES PIPELINE ================= */
  // A lightweight CRM: capture a lead → track it through the pipeline →
  // push it to "Sold" when it converts. Base data is seeded from the uploaded
  // Salon lead workbook (window.LEADS_SEED); new leads and every edit persist
  // in the shared edits doc so the whole team sees the same board.
  const LEAD_STAGES = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "demo", label: "Demo done" },
    { key: "negotiation", label: "Negotiation" },
    { key: "sold", label: "Sold ✓" },
    { key: "lost", label: "Lost" },
  ];
  const LEAD_STAGE_LABEL = {}; LEAD_STAGES.forEach((s) => (LEAD_STAGE_LABEL[s.key] = s.label));
  const LEAD_OPEN = ["new", "contacted", "demo", "negotiation"]; // still in play
  const LEAD_SOURCES = ["Beauty Expo Delhi", "Beauty Expo Mumbai", "Instagram", "WhatsApp", "Referral", "Website", "Cold call", "Walk-in", "Other"];
  const LEAD_PRODUCTS = ["Esthemax", "Celluma", "Devices", "All products"];
  const LEAD_FIELDS = ["name", "mobile", "company", "gender", "occ", "state", "city", "source",
    "product", "owner", "notes", "link", "stage", "history", "stageSince",
    "soldAmount", "soldDate", "createdBy", "createdAt", "updatedAt"];
  const LEAD_STEP_KEYS = ["new", "contacted", "demo", "negotiation", "sold"]; // forward pipeline

  const leadEdits = {};    // "<id>#<field>" -> value (overrides on seeded leads)
  const leadAdds = [];     // manually-added / imported leads {id:"u..", ...}
  const leadRemovals = []; // ids permanently removed (super-admin only)
  const leadArchive = [];  // ids archived — kept in the database, hidden from the active board
  let leadSeq = 0;
  let leadViewArchived = false; // board showing the archived leads instead of active
  let leadFilter = { q: "", source: "", stage: "", owner: "", state: "", product: "", stuck: false };
  const canEditLeads = () => isAdmin();
  const leadToday = () => new Date().toISOString().slice(0, 10);
  const leadIsArchived = (id) => leadArchive.indexOf(id) >= 0;
  // Only a super-admin can ever hard-delete a lead; page admins archive instead.
  const canDeleteLeads = () => isSuperAdmin() && appMode === "admin";
  // Anyone who can open the Leads page may add a timeline remark on ANY lead
  // (even view-only users, e.g. a verifier). Editing fields, moving stages,
  // archiving etc. still require edit access (canEditLeads).
  const canRemarkLeads = () => canSeePage("leads");

  // ---- Lead ageing: days in current stage + total age ----
  const DAY_MS = 86400000;
  function leadStageSince(r) {
    if (r.stageSince) return r.stageSince;
    // Fall back: walk history back over the contiguous run of the current stage.
    const hist = leadHistory(r); const cur = r.stage || "new";
    let since = 0;
    for (let i = hist.length - 1; i >= 0; i--) {
      if ((hist[i].stage || "new") !== cur) break;
      if (hist[i].at) since = hist[i].at;
    }
    return since || r.createdAt || 0;
  }
  function leadCreatedAt(r) {
    if (r.createdAt) return r.createdAt;
    const hist = leadHistory(r);
    const firstDated = hist.find((h) => h.at);
    return firstDated ? firstDated.at : 0;
  }
  const daysSince = (ts) => (ts ? Math.max(0, Math.floor((Date.now() - ts) / DAY_MS)) : null);
  function leadAgeLabel(r) {
    const stageD = daysSince(leadStageSince(r));
    const ageD = daysSince(leadCreatedAt(r));
    const parts = [];
    if (stageD != null) parts.push(`${stageD}d in stage`);
    if (ageD != null) parts.push(`${ageD}d total`);
    return parts.length ? "⏱ " + parts.join(" · ") : "";
  }
  // A lead is "stuck" when it's still open and has sat in its stage too long.
  const LEAD_STUCK_DAYS = 14;
  const leadIsStuck = (r) => LEAD_OPEN.indexOf(r.stage || "new") >= 0 && (daysSince(leadStageSince(r)) || 0) >= LEAD_STUCK_DAYS;
  // Best-effort match of the logged-in user to a sales owner name (by email).
  function myLeadOwner() {
    const email = ((sessionUser && sessionUser.email) || "").toLowerCase();
    const nme = (email.split("@")[0] || "").replace(/[^a-z0-9]/g, "");
    if (!nme) return null;
    const nz = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    const arr = Array.from(new Set(leadOwners().concat(salesStaffList())));
    return arr.find((n) => nz(n) === nme) || arr.find((n) => nz(n) && (nme.indexOf(nz(n)) >= 0 || nz(n).indexOf(nme) >= 0)) || null;
  }
  // Match a free-text candidate (e.g. the middle token of a Deal Name) to a
  // known rep — used to auto-assign an owner on import. Conservative on purpose.
  function leadMatchRep(candidate) {
    const cz = String(candidate || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cz || cz.length < 3) return "";
    const nz = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    const reps = salesStaffList().concat(leadOwners());
    return reps.find((n) => nz(n) === cz) || reps.find((n) => { const z = nz(n); return z.length >= 3 && (z.indexOf(cz) === 0 || cz.indexOf(z) === 0); }) || "";
  }

  // Combined board = seed (with edit overlay) + adds − removals.
  function leadAll() {
    const rm = new Set(leadRemovals);
    const seed = (window.LEADS_SEED || []).map((l, i) => {
      const o = Object.assign({ _seed: true, id: "L" + i }, l);
      LEAD_FIELDS.forEach((f) => { const k = o.id + "#" + f; if (k in leadEdits) o[f] = leadEdits[k]; });
      o.stage = o.stage || "new";
      // Preserve the original lead-sheet note as the first (undated) remark so
      // it stays visible under the Remark column even before anyone updates it.
      if (!Array.isArray(o.history)) o.history = o.notes ? [{ at: 0, stage: "new", by: "", text: o.notes }] : [];
      return o;
    });
    const adds = leadAdds.map((a) => Object.assign({ _seed: false, stage: "new" }, a));
    return seed.concat(adds).filter((r) => !rm.has(r.id));
  }
  function leadUpdate(id, field, value) {
    if (String(id).charAt(0) === "L") {
      leadEdits[id + "#" + field] = value;
      leadEdits[id + "#updatedAt"] = Date.now();
    } else {
      const a = leadAdds.find((x) => x.id === id);
      if (a) { a[field] = value; a.updatedAt = Date.now(); }
    }
    saveEdits("Lead updated (" + field + ")");
  }
  // Archive keeps the lead in the database — it is only hidden from the active
  // board. This is what page admins use for a lead that is not meaningful.
  function leadArchiveSet(id, on) {
    const i = leadArchive.indexOf(id);
    if (on && i < 0) { leadArchive.push(id); leadAddHistory(id, null, "Lead archived", "archive"); }
    else if (!on && i >= 0) { leadArchive.splice(i, 1); leadAddHistory(id, null, "Lead restored from archive", "restore"); }
    saveEdits(on ? "Archived a lead" : "Restored a lead");
  }
  // Hard delete — super-admin only. Everything else is preserved forever.
  function leadRemove(id) {
    if (!canDeleteLeads()) { window.alert("Only a super-admin can permanently delete a lead. Use Archive instead."); return; }
    if (String(id).charAt(0) === "L") { if (!leadRemovals.includes(id)) leadRemovals.push(id); }
    else { const i = leadAdds.findIndex((x) => x.id === id); if (i >= 0) leadAdds.splice(i, 1); }
    saveEdits("Deleted a lead (super-admin)");
  }
  function leadAddNew(obj) {
    const id = "u" + (leadSeq++);
    const now = Date.now();
    leadAdds.push(Object.assign({ id, stage: "new", stageSince: now, createdBy: (sessionUser && sessionUser.email) || "", createdAt: now, updatedAt: now }, obj));
    saveEdits("Added lead " + (obj.name || obj.company || ""));
    return id;
  }

  // Find leads that share a mobile number and merge each set into one: combine
  // their timelines, fill blank fields, and archive the extra copies (kept in DB).
  function leadMergeDuplicates() {
    const active = leadAll().filter((r) => !leadIsArchived(r.id));
    const groups = {};
    active.forEach((r) => { const k = String(r.mobile || "").replace(/[^0-9]/g, "").replace(/^91(?=\d{10}$)/, ""); if (k) (groups[k] = groups[k] || []).push(r); });
    const dupGroups = Object.keys(groups).map((k) => groups[k]).filter((g) => g.length > 1);
    if (!dupGroups.length) { window.alert("No duplicate mobile numbers found on the active board."); return; }
    const extra = dupGroups.reduce((a, g) => a + (g.length - 1), 0);
    if (!window.confirm("Found " + dupGroups.length + " mobile number(s) with duplicates (" + extra + " extra record" + (extra === 1 ? "" : "s") + ").\n\nMerge each set into one lead? Timelines are combined, blank fields filled in, and the extra copies are archived (kept in the database).")) return;
    let merged = 0;
    dupGroups.forEach((g) => {
      g.sort((a, b) => (leadCreatedAt(a) || Infinity) - (leadCreatedAt(b) || Infinity) || leadHistory(b).length - leadHistory(a).length);
      const primary = g[0], others = g.slice(1);
      const pName = primary.name || primary.mobile || "another lead";
      let hist = leadHistory(primary).slice();
      const seen = new Set(hist.map((h) => (h.at || 0) + "|" + h.text));
      others.forEach((o) => leadHistory(o).forEach((h) => { const key = (h.at || 0) + "|" + h.text; if (!seen.has(key)) { seen.add(key); hist.push(h); } }));
      hist.sort((a, b) => (a.at || 0) - (b.at || 0));
      ["name", "company", "city", "state", "source", "product", "owner", "link", "occ"].forEach((f) => {
        if (!primary[f]) { const src = others.find((o) => o[f]); if (src) leadUpdate(primary.id, f, src[f]); }
      });
      leadUpdate(primary.id, "history", hist);
      others.forEach((o) => {
        leadAddHistory(o.id, null, "Merged into “" + pName + "”", "archive");
        if (!leadArchive.includes(o.id)) leadArchive.push(o.id);
        merged++;
      });
    });
    saveEdits("Merged " + merged + " duplicate leads");
    leadRepaint();
    window.alert("Merged " + merged + " duplicate record" + (merged === 1 ? "" : "s") + ". The extra copies were archived and can be restored if needed.");
  }

  // Owners = sales roster + anyone already assigned on a lead.
  function leadOwners() {
    const s = new Set(salesStaffList());
    leadAll().forEach((l) => { const o = (l.owner || "").trim(); if (o) s.add(o); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }
  function leadUniq(rows, field) {
    const s = new Set();
    rows.forEach((r) => { const v = (r[field] || "").trim(); if (v) s.add(v); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }
  function leadFiltered(rows) {
    const q = (leadFilter.q || "").toLowerCase();
    return rows.filter((r) => {
      if (leadFilter.source && r.source !== leadFilter.source) return false;
      if (leadFilter.stage && (r.stage || "new") !== leadFilter.stage) return false;
      if (leadFilter.owner && r.owner !== leadFilter.owner) return false;
      if (leadFilter.state && r.state !== leadFilter.state) return false;
      if (leadFilter.product && !(String(r.product || "").indexOf(leadFilter.product) >= 0)) return false;
      if (leadFilter.stuck && !leadIsStuck(r)) return false;
      if (q) {
        const hay = [r.name, r.company, r.mobile, r.city, r.state, r.owner, r.notes, r.source, r.product].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  // Rows that match every ACTIVE filter except the one named — used so each
  // filter dropdown only offers values that actually exist under the other
  // filters (e.g. picking a source narrows the Owner list to that source).
  function leadRowsExcept(rows, exceptField) {
    const saved = leadFilter[exceptField];
    leadFilter[exceptField] = "";
    const out = leadFiltered(rows);
    leadFilter[exceptField] = saved;
    return out;
  }
  // Owners actually present (assigned) in a set of leads.
  function leadOwnersPresent(rows) {
    const s = new Set();
    rows.forEach((r) => { const o = (r.owner || "").trim(); if (o) s.add(o); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }
  // Product-interest values present (from the fixed list) in a set of leads.
  function leadProductsPresent(rows) {
    return LEAD_PRODUCTS.filter((p) => rows.some((r) => String(r.product || "").indexOf(p) >= 0));
  }

  function leadKpis(rows) {
    const total = rows.length;
    const open = rows.filter((r) => LEAD_OPEN.indexOf(r.stage || "new") >= 0).length;
    const sold = rows.filter((r) => r.stage === "sold");
    const lost = rows.filter((r) => r.stage === "lost").length;
    const wonVal = sold.reduce((a, r) => a + (Number(r.soldAmount) || 0), 0);
    const stuck = rows.filter(leadIsStuck).length;
    const conv = total ? Math.round((sold.length / total) * 100) : 0;
    const card = (cls, val, label, note) => `<div class="card kpi ${cls}"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${val}</div><div class="kpi-note">${esc(note || "")}</div></div>`;
    return card("", total, "Total leads", open + " still open")
      + card("k-teal", sold.length, "Sold / won", conv + "% conversion")
      + card("k-good", rupeeShort(wonVal), "Won value", "closed deals")
      + card("k-warn", open, "In pipeline", "being worked")
      + card(stuck ? "k-bad" : "", stuck, "Stuck", "> " + LEAD_STUCK_DAYS + " days in stage")
      + card("k-warn", lost, "Lost", "marked lost");
  }
  // Per-rep scoreboard: leads / open / sold / conversion — collapsible.
  function leadScoreboard(rows) {
    const by = {};
    rows.forEach((r) => {
      const o = (r.owner || "Unassigned").trim() || "Unassigned";
      const s = by[o] || (by[o] = { total: 0, open: 0, sold: 0, stuck: 0 });
      s.total++;
      if (r.stage === "sold") s.sold++; else if (r.stage !== "lost") s.open++;
      if (leadIsStuck(r)) s.stuck++;
    });
    const list = Object.keys(by).map((o) => Object.assign({ owner: o }, by[o]))
      .sort((a, b) => b.sold - a.sold || b.total - a.total);
    if (!list.length) return "";
    const body = list.map((x) => `<tr>
      <td>${esc(spLabel(x.owner))}</td>
      <td class="num">${x.total}</td><td class="num">${x.open}</td>
      <td class="num">${x.sold}</td><td class="num">${x.total ? Math.round(x.sold / x.total * 100) : 0}%</td>
      <td class="num">${x.stuck ? `<span class="lead-stuck">${x.stuck}</span>` : "0"}</td></tr>`).join("");
    return `<details class="lead-score"><summary>📊 Rep scoreboard — who's converting (${list.length})</summary>
      <div class="mini-wrap"><table class="mini-table">
        <thead><tr><th>Owner</th><th class="num">Leads</th><th class="num">Open</th><th class="num">Sold</th><th class="num">Conv%</th><th class="num">Stuck</th></tr></thead>
        <tbody>${body}</tbody></table></div></details>`;
  }
  // Pipeline funnel = clickable stage chips that also filter the board.
  function leadChips(rows) {
    const counts = {}; LEAD_STAGES.forEach((s) => (counts[s.key] = 0));
    rows.forEach((r) => { counts[r.stage || "new"] = (counts[r.stage || "new"] || 0) + 1; });
    const chip = (key, label, n) => `<button type="button" class="pay-chip lead-chip lch-${key}${leadFilter.stage === key ? " active" : ""}" data-leadstage="${key}"><span class="lead-chip-dot"></span>${esc(label)}<span class="pay-chip-n">${n}</span></button>`;
    return `<div class="pay-chips lead-chips">
      <button type="button" class="pay-chip${leadFilter.stage === "" ? " active" : ""}" data-leadstage="">All stages<span class="pay-chip-n">${rows.length}</span></button>
      ${LEAD_STAGES.map((s) => chip(s.key, s.label, counts[s.key] || 0)).join("")}
    </div>`;
  }

  function leadStageCell(r, admin) {
    if (!admin) return `<span class="lead-stage lst-${r.stage || "new"}">${esc(LEAD_STAGE_LABEL[r.stage || "new"])}</span>`;
    return `<select class="select lead-stage-sel lst-${r.stage || "new"}" data-id="${esc(r.id)}" title="Change stage — you'll be asked for a remark">
      ${LEAD_STAGES.map((s) => `<option value="${s.key}"${(r.stage || "new") === s.key ? " selected" : ""}>${esc(s.label)}</option>`).join("")}
    </select>`;
  }
  function leadOwnerCell(r, admin) {
    if (!admin) return esc(r.owner || "—");
    const owners = leadOwners();
    const cur = r.owner || "";
    const extra = cur && owners.indexOf(cur) < 0 ? `<option value="${esc(cur)}" selected>${esc(cur)}</option>` : "";
    return `<select class="select lead-edit" data-id="${esc(r.id)}" data-field="owner">
      <option value="">— Unassigned —</option>${extra}
      ${owners.map((o) => `<option value="${esc(o)}"${cur === o ? " selected" : ""}>${esc(spLabel(o))}</option>`).join("")}
    </select>`;
  }
  // Remark cell = compact stage tracker + latest remark + a Timeline opener.
  function leadHistory(r) { return Array.isArray(r.history) ? r.history : []; }
  function leadWhen(h) { return h && h.at ? fmtWhen(h.at) : "from lead sheet"; }
  // Small dotted progress tracker showing where the lead sits in the pipeline.
  function leadStepper(r) {
    if (r.stage === "lost") return `<div class="lead-steps"><span class="lead-lost-tag">✕ Lost</span></div>`;
    const idx = LEAD_STEP_KEYS.indexOf(r.stage || "new");
    return `<div class="lead-steps">${LEAD_STEP_KEYS.map((k, i) =>
      `<span class="lead-step lst-${k}${i < idx ? " done" : ""}${i === idx ? " cur" : ""}" title="${esc(LEAD_STAGE_LABEL[k])}"></span>`).join("<span class=\"lead-step-bar\"></span>")}</div>`;
  }
  function leadRemarkCell(r, admin) {
    const hist = leadHistory(r);
    const archived = leadIsArchived(r.id);
    const stuck = leadIsStuck(r);
    const age = leadAgeLabel(r);
    const ageHtml = age ? `<div class="t-muted lead-age${stuck ? " lead-stuck-age" : ""}">${esc(age)}${stuck ? ' <span class="lead-stuck">⚠ stuck</span>' : ""}</div>` : "";
    const sold = r.stage === "sold" && (Number(r.soldAmount) || r.soldDate)
      ? `<div class="lead-sold-note">✓ ₹${r.soldAmount ? inr(Number(r.soldAmount)) : "0"}${r.soldDate ? " · " + esc(r.soldDate) : ""}</div>` : "";
    const archTag = archived ? `<div class="lead-arch-tag">🗄 Archived</div>` : "";
    const tlBtn = `<button type="button" class="linkish lead-timeline-btn" data-id="${esc(r.id)}">🔍 Open${hist.length ? " (" + hist.length + ")" : ""}</button>`;
    const addBtn = canRemarkLeads() ? `<button type="button" class="mini-btn lead-remark-add" data-id="${esc(r.id)}" title="Add an update to the timeline">＋ Update</button>` : "";
    const archBtn = admin ? (archived
      ? `<button type="button" class="linkish lead-unarchive" data-id="${esc(r.id)}" title="Restore to the active board">↩ Restore</button>`
      : `<button type="button" class="linkish lead-archive" data-id="${esc(r.id)}" title="Archive — hides it but keeps it in the database">🗄 Archive</button>`) : "";
    return `${archTag}${leadStepper(r)}${ageHtml}${sold}<div class="lead-remark-tools">${tlBtn}${addBtn}${archBtn}</div>`;
  }
  // Full lead detail popup — editable fields (admin), contact actions, ageing,
  // and the complete lifecycle timeline. This is the primary way to open a lead.
  function leadDetailDialog(id) {
    const r = leadAll().find((x) => x.id === id); if (!r) return;
    const admin = canEditLeads();
    const archived = leadIsArchived(id);
    const hist = leadHistory(r);
    const enteredBy = r.createdBy ? esc(r.createdBy) : "Lead sheet import";
    const enteredWhen = r.createdAt ? esc(fmtWhen(r.createdAt)) : "—";
    const events = [{ kind: "created", at: r.createdAt || 0, by: r.createdBy || "", stage: "new", text: "Lead entered into the system" }]
      .concat(hist.map((h) => ({ kind: h.kind || "stage", at: h.at, by: h.by, stage: h.stage, text: h.text })));
    const dot = (e) => (e.kind === "created" || e.kind === "archive" || e.kind === "restore") ? "lead-tl-created" : "lst-" + (e.stage || "new");
    const tag = (e) => {
      if (e.kind === "created") return `<span class="lead-stage-tag lead-tl-created">Entered</span>`;
      if (e.kind === "archive") return `<span class="lead-stage-tag lead-tl-created">🗄 Archived</span>`;
      if (e.kind === "restore") return `<span class="lead-stage-tag lead-tl-created">Restored</span>`;
      return `<span class="lead-stage-tag lst-${e.stage || "new"}">${esc(LEAD_STAGE_LABEL[e.stage || "new"] || "")}</span>`;
    };
    const items = events.slice().reverse().map((e) => `
      <li class="lead-tl-item">
        <span class="lead-tl-dot ${dot(e)}"></span>
        <div class="lead-tl-body">
          <div class="lead-tl-head">${tag(e)}<span class="lead-tl-when">${esc(leadWhen(e))}</span></div>
          <div class="lead-tl-text">${esc(e.text)}</div>
          <div class="lead-tl-by">${e.by ? "— " + esc(e.by) : (e.kind === "created" ? "— " + enteredBy : "")}</div>
        </div>
      </li>`).join("");
    const owners = leadOwners();
    const val = (v) => esc(v || "");
    // Field rendered as an input (admin) or plain text (viewer).
    const fText = (f, label, ph) => admin
      ? `<label class="ld-field"><span>${label}</span><input id="ld_${f}" type="text" value="${val(r[f])}" placeholder="${ph || ""}"></label>`
      : `<div class="ld-field"><span>${label}</span><div class="ld-val">${r[f] ? esc(r[f]) : "—"}</div></div>`;
    const fSelect = (f, label, list, blank) => {
      if (!admin) return `<div class="ld-field"><span>${label}</span><div class="ld-val">${r[f] ? esc(f === "owner" ? spLabel(r[f]) : r[f]) : "—"}</div></div>`;
      const cur = r[f] || "";
      const extra = cur && list.indexOf(cur) < 0 ? `<option value="${esc(cur)}" selected>${esc(cur)}</option>` : "";
      return `<label class="ld-field"><span>${label}</span><select id="ld_${f}">${blank ? `<option value="">${esc(blank)}</option>` : ""}${extra}${list.map((o) => `<option value="${esc(o)}"${cur === o ? " selected" : ""}>${esc(f === "owner" ? spLabel(o) : o)}</option>`).join("")}</select></label>`;
    };
    const wrap = document.createElement("div");
    wrap.className = "lead-modal";
    wrap.innerHTML = `<div class="lead-modal-card lead-detail-card">
      <div class="lead-tl-topline">
        <h3>${esc(r.name || r.company || "Lead")}${archived ? ` <span class="lead-arch-tag">🗄 Archived</span>` : ""}</h3>
        <span class="lead-stage lst-${r.stage || "new"}">${esc(LEAD_STAGE_LABEL[r.stage || "new"])}</span>
      </div>
      ${leadAgeLabel(r) ? `<div class="t-muted lead-age" style="margin:-4px 0 10px">${esc(leadAgeLabel(r))}</div>` : ""}
      ${r.mobile ? `<div class="lead-tl-contact">${leadContactCell(r)}</div>` : ""}
      <div class="ld-grid">
        ${fText("name", "Name", "Contact name")}
        ${fText("mobile", "Mobile", "10-digit")}
        ${fText("company", "Salon / company")}
        ${fText("city", "City")}
        ${fText("state", "State")}
        ${fSelect("source", "Source", LEAD_SOURCES, "")}
        ${fSelect("product", "Product", LEAD_PRODUCTS, "—")}
        ${fSelect("owner", "Owner (rep)", owners, "— Unassigned —")}
        ${fText("link", "Attachment link", "https://…")}
      </div>
      <div class="ld-meta"><b>Entered by:</b> ${enteredBy} · ${enteredWhen}</div>
      <h4 class="ld-h">Journey</h4>
      <ol class="lead-tl">${items}</ol>
      <div class="lead-modal-actions ld-actions">
        ${canRemarkLeads() ? `<button type="button" class="dl-btn" id="ldAdd">＋ Add update${admin ? " / move stage" : ""}</button>` : ""}
        ${admin && !r.owner && myLeadOwner() ? `<button type="button" class="ghost-btn" id="ldMine">🙋 Assign to me</button>` : ""}
        ${admin ? (archived ? `<button type="button" class="ghost-btn" id="ldArch">↩ Restore</button>` : `<button type="button" class="ghost-btn" id="ldArch">🗄 Archive</button>`) : ""}
        ${admin ? `<button type="button" class="ghost-btn" id="ldSave">💾 Save details</button>` : ""}
        <button type="button" class="ghost-btn" id="ldClose">Close</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    document.getElementById("ldClose").onclick = close;
    const addB = document.getElementById("ldAdd");
    if (addB) addB.onclick = () => { close(); leadRemarkDialog({ id }); };
    const mineB = document.getElementById("ldMine");
    if (mineB) mineB.onclick = () => { const me = myLeadOwner(); if (!me) return; leadUpdate(id, "owner", me); leadAddHistory(id, null, "Assigned to " + me); close(); leadRepaint(); };
    const archB = document.getElementById("ldArch");
    if (archB) archB.onclick = () => {
      if (archived) { leadArchiveSet(id, false); close(); leadRepaint(); return; }
      if (window.confirm("Archive this lead? It stays in the database and can be restored from the Archived view.")) { leadArchiveSet(id, true); close(); leadRepaint(); }
    };
    const saveB = document.getElementById("ldSave");
    if (saveB) saveB.onclick = () => {
      let changed = 0;
      ["name", "mobile", "company", "city", "state", "source", "product", "owner", "link"].forEach((f) => {
        const el = document.getElementById("ld_" + f); if (!el) return;
        let v = (el.value || "").trim();
        if (f === "mobile") v = v.replace(/[^0-9]/g, "").replace(/^91(?=\d{10}$)/, "");
        if (v !== (r[f] || "")) { leadUpdate(id, f, v); changed++; }
      });
      close(); leadRepaint();
      if (!changed) { /* nothing changed */ }
    };
  }
  // Back-compat alias (older call sites).
  function leadTimelineDialog(id) { leadDetailDialog(id); }
  // Contact cell — the number plus separate Call and WhatsApp actions.
  function leadContactCell(r) {
    const digits = String(r.mobile || "").replace(/[^0-9]/g, "");
    if (!digits) return "—";
    const wa = digits.length === 10 ? "91" + digits : digits;
    return `<div class="lead-contact">
      <span class="lead-num">${esc(r.mobile)}</span>
      <span class="lead-contact-btns">
        <a class="cbtn call" href="tel:${esc(digits)}" title="Call ${esc(r.mobile)}" aria-label="Call">📞<span>Call</span></a>
        <a class="cbtn wa" href="https://wa.me/${wa}" target="_blank" rel="noopener" title="WhatsApp ${esc(r.mobile)}" aria-label="WhatsApp">💬<span>WhatsApp</span></a>
      </span>
    </div>`;
  }
  function leadRows(rows, admin) {
    if (!rows.length) return `<tr><td colspan="8" class="empty">No leads match these filters.</td></tr>`;
    return rows.map((r) => {
      const loc = [r.city, r.state].filter(Boolean).join(", ");
      const sold = r.stage === "sold";
      return `<tr class="${sold ? "lead-won" : ""}">
        <td data-label="Lead"><button type="button" class="lead-open" data-id="${esc(r.id)}"><span class="lead-name">${esc(r.name || "—")}</span><span class="t-muted lead-open-sub">${esc(r.company || "")}${r.occ ? " · " + esc(r.occ) : ""}</span></button></td>
        <td data-label="Contact">${leadContactCell(r)}</td>
        <td data-label="Location">${esc(loc || "—")}</td>
        <td data-label="Source"><span class="tag lead-src">${esc(r.source || "—")}</span></td>
        <td data-label="Product">${esc(r.product || "—")}</td>
        <td data-label="Owner">${leadOwnerCell(r, admin)}</td>
        <td data-label="Stage">${leadStageCell(r, admin)}</td>
        <td class="lead-remarkcell" data-label="Lead journey">${leadRemarkCell(r, admin)}</td>
      </tr>`;
    }).join("");
  }

  // Refill one filter <select> with the given values, keeping the current
  // selection (and keeping it selectable even if it fell out of the list).
  function leadFillSelect(id, field, values, useSpLabel) {
    const el = document.getElementById(id); if (!el) return;
    const cur = leadFilter[field] || "";
    const vals = cur && values.indexOf(cur) < 0 ? [cur].concat(values) : values;
    el.innerHTML = `<option value="">All</option>` +
      vals.map((v) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(useSpLabel ? spLabel(v) : v)}</option>`).join("");
    el.value = cur;
  }
  // Rebuild each dropdown so it only lists values that co-exist with the other
  // active filters (Owner narrows to the chosen source, etc.).
  function leadSyncFilters(rows0) {
    leadFillSelect("leadSource", "source", leadUniq(leadRowsExcept(rows0, "source"), "source"));
    leadFillSelect("leadOwner", "owner", leadOwnersPresent(leadRowsExcept(rows0, "owner")), true);
    leadFillSelect("leadState", "state", leadUniq(leadRowsExcept(rows0, "state"), "state"));
    leadFillSelect("leadProduct", "product", leadProductsPresent(leadRowsExcept(rows0, "product")));
  }

  // Active board excludes archived leads; the Archived view shows only them.
  function leadBoardRows() {
    return leadAll().filter((r) => leadViewArchived ? leadIsArchived(r.id) : !leadIsArchived(r.id));
  }
  function leadRepaint() {
    const rows0 = leadBoardRows();
    const filtered = leadFiltered(rows0);
    const k = document.getElementById("leadKpis"); if (k) k.innerHTML = leadKpis(rows0);
    const c = document.getElementById("leadChips"); if (c) { c.innerHTML = leadChips(rows0); wireLeadChips(); }
    const sc = document.getElementById("leadScore"); if (sc) sc.innerHTML = leadScoreboard(rows0);
    leadSyncFilters(rows0);
    const b = document.getElementById("leadBody"); if (b) b.innerHTML = leadRows(filtered, canEditLeads());
    const cnt = document.getElementById("leadCount"); if (cnt) cnt.textContent = filtered.length + " of " + rows0.length + (leadViewArchived ? " archived" : " leads");
    const at = document.getElementById("leadArchBtn"); if (at) at.textContent = `🗄 Archived (${leadAll().filter((r) => leadIsArchived(r.id)).length})`;
    wireLeadRowEdits();
  }
  function wireLeadChips() {
    document.querySelectorAll("[data-leadstage]").forEach((el) => {
      el.onclick = () => { leadFilter.stage = el.dataset.leadstage; leadRepaint(); };
    });
  }
  function wireLeadRowEdits() {
    // Owner is the only free inline edit (no remark needed).
    document.querySelectorAll(".lead-edit").forEach((el) => {
      el.onchange = () => { leadUpdate(el.dataset.id, el.dataset.field, el.value); };
    });
    // Stage change → ask for a remark (and deal value/date when moving to Sold).
    document.querySelectorAll(".lead-stage-sel").forEach((el) => {
      el.onchange = () => {
        const id = el.dataset.id, newStage = el.value;
        const l = leadAll().find((x) => x.id === id); const oldStage = (l && l.stage) || "new";
        if (newStage === oldStage) return;
        leadRemarkDialog({ id, newStage, oldStage, selEl: el });
      };
    });
    // "＋ Remark" = log an activity in the CURRENT stage.
    document.querySelectorAll(".lead-remark-add").forEach((b) => (b.onclick = () => leadRemarkDialog({ id: b.dataset.id })));
    // Open the full lead detail popup (name click or the Open button).
    document.querySelectorAll(".lead-open, .lead-timeline-btn").forEach((b) => (b.onclick = () => leadDetailDialog(b.dataset.id)));
    // Archive / restore — keeps the record in the database.
    document.querySelectorAll(".lead-archive").forEach((b) => (b.onclick = () => {
      const l = leadAll().find((x) => x.id === b.dataset.id);
      if (window.confirm('Archive lead "' + ((l && l.name) || "") + '"?\n\nIt is hidden from the active board but kept in the database — you can restore it any time from the Archived view.')) { leadArchiveSet(b.dataset.id, true); leadRepaint(); }
    }));
    document.querySelectorAll(".lead-unarchive").forEach((b) => (b.onclick = () => { leadArchiveSet(b.dataset.id, false); leadRepaint(); }));
    // Permanent delete — super-admin only.
    document.querySelectorAll(".lead-del").forEach((b) => (b.onclick = () => {
      const l = leadAll().find((x) => x.id === b.dataset.id);
      if (window.confirm('PERMANENTLY delete lead "' + ((l && l.name) || "") + '"?\n\nThis cannot be undone. Prefer Archive unless you are sure.')) { leadRemove(b.dataset.id); leadRepaint(); }
    }));
  }
  // Append a timestamped entry to a lead's journey. `kind` marks special events
  // (archive/restore/created); a normal update leaves it blank.
  function leadAddHistory(id, stage, text, kind) {
    const l = leadAll().find((x) => x.id === id); if (!l) return;
    const hist = leadHistory(l).slice();
    hist.push({ at: Date.now(), stage: stage || l.stage || "new", by: (sessionUser && sessionUser.email) || "", text: text, kind: kind || "" });
    leadUpdate(id, "history", hist);
  }
  // "Add to timeline" popup — always lets you record an update and, in the same
  // step, set the stage (defaults to the current stage). Choosing Sold reveals
  // the deal value + date. Opened from the row stage dropdown or the ＋ button.
  function leadRemarkDialog(opts) {
    const { id, newStage, oldStage, selEl } = opts;
    const l = leadAll().find((x) => x.id === id); if (!l) { if (selEl && oldStage) selEl.value = oldStage; return; }
    const canMove = canEditLeads(); // view users may only add a note, not move stage
    const curStage = l.stage || "new";
    const preStage = newStage || curStage;
    const wrap = document.createElement("div");
    wrap.className = "lead-modal";
    wrap.innerHTML = `<div class="lead-modal-card">
      <h3>Add to timeline — ${esc(l.name || l.company || "lead")}</h3>
      <label class="lead-remark-label">Update / note
        <textarea id="lrText" rows="3" placeholder="e.g. Called, shared brochure, asked to follow up next week"></textarea></label>
      ${canMove ? `<label class="lead-remark-label">Stage (leave as current, or move it)
        <select id="lrStage" class="select">${LEAD_STAGES.map((s) => `<option value="${s.key}"${preStage === s.key ? " selected" : ""}>${esc(s.label)}${s.key === curStage ? " · current" : ""}</option>`).join("")}</select></label>
      <div class="lead-form-grid" id="lrSoldBox"${preStage === "sold" ? "" : " hidden"}>
        <label>Deal value ₹<input id="lrAmt" type="number" placeholder="0" value="${l.soldAmount ? esc(l.soldAmount) : ""}"></label>
        <label>Sold on<input id="lrDate" type="date" value="${esc(l.soldDate || leadToday())}"></label>
      </div>` : `<div class="muted-note">This is added as a note in the current stage. Only editors can move the stage.</div>`}
      <div class="lead-modal-actions">
        <button type="button" class="ghost-btn" id="lrCancel">Cancel</button>
        <button type="button" class="dl-btn" id="lrSave">Save to timeline</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    const revert = () => { if (selEl && oldStage) selEl.value = oldStage; };
    const close = () => wrap.remove();
    const stageSel = document.getElementById("lrStage");
    if (stageSel) stageSel.onchange = () => { document.getElementById("lrSoldBox").hidden = stageSel.value !== "sold"; };
    wrap.addEventListener("click", (e) => { if (e.target === wrap) { revert(); close(); } });
    document.getElementById("lrCancel").onclick = () => { revert(); close(); };
    document.getElementById("lrSave").onclick = () => {
      const text = (document.getElementById("lrText").value || "").trim();
      if (!text) { window.alert("Please enter an update / note."); return; }
      const chosen = stageSel ? stageSel.value : curStage;
      const moved = chosen !== curStage;
      if (moved && chosen === "sold") {
        const n = parseFloat(String(document.getElementById("lrAmt").value).replace(/[^0-9.]/g, "")) || 0;
        const d = (document.getElementById("lrDate").value || "").trim() || leadToday();
        leadUpdate(id, "soldAmount", n); leadUpdate(id, "soldDate", d);
      }
      if (moved) { leadUpdate(id, "stage", chosen); leadUpdate(id, "stageSince", Date.now()); }
      leadAddHistory(id, chosen, text);
      close(); leadRepaint();
    };
    setTimeout(() => { const t = document.getElementById("lrText"); if (t) t.focus(); }, 0);
  }

  // ---- Add-lead modal ----
  function leadAddDialog() {
    const wrap = document.createElement("div");
    wrap.className = "lead-modal";
    const owners = leadOwners();
    wrap.innerHTML = `<div class="lead-modal-card">
      <h3>Add a new lead</h3>
      <div class="lead-form-grid">
        <label>Name<input id="lfName" type="text" placeholder="Contact name"></label>
        <label>Mobile<input id="lfMobile" type="text" placeholder="10-digit"></label>
        <label>Salon / company<input id="lfCompany" type="text"></label>
        <label>City<input id="lfCity" type="text"></label>
        <label>State<input id="lfState" type="text"></label>
        <label>Source<select id="lfSource">${LEAD_SOURCES.map((s) => `<option>${esc(s)}</option>`).join("")}</select></label>
        <label>Product interest<select id="lfProduct"><option value="">—</option>${LEAD_PRODUCTS.map((s) => `<option>${esc(s)}</option>`).join("")}</select></label>
        <label>Owner (rep)<select id="lfOwner"><option value="">— Unassigned —</option>${owners.map((o) => `<option value="${esc(o)}">${esc(spLabel(o))}</option>`).join("")}</select></label>
        <label class="lead-form-wide">Opening remark<input id="lfRemark" type="text" placeholder="how the lead came in / first note"></label>
      </div>
      <div class="lead-modal-actions">
        <button type="button" class="ghost-btn" id="lfCancel">Cancel</button>
        <button type="button" class="dl-btn" id="lfSave">Add lead</button>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    document.getElementById("lfCancel").onclick = close;
    document.getElementById("lfSave").onclick = () => {
      const v = (id) => (document.getElementById(id).value || "").trim();
      const name = v("lfName"), company = v("lfCompany"), mobile = v("lfMobile");
      if (!name && !company && !mobile) { window.alert("Enter at least a name, company or mobile."); return; }
      const remark = v("lfRemark");
      const id = leadAddNew({
        name, mobile, company, city: v("lfCity"), state: v("lfState"),
        source: v("lfSource"), product: v("lfProduct"), owner: v("lfOwner"),
        occ: "Salon",
        history: remark ? [{ at: Date.now(), stage: "new", by: (sessionUser && sessionUser.email) || "", text: remark }] : [],
      });
      close(); leadRepaint();
    };
    setTimeout(() => { const n = document.getElementById("lfName"); if (n) n.focus(); }, 0);
  }

  // ---- Excel import / export ----
  const LEAD_TPL_HEADERS = ["Name", "Mobile", "Company", "City", "State", "Source", "Product", "Owner", "Stage", "Remark", "Attachment link"];
  function leadDownloadTemplate() {
    const sample = ["Priya Sharma", "9876543210", "Glow Salon", "Pune", "Maharashtra", "Instagram", "Esthemax", "Lubdha", "new", "Enquired on Instagram — wants pricing", ""];
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([LEAD_TPL_HEADERS, sample]);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Leads");
      window.XLSX.writeFile(wb, "lead_import_template.xlsx");
    } else {
      const csv = LEAD_TPL_HEADERS.join(",") + "\n" + sample.join(",");
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = "lead_import_template.csv"; a.click();
    }
  }
  function leadMapImportRow(o) {
    const g = (...keys) => { for (const k of keys) { const kk = Object.keys(o).find((x) => x.toLowerCase().replace(/[^a-z]/g, "") === k); if (kk != null && o[kk] !== "") return o[kk]; } return ""; };
    const c = (v) => String(v == null ? "" : v).replace(/\s+/g, " ").trim();
    const stageRaw = c(g("stage")).toLowerCase();
    const stage = LEAD_STAGES.find((s) => s.key === stageRaw || s.label.toLowerCase().indexOf(stageRaw) === 0) ;
    const first = c(g("firstname")), last = c(g("lastname"));
    let name = c(g("name", "contactname")) || [first, last].filter(Boolean).join(" ");
    // Some sheets (e.g. the Instagram tab) carry the name in "Record Type 2/3".
    if (!name) { const n2 = c(o["Record Type 2"]), n3 = c(o["Record Type 3"]); name = [n2, n3].filter((x) => x && !/^na$/i.test(x)).join(" "); }
    if (/^lead$/i.test(name)) name = "";
    const stageKey = stage ? stage.key : "new";
    const remark = c(g("remark", "remarks", "notes", "description"));
    // Owner: explicit column, else the middle token of a "X - Rep - Product"
    // deal name if it matches a known rep.
    let owner = c(g("owner", "rep", "salesperson"));
    if (!owner) { const parts = c(g("dealname", "deal")).split(/\s*-\s*/); if (parts.length >= 3) owner = leadMatchRep(parts[1]); }
    return {
      name,
      mobile: c(g("mobile", "phone", "contact")).replace(/[^0-9]/g, "").replace(/^91(?=\d{10}$)/, ""),
      company: c(g("company", "companyname", "salon")),
      city: c(g("city")), state: c(g("state")),
      source: c(g("source", "leadsource")) || "Other",
      product: c(g("product", "productinterest", "interest")),
      owner: owner,
      link: c(g("attachmentlink", "attachment", "link", "drivelink")),
      stage: stageKey,
      occ: c(g("occupation", "occupaction")) || "Salon",
      history: remark ? [{ at: Date.now(), stage: stageKey, by: (sessionUser && sessionUser.email) || "", text: remark }] : [],
    };
  }
  function leadImport(file) {
    const isCsv = /\.csv$/i.test(file.name) || !window.XLSX;
    const reader = new FileReader();
    reader.onload = (e) => {
      let rows = [];
      try {
        if (isCsv) {
          const text = e.target.result;
          const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
          const hdr = lines.shift().split(",").map((h) => h.trim());
          rows = lines.map((l) => { const cells = l.split(","); const o = {}; hdr.forEach((h, i) => (o[h] = (cells[i] || "").trim())); return o; });
        } else {
          const wb = window.XLSX.read(e.target.result, { type: "array", cellDates: true });
          wb.SheetNames.forEach((sn) => {
            const ws = wb.Sheets[sn];
            window.XLSX.utils.sheet_to_json(ws, { defval: "" }).forEach((r) => rows.push(r));
          });
        }
      } catch (err) { window.alert("Could not read that file: " + err.message); return; }
      // Mobile number is the unique key. Existing mobiles are never overwritten;
      // rows without a mobile are rejected and reported.
      const mobKey = (s) => String(s || "").replace(/[^0-9]/g, "").replace(/^91(?=\d{10}$)/, "");
      const seen = new Set(leadAll().map((l) => mobKey(l.mobile)).filter(Boolean));
      let added = 0, dup = 0;
      const noMobile = [];
      rows.forEach((raw) => {
        const m = leadMapImportRow(raw);
        if (!m.name && !m.mobile && !m.company) return; // blank row
        const key = mobKey(m.mobile);
        if (!key) { noMobile.push(m.name || m.company || "(unnamed row)"); return; } // no mobile → reject
        if (seen.has(key)) { dup++; return; } // already on the board → keep existing, don't override
        seen.add(key);
        leadAdds.push(Object.assign({ id: "u" + (leadSeq++), stage: m.stage || "new", createdBy: (sessionUser && sessionUser.email) || "", createdAt: Date.now(), updatedAt: Date.now() }, m));
        added++;
      });
      saveEdits("Imported " + added + " leads");
      leadRepaint();
      let msg = "✅ Imported " + added + " new lead" + (added === 1 ? "" : "s") + ".";
      if (dup) msg += "\n⏭ " + dup + " already existed (matched by mobile) — kept as-is, not overwritten.";
      if (noMobile.length) {
        msg += "\n\n⚠ " + noMobile.length + " row" + (noMobile.length === 1 ? "" : "s") + " skipped — NO mobile number:\n" +
          noMobile.slice(0, 12).map((n) => "• " + n).join("\n") + (noMobile.length > 12 ? "\n…and " + (noMobile.length - 12) + " more" : "");
      }
      window.alert(msg);
    };
    if (isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file);
  }
  function leadExport() {
    const rows = leadFiltered(leadAll());
    const EXPORT_HEADERS = ["Name", "Mobile", "Company", "City", "State", "Source", "Product", "Owner", "Stage", "Latest Remark", "Sold Value", "Sold Date", "Remarks history", "Attachment link"];
    const aoa = [EXPORT_HEADERS];
    rows.forEach((r) => {
      const hist = leadHistory(r);
      const last = hist.length ? hist[hist.length - 1].text : "";
      const histStr = hist.map((h) => `[${h.at ? fmtWhen(h.at) : "lead sheet"} · ${LEAD_STAGE_LABEL[h.stage || "new"] || ""}] ${h.text}`).join(" | ");
      aoa.push([
        r.name || "", r.mobile || "", r.company || "", r.city || "", r.state || "",
        r.source || "", r.product || "", r.owner || "", LEAD_STAGE_LABEL[r.stage || "new"],
        last, r.stage === "sold" ? (Number(r.soldAmount) || 0) : "", r.soldDate || "", histStr, r.link || "",
      ]);
    });
    const fname = "primelaze_leads_" + leadToday() + ".xlsx";
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Leads");
      window.XLSX.writeFile(wb, fname);
    } else {
      const csv = aoa.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = fname.replace(/\.xlsx$/, ".csv"); a.click();
    }
  }

  function renderLeads() {
    // keep leadSeq ahead of any restored adds
    const ids = leadAdds.map((a) => +String(a.id).replace(/^u/, "")).filter((n) => !isNaN(n));
    leadSeq = Math.max(leadSeq, ids.length ? Math.max(...ids) + 1 : 0);
    const admin = canEditLeads();
    const rows0 = leadBoardRows();
    const archN = leadAll().filter((r) => leadIsArchived(r.id)).length;
    setTimeout(() => {
      wireLeadChips();
      wireLeadRowEdits();
      const wire = (id, fn) => { const el = document.getElementById(id); if (el) el.onchange = fn; };
      wire("leadSource", (e) => { leadFilter.source = e.target.value; leadRepaint(); });
      wire("leadOwner", (e) => { leadFilter.owner = e.target.value; leadRepaint(); });
      wire("leadState", (e) => { leadFilter.state = e.target.value; leadRepaint(); });
      wire("leadProduct", (e) => { leadFilter.product = e.target.value; leadRepaint(); });
      const s = document.getElementById("leadSearch");
      if (s) s.oninput = (e) => { leadFilter.q = e.target.value; leadRepaint(); };
      const clr = document.getElementById("leadClear");
      if (clr) clr.onclick = () => { leadFilter = { q: "", source: "", stage: "", owner: "", state: "", product: "", stuck: false }; renderTab("leads"); };
      const arch = document.getElementById("leadArchBtn");
      if (arch) arch.onclick = () => { leadViewArchived = !leadViewArchived; leadFilter.stage = ""; leadFilter.stuck = false; renderTab("leads"); };
      const mine = document.getElementById("leadMine");
      if (mine) mine.onclick = () => { const me = myLeadOwner(); leadFilter.owner = (leadFilter.owner === me ? "" : me); renderTab("leads"); };
      const stuckB = document.getElementById("leadStuck");
      if (stuckB) stuckB.onclick = () => { leadFilter.stuck = !leadFilter.stuck; renderTab("leads"); };
      const merge = document.getElementById("leadMerge"); if (merge) merge.onclick = leadMergeDuplicates;
      const addB = document.getElementById("leadAddBtn"); if (addB) addB.onclick = leadAddDialog;
      const fab = document.getElementById("leadFab"); if (fab) fab.onclick = leadAddDialog;
      const tpl = document.getElementById("leadTpl"); if (tpl) tpl.onclick = leadDownloadTemplate;
      const exp = document.getElementById("leadExport"); if (exp) exp.onclick = leadExport;
      const up = document.getElementById("leadUpload");
      if (up) up.onchange = (e) => { const f = e.target.files[0]; if (f) leadImport(f); e.target.value = ""; };
    }, 0);
    const me = myLeadOwner();
    const stuckN = rows0.filter(leadIsStuck).length;
    const sel = (id, cur, values, label) => `<label class="ord-field"><span>${esc(label)}</span><select id="${id}" class="select"><option value="">All</option>${values.map((v) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(spLabel(v))}</option>`).join("")}</select></label>`;
    return `
      <div class="section-head">
        <h1>Casovil Leads</h1>
        <p>Capture every enquiry, move it through the pipeline, and push it to <b>Sold</b> when it closes. Every lead is stored in the database and never lost — if a lead is not meaningful, <b>archive</b> it (it stays saved and can be restored). ${admin ? "Add leads manually or <b>import your lead sheet (Excel/CSV)</b>. The <b>mobile number is the unique key</b> — existing leads are never overwritten, and rows without a mobile are skipped with a warning. Use ⬇ Template for the format." : "Read-only view."}</p>
      </div>
      ${leadViewArchived ? `<div class="muted-note" style="margin:2px 0 10px">🗄 Showing <b>archived</b> leads — hidden from the active board but kept in the database. Use “Back to active” to return.</div>` : ""}
      <div id="leadKpis" class="grid kpi-grid">${leadKpis(rows0)}</div>
      <div id="leadChips">${leadChips(rows0)}</div>
      <div id="leadScore">${leadScoreboard(rows0)}</div>
      <div class="controls" style="margin-top:14px">
        <input id="leadSearch" class="search" type="search" placeholder="Search name, salon, mobile, city, rep…" value="${esc(leadFilter.q)}">
        ${sel("leadSource", leadFilter.source, leadUniq(leadRowsExcept(rows0, "source"), "source"), "Source")}
        ${sel("leadOwner", leadFilter.owner, leadOwnersPresent(leadRowsExcept(rows0, "owner")), "Owner")}
        ${sel("leadState", leadFilter.state, leadUniq(leadRowsExcept(rows0, "state"), "state"), "State")}
        ${sel("leadProduct", leadFilter.product, leadProductsPresent(leadRowsExcept(rows0, "product")), "Product")}
        ${me ? `<button id="leadMine" class="ghost-btn${leadFilter.owner === me ? " active" : ""}" type="button" title="Show only leads assigned to you">👤 My leads</button>` : ""}
        <button id="leadStuck" class="ghost-btn${leadFilter.stuck ? " active" : ""}" type="button" title="Leads sitting over ${LEAD_STUCK_DAYS} days in one stage">⚠ Stuck (${stuckN})</button>
        <button id="leadClear" class="ghost-btn" type="button">Clear</button>
        <div class="hq-actions">
          ${admin ? `<button id="leadAddBtn" class="dl-btn" type="button">＋ Add lead</button>` : ""}
          ${admin ? `<label class="ghost-btn" style="cursor:pointer" title="Import leads from Excel/CSV — matched by mobile, never overwritten">⬆ Import<input id="leadUpload" type="file" accept=".xlsx,.xls,.csv" hidden></label>` : ""}
          ${admin ? `<button id="leadMerge" class="ghost-btn" type="button" title="Find leads with the same mobile and merge them">🔀 Merge duplicates</button>` : ""}
          <button id="leadArchBtn" class="ghost-btn${leadViewArchived ? " active" : ""}" type="button" title="Show/hide archived leads">🗄 ${leadViewArchived ? "Back to active" : "Archived (" + archN + ")"}</button>
          <button id="leadTpl" class="ghost-btn" type="button">⬇ Template</button>
          <button id="leadExport" class="ghost-btn" type="button">⬇ Export view</button>
        </div>
      </div>
      <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:18px 0 8px">
        <h2 style="margin:0">${leadViewArchived ? "Archived leads" : "Lead board"}</h2>
        <span class="tag" id="leadCount">${leadFiltered(rows0).length} of ${rows0.length}${leadViewArchived ? " archived" : " leads"}</span>
      </div>
      <div class="table-wrap"><table class="lead-table">
        <thead><tr>
          <th>Lead</th><th>Mobile</th><th>Location</th><th>Source</th><th>Product</th>
          <th>Owner</th><th>Stage</th><th>Lead journey</th>
        </tr></thead>
        <tbody id="leadBody">${leadRows(leadFiltered(rows0), admin)}</tbody>
      </table></div>
      ${admin ? `<button type="button" class="lead-fab" id="leadFab" title="Add a lead" aria-label="Add a lead">＋</button>` : ""}`;
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
  const orderState = { usdInr: null, customs: null, moqJar: null, moqRetail: null, stock: {}, received: {}, issued: {}, cat: "All", status: "all", q: "", lineData: {} };
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
  // Keep index-keyed stock/received/issued aligned to item names across a list change.
  function remapEsthStateByName(mutate) {
    const byName = {};
    (D.esthemaxOrder.items || []).forEach((it, i) => { byName[it.name] = { stock: orderState.stock[i], received: orderState.received[i], issued: orderState.issued[i] }; });
    mutate();
    const ns = {}, nr = {}, ni = {};
    (D.esthemaxOrder.items || []).forEach((it, i) => {
      const s = byName[it.name]; if (!s) return;
      if (s.stock != null) ns[i] = s.stock;
      if (s.received != null && s.received !== "") nr[i] = s.received;
      if (s.issued != null && s.issued !== "") ni[i] = s.issued;
    });
    orderState.stock = ns; orderState.received = nr; orderState.issued = ni;
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

  // Build the printable PDF purchase order (items that need reordering).
  function buildPurchaseReport(rows) {
    const stamp = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    let totUnits = 0, totMoney = 0;
    const body = rows.map((r) => {
      totUnits += r.toBuy; totMoney += (r.money || 0);
      return `<tr>
        <td>${esc(r.it.name)}</td>
        <td>${esc(r.it.category)}</td>
        <td class="num">${inr(r.it.requiredStock)}</td>
        <td class="num">${inr(r.current)}</td>
        <td class="num">${inr(Math.round(r.need))}</td>
        <td class="num"><b>${inr(Math.round(r.toBuy))}</b></td>
      </tr>`;
    }).join("");
    const foot = `<tr><td colspan="5"><b>TOTAL</b></td><td class="num"><b>${inr(Math.round(totUnits))} units</b></td></tr>`;
    return `
      <div class="p-section">
        <h1>${esc(D.meta.company)} — Esthemax Low-Stock Report</h1>
        <div class="p-sub">Items below required stock — reorder list</div>
        <p class="p-meta">Generated ${esc(stamp)} · ${rows.length} items · ${inr(Math.round(totUnits))} units to buy${totMoney ? ` · est. landed ${rupeeShort(totMoney)}` : ""}</p>
        ${pTable([{ label: "Item" }, { label: "Category" }, { label: "Required", num: 1 }, { label: "Current", num: 1 }, { label: "Shortfall", num: 1 }, { label: "To Buy", num: 1 }], body + foot)}
        <p class="p-meta" style="margin-top:14px">Buy quantities are rounded to the minimum order lot (JAR ${orderState.moqJar} / Retail ${orderState.moqRetail}).</p>
      </div>`;
  }
  // Super-admin: build & download a PDF low-stock (reorder) report.
  function downloadLowStockReport() {
    const rows = orderCompute().filter((r) => r.toBuy > 0).sort((a, b) => b.toBuy - a.toBuy);
    if (!rows.length) { window.alert("Nothing to reorder — every item is at or above required stock."); return; }
    let area = document.getElementById("printArea");
    if (!area) { area = document.createElement("div"); area.id = "printArea"; document.body.appendChild(area); }
    area.innerHTML = buildPurchaseReport(rows);
    document.body.classList.add("printing");
    const cleanup = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 40);
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
      document.querySelectorAll("[data-ostatus]").forEach((b) => {
        b.onclick = () => {
          orderState.status = b.dataset.ostatus;
          document.querySelectorAll("[data-ostatus]").forEach((x) => x.classList.toggle("active", x === b));
          orderPaint();
        };
      });
      const reset = document.getElementById("ordReset");
      if (reset) reset.onclick = () => {
        const p = D.esthemaxOrder.params;
        orderState.usdInr = p.usdInr; orderState.customs = p.customsRate;
        orderState.moqJar = MOQ_JAR; orderState.moqRetail = MOQ_RETAIL; orderState.stock = {}; orderState.received = {}; orderState.issued = {};
        saveEdits(); renderTab("order");
      };
      const addBtn = document.getElementById("ordAddBtn");
      if (addBtn) addBtn.onclick = () => esthAddItem();
      const lowBtn = document.getElementById("ordLowStock");
      if (lowBtn) lowBtn.onclick = () => downloadLowStockReport();
      const xdl = document.getElementById("ordXlsDl"); if (xdl) xdl.onclick = invExportExcel;
      const xup = document.getElementById("ordXlsUp"); if (xup) xup.onchange = (e) => { const f = e.target.files[0]; if (f) invImportExcel(f); e.target.value = ""; };
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
        <p>Track stock movement — how much comes <b>In</b> (received) and goes <b>Out</b> (issued/sold) against each item's <b>Current</b> stock and <b>Required</b> level. Items at or above required are <b>Saleable</b>; others <b>On hold</b>. ${isAdmin() ? "Update stock directly here, or <b>⬇ Download Excel</b>, fill In/Out/Current, and <b>⬆ Upload Excel</b> back — matched by item name." : "Read-only view."}</p>
      </div>
      ${lineSelector}

      ${isAdmin() ? `<div class="card" style="margin-bottom:18px">
        <div class="order-params">
          <label class="ord-field"><span>USD → INR</span><input id="ordUsd" type="number" step="0.01" value="${orderState.usdInr}"></label>
          <label class="ord-field"><span>Customs rate (%)</span><input id="ordCustoms" type="number" step="1" value="${+(orderState.customs * 100).toFixed(2)}"></label>
          <label class="ord-field"><span>JAR min order</span><input id="ordMoqJar" type="number" step="1" min="1" value="${orderState.moqJar}"></label>
          <label class="ord-field"><span>Retail min order</span><input id="ordMoqRetail" type="number" step="1" min="1" value="${orderState.moqRetail}"></label>
          <div class="ord-field"><span>Coverage</span><b>${esc(p.dermaMonths)} Primelaze + ${esc(p.salonMonths)} Casovil mo</b></div>
          <button id="ordReset" class="ghost-btn" type="button">Reset</button>
        </div>
      </div>` : ""}

      <div id="orderKpis" class="grid kpi-grid" style="margin-bottom:18px"></div>

      <div class="controls">
        <input id="ordSearch" class="search" type="search" placeholder="Search item…" value="${esc(orderState.q)}" />
        <div class="seg">${catSeg}</div>
        <div class="seg">
          <button data-ostatus="all" class="${orderState.status === "all" ? "active" : ""}">All status</button>
          <button data-ostatus="canSell" class="${orderState.status === "canSell" ? "active" : ""}">Saleable</button>
          <button data-ostatus="reorder" class="${orderState.status === "reorder" ? "active" : ""}">On hold</button>
        </div>
        ${isAdmin() ? `<button id="ordAddBtn" class="dl-btn" type="button">＋ Add Esthemax item</button>` : ""}
        ${isAdmin() ? `<button id="ordXlsDl" class="ghost-btn" type="button" title="Download the stock sheet as Excel">⬇ Download Excel</button>` : ""}
        ${isAdmin() ? `<label class="ghost-btn" style="cursor:pointer" title="Upload the updated Excel — In/Out/Current are matched by item name">⬆ Upload Excel<input id="ordXlsUp" type="file" accept=".xlsx,.xls,.csv" hidden></label>` : ""}
        ${isAdmin() ? `<button id="ordLowStock" class="ghost-btn" type="button" title="Download a PDF report of everything below required stock">⬇ Low-stock report (PDF)</button>` : ""}
      </div>

      <div class="table-wrap">
        <table class="inv-table">
          <thead><tr>
            ${isAdmin()
              ? `<th>Item</th><th>Category</th><th>Status</th><th class="num">6-mo avg</th>
                 <th class="num">Required</th><th class="num">In (received)</th><th class="num">Out (issued)</th><th class="num">Current</th><th class="num">To Buy</th><th></th>`
              : `<th>Product</th><th class="num">Current stock</th><th class="num">In</th><th class="num">Out</th><th>Status</th>`}
          </tr></thead>
          <tbody id="orderBody"></tbody>
        </table>
      </div>
      ${isAdmin() ? `<div class="muted-note"><b>In</b> = total received, <b>Out</b> = total issued/sold, <b>Current</b> = stock in hand (all editable — type to update, saved for everyone). To Buy rounds the shortfall to the nearest minimum-order lot (JAR ${orderState.moqJar} / Retail ${orderState.moqRetail}); “need” shows the raw shortfall. Prefer Excel? <b>⬇ Download Excel</b>, fill it, <b>⬆ Upload Excel</b> back.</div>` : ""}`;
  }

  function orderPaint() {
    const rows = orderCompute();
    const q = orderState.q, cat = orderState.cat, statusF = orderState.status;
    const filtered = rows.filter((r) =>
      (cat === "All" || r.it.category === cat) &&
      (statusF === "all" || (statusF === "canSell" ? r.canSell : !r.canSell)) &&
      (!q || r.it.name.toLowerCase().includes(q)));

    // KPIs from the *filtered* set so category views make sense
    const toOrder = filtered.filter((r) => r.toBuy > 0).length;
    const units = filtered.reduce((s, r) => s + r.toBuy, 0);
    const money = filtered.reduce((s, r) => s + r.money, 0);
    const canSell = filtered.filter((r) => r.canSell).length;
    const totalIn = filtered.reduce((s, r) => s + (Number(orderState.received[r.i]) || 0), 0);
    const totalOut = filtered.reduce((s, r) => s + (Number(orderState.issued[r.i]) || 0), 0);
    const admin = isAdmin();
    const kpis = [
      { cls: "k-teal", label: "Total In (received)", value: inr(Math.round(totalIn)), note: "units received" },
      { cls: "k-warn", label: "Total Out (issued)", value: inr(Math.round(totalOut)), note: "units gone out" },
      { cls: "k-good", label: "Saleable", value: inr(canSell), note: `of ${filtered.length} shown` },
      { cls: "", label: "On hold", value: inr(toOrder), note: "stock below required" },
    ].concat(admin ? [{ cls: "", label: "Units to buy", value: inr(Math.round(units)), note: "min-order rounded" }] : [])
      .map((x) => `<div class="card kpi ${x.cls}"><div class="kpi-label">${x.label}</div><div class="kpi-value">${x.value}</div><div class="kpi-note">${esc(x.note)}</div></div>`).join("");
    const kEl = document.getElementById("orderKpis");
    if (kEl) kEl.innerHTML = kpis;

    const sorted = filtered.slice().sort((a, b) => b.money - a.money || b.toBuy - a.toBuy);
    const body = sorted.map((r) => {
      const status = r.canSell
        ? `<span class="badge b-good">Saleable</span>`
        : `<span class="badge b-warn">On hold</span>`;
      const inV = orderState.received[r.i], outV = orderState.issued[r.i];
      if (!admin) {
        // View: Product · Current · In · Out · Status.
        return `<tr>
          <td class="t-name">${esc(r.it.name)}</td>
          <td class="num">${inr(r.current)}</td>
          <td class="num">${inV == null || inV === "" ? "—" : esc(inV)}</td>
          <td class="num">${outV == null || outV === "" ? "—" : esc(outV)}</td>
          <td>${status}</td>
        </tr>`;
      }
      const catCls = { JAR: "b-accent", RETAIL: "b-teal", Accessory: "b-neutral", SAMPLE: "b-warn" }[r.it.category] || "b-neutral";
      return `<tr>
        <td class="t-name">${esc(r.it.name)}</td>
        <td><span class="badge ${catCls}">${esc(r.it.category)}</span></td>
        <td>${status}</td>
        <td class="num">${isNum(r.it.sixMoAvg) ? r.it.sixMoAvg.toFixed(1) : "—"}</td>
        <td class="num">${inr(r.it.requiredStock)}</td>
        <td class="num"><input class="received-input" type="number" min="0" data-idx="${r.i}" value="${esc(inV ?? "")}" style="max-width:64px" placeholder="in"></td>
        <td class="num"><input class="issued-input" type="number" min="0" data-idx="${r.i}" value="${esc(outV ?? "")}" style="max-width:64px" placeholder="out"></td>
        <td class="num"><input class="stock-input" type="number" data-idx="${r.i}" value="${r.current}" /></td>
        <td class="num ${r.toBuy > 0 ? "buy-pos" : ""}">${inr(Math.round(r.toBuy))}${r.toBuy !== r.need ? `<div class="cell-note" style="font-weight:600">need ${inr(Math.round(r.need))}</div>` : ""}</td>
        <td style="white-space:nowrap"><button class="ghost-btn esth-edit" data-item="${esc(r.it.name)}">Edit</button> <button class="ghost-btn danger esth-del" data-item="${esc(r.it.name)}">Delete</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="${admin ? 10 : 5}" class="empty">No matching items.</td></tr>`;
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
      // In (received) + Out (issued) — stock movement, visible to everyone.
      const inCell = admin
        ? `<input class="inv-simple" data-item="${esc(name)}" data-f="received" type="number" min="0" value="${esc(d.received == null ? "" : d.received)}" style="max-width:64px" placeholder="in">`
        : (d.received == null || d.received === "" ? "—" : esc(d.received));
      const outCell = admin
        ? `<input class="inv-simple" data-item="${esc(name)}" data-f="issued" type="number" min="0" value="${esc(d.issued == null ? "" : d.issued)}" style="max-width:64px" placeholder="out">`
        : (d.issued == null || d.issued === "" ? "—" : esc(d.issued));
      const actionTd = admin ? `<td style="white-space:nowrap"><button class="ghost-btn inv-edit" data-item="${esc(name)}">Edit</button> <button class="ghost-btn danger inv-del" data-item="${esc(name)}">Delete</button></td>` : "";
      return `<tr><td class="t-name">${esc(name)}</td><td class="num">${stockCell}</td><td class="num">${inCell}</td><td class="num">${outCell}</td><td>${statusCell}</td>${actionTd}</tr>`;
    }).join("") || `<tr><td colspan="${5 + (admin ? 1 : 0)}" class="empty">No items.</td></tr>`;
  }

  function wireSimpleInv(lineId) {
    if (!isAdmin()) return;
    const data = orderState.lineData[lineId] = orderState.lineData[lineId] || {};
    document.querySelectorAll(".inv-simple").forEach((el) => {
      el.onchange = () => {
        const rec = data[el.dataset.item] = data[el.dataset.item] || {};
        const numF = el.dataset.f === "stock" || el.dataset.f === "received" || el.dataset.f === "issued";
        rec[el.dataset.f] = numF ? (el.value === "" ? "" : Math.max(0, parseFloat(el.value) || 0)) : el.value;
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
      <div class="table-wrap"><table class="inv-table">
        <thead><tr><th>Item</th><th class="num">Current stock</th><th class="num">In (received)</th><th class="num">Out (issued)</th><th>Status</th>${admin ? `<th></th>` : ""}</tr></thead>
        <tbody id="simpleInvBody">${simpleInvRows(items, data, orderState.q, admin)}</tbody>
      </table></div>
      ${admin ? `<div class="muted-note">Track stock movement — <b>In</b> (received), <b>Out</b> (issued/sold) and the <b>Current stock</b> for each ${line.id === "celluma" ? "Celluma variant" : "machine"}. Use <b>＋ Add</b>, or <b>Edit</b> / <b>Delete</b> per row. Saved for everyone.</div>` : ""}`;
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
    // In (received) — total units received into stock.
    document.querySelectorAll(".received-input").forEach((inp) => {
      inp.onchange = (e) => {
        const v = parseFloat(e.target.value);
        orderState.received[+e.target.dataset.idx] = e.target.value === "" ? "" : (isNaN(v) ? "" : Math.max(0, v));
        orderPaint();
        saveEdits("Updated received (in)");
      };
    });
    // Out (issued) — total units issued / sold out of stock.
    document.querySelectorAll(".issued-input").forEach((inp) => {
      inp.onchange = (e) => {
        const v = parseFloat(e.target.value);
        orderState.issued[+e.target.dataset.idx] = e.target.value === "" ? "" : (isNaN(v) ? "" : Math.max(0, v));
        orderPaint();
        saveEdits("Updated issued (out)");
      };
    });
  }
  // ---- Esthemax stock Excel: download the sheet / upload the filled sheet ----
  const INV_XLS_HEADERS = ["Item", "Category", "Status", "6-mo avg", "Required", "In (received)", "Out (issued)", "Current", "To Buy"];
  function invExportExcel() {
    const rows = orderCompute();
    const aoa = [INV_XLS_HEADERS];
    rows.forEach((r) => aoa.push([
      r.it.name, r.it.category, r.canSell ? "Saleable" : "On hold",
      isNum(r.it.sixMoAvg) ? +r.it.sixMoAvg.toFixed(1) : "", r.it.requiredStock,
      orderState.received[r.i] === "" || orderState.received[r.i] == null ? "" : Number(orderState.received[r.i]),
      orderState.issued[r.i] === "" || orderState.issued[r.i] == null ? "" : Number(orderState.issued[r.i]),
      r.current, Math.round(r.toBuy),
    ]));
    const fname = "esthemax_stock_" + new Date().toISOString().slice(0, 10) + ".xlsx";
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Esthemax stock");
      window.XLSX.writeFile(wb, fname);
    } else {
      const csv = aoa.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = fname.replace(/\.xlsx$/, ".csv"); a.click();
    }
  }
  function invImportExcel(file) {
    const isCsv = /\.csv$/i.test(file.name) || !window.XLSX;
    const reader = new FileReader();
    reader.onload = (e) => {
      let rows = [];
      try {
        if (isCsv) {
          const lines = String(e.target.result).split(/\r?\n/).filter((l) => l.trim());
          const hdr = lines.shift().split(",").map((h) => h.replace(/^"|"$/g, "").trim());
          rows = lines.map((l) => { const c = l.split(","); const o = {}; hdr.forEach((h, i) => (o[h] = (c[i] || "").replace(/^"|"$/g, "").trim())); return o; });
        } else {
          const wb = window.XLSX.read(e.target.result, { type: "array" });
          rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        }
      } catch (err) { window.alert("Could not read that file: " + err.message); return; }
      const g = (o, ...keys) => { for (const k of keys) { const kk = Object.keys(o).find((x) => x.toLowerCase().replace(/[^a-z]/g, "") === k); if (kk != null && o[kk] !== "") return o[kk]; } return ""; };
      const idxByName = {}; D.esthemaxOrder.items.forEach((it, i) => { idxByName[String(it.name).toLowerCase().trim()] = i; });
      const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.]/g, "")); return isNaN(n) ? null : n; };
      let updated = 0, unknown = 0;
      rows.forEach((o) => {
        const nm = String(g(o, "item", "product", "name")).toLowerCase().trim();
        if (!nm) return;
        const i = idxByName[nm];
        if (i == null) { unknown++; return; }
        const inV = num(g(o, "inreceived", "in", "received"));
        const outV = num(g(o, "outissued", "out", "issued"));
        const cur = num(g(o, "current", "currentstock", "stock"));
        if (inV != null) orderState.received[i] = inV;
        if (outV != null) orderState.issued[i] = outV;
        if (cur != null) orderState.stock[i] = cur;
        updated++;
      });
      saveEdits("Imported Esthemax stock sheet");
      orderPaint();
      window.alert("Updated " + updated + " item" + (updated === 1 ? "" : "s") + " from the sheet." + (unknown ? "\n" + unknown + " row(s) had item names not found and were skipped." : ""));
    };
    if (isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file);
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

      // filter box above the table — skipped for tables with per-column filters.
      if (wrap.dataset.colfilter !== "1") {
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
      }

      // sortable headers (first header row only; skip filter-control cells)
      const ths = Array.from(table.querySelectorAll("thead tr:first-child th"));
      ths.forEach((th, ci) => {
        if (th.querySelector("input, select")) return;
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
    const pw = document.getElementById("pwdBtn");
    if (pw) {
      pw.hidden = false;
      pw.onclick = async () => {
        const email = sessionUser && sessionUser.email;
        if (!email) return;
        if (!window.confirm("Change your password?\n\nWe'll email a reset link to " + email + ". Open it to set a new password. (Check Spam/Junk if you don't see it.)")) return;
        pw.disabled = true;
        try { await auth.sendPasswordResetEmail(email); window.alert("Password reset link sent to " + email + " ✓\n\nCheck your inbox (and Spam), open the link, and set your new password."); }
        catch (e) { window.alert("Could not send the reset email: " + (e.message || e)); }
        finally { pw.disabled = false; }
      };
    }
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
      try { storage = firebase.storage ? firebase.storage() : null; } catch (e) { storage = null; }
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
    seedServiceTeam();
    seedDemoNames();
    seedHqTargets();
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
      if (e.stock || e.received || e.issued) {
        D.esthemaxOrder.items.forEach((it, i) => {
          if (e.stock && e.stock[it.name] != null) orderState.stock[i] = e.stock[it.name];
          if (e.received && e.received[it.name] != null) orderState.received[i] = e.received[it.name];
          if (e.issued && e.issued[it.name] != null) orderState.issued[i] = e.issued[it.name];
        });
      }
      if (e.hqTargets) Object.keys(e.hqTargets).forEach((k) => { hqEdits[k] = e.hqTargets[k]; });
      if (e.demo) ["current", "status", "movement", "packing"].forEach((k) => Object.assign(demoEdits[k], e.demo[k] || {}));
      if (e.demoAdds) {
        ["current", "status", "movement", "packing"].forEach((k) => { if (Array.isArray(e.demoAdds[k])) demoAdds[k] = e.demoAdds[k]; });
        const ids = Object.values(demoAdds).flat().map((x) => +String(x.id).slice(1)).filter((n) => !isNaN(n));
        demoAddSeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
      if (e.demoRemovals) ["current", "status", "movement", "packing"].forEach((k) => { if (Array.isArray(e.demoRemovals[k])) demoRemovals[k] = e.demoRemovals[k]; });
      if (e.roster) Object.assign(rosterEdits, e.roster);
      if (Array.isArray(e.rosterAdds)) {
        rosterAdds.length = 0; e.rosterAdds.forEach((p) => rosterAdds.push(p));
        const ids = rosterAdds.map((x) => +String(x._aid).slice(1)).filter((n) => !isNaN(n));
        rosterAddSeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
      if (Array.isArray(e.rosterRemovals)) { rosterRemovals.length = 0; e.rosterRemovals.forEach((n) => rosterRemovals.push(n)); }
      if (e.kraFiles && typeof e.kraFiles === "object") { Object.keys(kraFiles).forEach((k) => delete kraFiles[k]); Object.assign(kraFiles, e.kraFiles); }
      if (typeof e.seedVersion === "number") seedVersion = e.seedVersion;
      if (typeof e.hqTargetSeedVersion === "number") hqTargetSeedVersion = e.hqTargetSeedVersion;
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
      if (e.hqSpTargets && typeof e.hqSpTargets === "object") {
        Object.keys(e.hqSpTargets).forEach((k) => { if (Array.isArray(e.hqSpTargets[k])) hqSpTargets[k] = e.hqSpTargets[k]; });
        const ids = Object.values(hqSpTargets).flat().map((x) => +String(x.id).slice(1)).filter((n) => !isNaN(n));
        hqTgtSeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
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
      if (e.buyEmail) orderState.buyEmail = e.buyEmail;
      if (e.orgTop && typeof e.orgTop === "object") orgTop = { name: e.orgTop.name || "CTO", title: e.orgTop.title || "", empId: e.orgTop.empId || "" };
      if (e.orgNsm && typeof e.orgNsm === "object") orgNsm = { name: e.orgNsm.name || "Arjun", desig: e.orgNsm.desig || "National Sales Manager", empId: e.orgNsm.empId || "" };
      if (Array.isArray(e.termsOverride)) termsOverride = e.termsOverride;
      if (e.ovEdits && typeof e.ovEdits === "object") { Object.keys(ovEdits).forEach((k) => delete ovEdits[k]); Object.assign(ovEdits, e.ovEdits); }
      if (e.leadEdits && typeof e.leadEdits === "object") { Object.keys(leadEdits).forEach((k) => delete leadEdits[k]); Object.assign(leadEdits, e.leadEdits); }
      if (Array.isArray(e.leadAdds)) {
        leadAdds.length = 0; e.leadAdds.forEach((l) => leadAdds.push(l));
        const ids = leadAdds.map((a) => +String(a.id).replace(/^u/, "")).filter((n) => !isNaN(n));
        leadSeq = ids.length ? Math.max(...ids) + 1 : 0;
      }
      if (Array.isArray(e.leadRemovals)) { leadRemovals.length = 0; e.leadRemovals.forEach((id) => leadRemovals.push(id)); }
      if (Array.isArray(e.leadArchive)) { leadArchive.length = 0; e.leadArchive.forEach((id) => leadArchive.push(id)); }
      if (typeof e.payClearBefore === "string") payClearBefore = e.payClearBefore;
      if (typeof e.payHideAll === "boolean") payHideAll = e.payHideAll;
      if (typeof e.payHideBase === "boolean") payHideBase = e.payHideBase;
      if (Array.isArray(e.paySnapshots)) paySnapshots = e.paySnapshots;
      editsUpdatedAt = e.updatedAt || 0; editsUpdatedBy = e.updatedBy || "";
      if (Array.isArray(e.log)) { editsLog.length = 0; e.log.forEach((x) => editsLog.push(x)); }
      updateLastUpdatedUI();
    } catch (err) { console.warn("edits read failed", err); }
  }

  let saveTimer = null;
  function saveEdits(what) {
    if (!db || !(roleIsAdmin() || hasAnyEditGrant() || canSeePage("leads"))) return;
    clearTimeout(saveTimer);
    const desc = (what == null ? "" : String(what)).slice(0, 120);
    saveTimer = setTimeout(async () => {
      const stock = {}, received = {}, issued = {};
      D.esthemaxOrder.items.forEach((it, i) => {
        if (orderState.stock[i] != null) stock[it.name] = orderState.stock[i];
        if (orderState.received[i] != null && orderState.received[i] !== "") received[it.name] = orderState.received[i];
        if (orderState.issued[i] != null && orderState.issued[i] !== "") issued[it.name] = orderState.issued[i];
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
          { stock, received, issued, usdInr: orderState.usdInr, customs: orderState.customs, moqJar: orderState.moqJar, moqRetail: orderState.moqRetail, buyEmail: orderState.buyEmail, hqTargets: hqEdits, demo: demoEdits, demoAdds, roster: rosterEdits, rosterAdds, rosterRemovals, kraFiles, seedVersion, hqTargetSeedVersion, demoRemovals, customHQs, customDesignations, customPeople, customAddresses, paymentAdds, vacancies: vacancyEdits, hqAdds, hqQtr, hqSales, hqEsthSales, hqSpTargets, newDevices, invLines: orderState.lineData, invAdds, invRemovals, esthOverrides, payClearBefore, payHideAll, payHideBase, paySnapshots, orgTop, orgNsm, termsOverride, ovEdits, leadEdits, leadAdds, leadRemovals, leadArchive, updatedBy: by, updatedAt: at, log: editsLog }, { merge: true });
        // Save succeeded — clear any prior error state.
        if (saveErrorShown) { saveErrorShown = false; const el = document.getElementById("lastUpdated"); if (el) el.style.color = ""; }
      } catch (e) {
        console.warn("edits save failed", e);
        // Make the failure VISIBLE — a silent failure looks "saved" but is lost.
        const el = document.getElementById("lastUpdated");
        if (el) { el.style.color = "var(--bad)"; el.textContent = "⚠ NOT saved — your last change did not store. Check your access/connection."; }
        const dot = document.getElementById("luDot"); if (dot) dot.hidden = false;
        if (!saveErrorShown) {
          saveErrorShown = true;
          window.alert("⚠ Your change was NOT saved to the database.\n\nIt shows on your screen but has not stored — so it will disappear on reload. Most likely your account doesn’t have permission to save this page yet, or there’s a network problem.\n\nPlease tell a super admin before making more changes.");
        }
      }
    }, 800);
  }
  let saveErrorShown = false;

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
    ["userPill", "modeToggle", "pwdBtn", "logoutBtn"].forEach((id) => { const el = document.getElementById(id); if (el) el.hidden = true; });
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
      `<label class="chk perm-access-row"><span style="flex:1">${esc(t.label)}</span><select class="perm-access select" data-page="${t.id}">${superMode ? `<option value="none" selected>No access</option><option value="view">View</option><option value="edit">Edit (admin)</option>` : `<option value="view" selected>View</option><option value="none">No access</option>`}</select></label>`).join("");
    const hqChecks = D.hqTargets.map((h) => {
      const n = h.title.split("—")[0].trim();
      return `<label class="chk"><input type="checkbox" class="perm-hq" value="${esc(n)}" checked> ${esc(n)}</label>`;
    }).join("");
    const roleField = superMode
      ? `<label class="ord-field"><span>Role</span>
           <select id="auRole" class="select"><option value="view">Standard — set access per page below</option><option value="superadmin">Super Admin — full access &amp; users</option></select>
         </label>`
      : `<input type="hidden" id="auRole" value="view">`;
    const scopeNote = superMode
      ? `Per page: <b>Edit</b> = can change it · <b>View</b> = read-only · <b>No access</b> = hidden. Mix freely — e.g. Edit on Casovil Leads, View on the rest.`
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
            : `<b>Every viewer</b> in the system is listed below — including people other admins added. Set your page to <b>View</b> to grant access or <b>No access</b> to remove it. Their access to other pages (set by other admins) stays untouched. Use <b>Reset pwd</b> to email a new-password link, or <b>Remove</b> to permanently delete a contact who has left.`}</p>
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
    // Standard user — per-page access. "Edit" implies the page is also visible.
    const editPages = PERMISSION_PAGES.filter((t) => access[t.id] === "edit").map((t) => t.id);
    const viewPages = PERMISSION_PAGES.filter((t) => access[t.id] === "view" || access[t.id] === "edit").map((t) => t.id);
    const vAll = viewPages.length === N, eAll = editPages.length === N;
    return { role: "view", landing: gc("auLanding"), managerInc: gc("auMgrInc"),
      pages: vAll ? "all" : viewPages, hqs: hqVal, editPages: eAll ? "all" : editPages };
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
    // Per-page selectors keep their 3-way options (No access / View / Edit) —
    // no rewriting needed now that access is chosen per page, not by role.
    const note = document.getElementById("permPageNote");
    if (note && isSuperAdmin()) note.innerHTML = isSuperSel
      ? "<b>Super Admin</b> has full access to every page and manages users — no page selection needed."
      : "For each page pick <b>Edit</b> (can change it), <b>View</b> (read-only) or <b>No access</b>. Mix freely.";
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
    // Map stored perms → Super Admin, or Standard with a per-page level.
    const uiRole = u.role === "superadmin" ? "superadmin" : "view";
    set("auRole", uiRole);
    updateAddUserRoleUI();
    chk("auLanding", u.landing); chk("auMgrInc", u.managerInc);
    document.querySelectorAll(".perm-access").forEach((s) => {
      const id = s.dataset.page;
      let val = "none";
      if (editAll || editList.includes(id)) val = "edit";
      else if (pagesAll || pagesList.includes(id)) val = "view";
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
            throw new Error("This email already has a login but no access record. Fix: delete it in Firebase Console → Authentication → Users, then Add user again with a fresh password. (Or, if you know this account's current password, enter that here to re-link it.)");
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
        // "all" grants View to every page (upgrade individual ones to Edit as needed); "none" clears.
        const val = b.dataset.access === "all" ? "view" : "none";
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
        document.querySelectorAll(".perm-access").forEach((s) => { s.value = Array.from(s.options).some((o) => o.value === "none") ? "none" : s.options[0].value; });
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
      const pwdCell = `<td style="white-space:nowrap"><button class="ghost-btn u-pwd" data-email="${esc(u.email || "")}">Reset pwd</button> <button class="ghost-btn danger pa-remove" data-uid="${doc.id}" data-email="${esc(u.email || "")}">Remove</button></td>`;
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
    // Permanently remove a contact (e.g. an employee who has left).
    box.querySelectorAll(".pa-remove").forEach((b) => {
      b.onclick = async () => {
        const email = b.dataset.email || "";
        if (email.toLowerCase() === String(window.BOOTSTRAP_ADMIN_EMAIL || "").toLowerCase()) { window.alert("This account can't be removed here."); return; }
        if (!window.confirm('Permanently remove "' + email + '" from the dashboard?\n\nThis deletes their access to ALL pages — use it when the person has left. They will no longer be able to sign in.')) return;
        b.disabled = true;
        try { await db.collection("users").doc(b.dataset.uid).delete(); loadUserList(); }
        catch (e) { window.alert("Could not remove: " + (e.message || e)); b.disabled = false; }
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
