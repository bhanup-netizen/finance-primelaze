/* ============================================================
   Primelaze — Brochure stock (Admin & Logistics · Brochure Stock)
   Seeded from the Physical Inventory sheet (Zirakpur/Chd + Pondicherry, with a
   temporary Event/Cuticon allocation). Stock per location is editable in the
   dashboard; Total and the Reorder status are computed.
   Row: { id, name, spec, monthly (avg use/mo), reorder (level), zk, pondy, event }
   ============================================================ */
window.BROCHURE_SEED = {
  version: 1,
  note: "Current brochure stock by location. Zirakpur = Chandigarh office, Pondy = Pondicherry, Event = Cuticon/on-site allocation. Total = Zirakpur + Pondy + Event; a brochure is flagged Reorder when the total is at or below its reorder level. Editable by Admin — saves for everyone.",
  rows: [
    { id: "br1",  name: "Exofacial",             spec: "A4 · 6 leaf · 350gsm · lamination",              monthly: 262, reorder: 200, zk: 250, pondy: 113, event: 0 },
    { id: "br2",  name: "Biaxis",                spec: "A4 · 4 leaf · 350gsm · lamination",              monthly: 262, reorder: 200, zk: 0,   pondy: 203, event: 50 },
    { id: "br3",  name: "All Products (2026)",   spec: "A4 · 12 leaf · 350gsm · lamination",             monthly: 462, reorder: 200, zk: 350, pondy: 104, event: 150 },
    { id: "br4",  name: "Vossman Compact Blend", spec: "A4 · 4 leaf · 350gsm · lamination",              monthly: 262, reorder: 200, zk: 100, pondy: 117, event: 50 },
    { id: "br5",  name: "Esthemax (2026)",       spec: "A4 · 20 leaf · 300gsm · Spot UV inside 220gsm",  monthly: 462, reorder: 200, zk: 150, pondy: 140, event: 150 },
    { id: "br6",  name: "Vossman Blauman",       spec: "",                                               monthly: 262, reorder: 200, zk: 0,   pondy: 0,   event: 0 },
    { id: "br7",  name: "Polylaze",              spec: "A4 · 8 leaf · 350gsm · lamination",              monthly: 262, reorder: 200, zk: 0,   pondy: 528, event: 50 },
    { id: "br8",  name: "Cellina PR",            spec: "A4 · 6 leaf · 350gsm · lamination",              monthly: 262, reorder: 200, zk: 450, pondy: 384, event: 50 },
    { id: "br9",  name: "Magic Pulse",           spec: "A4 · 4 leaf · 350gsm · lamination",              monthly: 262, reorder: 200, zk: 200, pondy: 496, event: 50 },
    { id: "br10", name: "Hifu UTIMS",            spec: "A4 · 4 leaf · 350gsm · lamination",              monthly: 262, reorder: 200, zk: 20,  pondy: 594, event: 0 },
    { id: "br11", name: "Celluma",               spec: "B5 · 6 leaf trifold · 350gsm · lamination",      monthly: 262, reorder: 200, zk: 120, pondy: 0,   event: 50 },
    { id: "br12", name: "Milesman Blauman",      spec: "",                                               monthly: 262, reorder: 200, zk: 50,  pondy: 699, event: 0 },
    { id: "br13", name: "Casovil Esthemax",      spec: "",                                               monthly: 0,   reorder: 150, zk: 0,   pondy: 0,   event: 0 },
    { id: "br14", name: "Casovil Celluma",       spec: "",                                               monthly: 0,   reorder: 150, zk: 0,   pondy: 0,   event: 0 },
  ],
};
