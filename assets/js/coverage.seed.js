/* ============================================================
   Primelaze — Marketing Coverage Matrix (Marketing)
   Split into TWO parts:
     • part:"post" → who POSTS content on each channel
     • part:"dm"   → who MANAGES DMs, comments, messages, calls & emails
   Each row has a Primary owner and a Backup (if on leave). Pre-filled from
   the real accounts; backups start blank for Marketing to assign.
   Fully editable; the live copy is stored in the shared edits doc.
   ============================================================ */
window.COVERAGE_SEED = {
  note: "Two parts: who POSTS content, and who MANAGES DMs & messages. Fill a Backup for every row so nothing is unattended when someone is on leave. Editable by Marketing/Admin — saves for everyone.",
  rows: [
    // ---------- PART 1 · Who posts (content) ----------
    { id: "p1",  part: "post", channel: "Instagram", account: "Primelaze — @primelazemeditech", primary: "Rashmi + Avedan", backup: "", notes: "Company-managed" },
    { id: "p2",  part: "post", channel: "Instagram", account: "Celluma — @Celluma_india",        primary: "Rashmi + Avedan", backup: "", notes: "Company-managed" },
    { id: "p3",  part: "post", channel: "Instagram", account: "Esthemax — @esthemax.india",       primary: "ClanConnect (agency)", backup: "Avedan (client-side)", notes: "Agency; Avedan manages it" },
    { id: "p4",  part: "post", channel: "Instagram", account: "Casovil — @casovil.world",         primary: "Buzzfied (agency)",    backup: "Avedan (client-side)", notes: "Agency; Avedan manages it" },
    { id: "p5",  part: "post", channel: "Facebook",  account: "Primelaze",                         primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "p6",  part: "post", channel: "Facebook",  account: "Esthemax",                          primary: "ClanConnect (agency)", backup: "Avedan (client-side)", notes: "Agency" },
    { id: "p7",  part: "post", channel: "YouTube",   account: "Primelaze — @marketingprimelaze",  primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "p8",  part: "post", channel: "LinkedIn",  account: "Primelaze — company page",          primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "p9",  part: "post", channel: "Pinterest", account: "Primelaze",                         primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "p10", part: "post", channel: "Indiamart", account: "Primelaze — 7339513001",           primary: "Rashmi + Avedan", backup: "", notes: "OTP login on Dhinesh sir's number" },
    // ---------- PART 2 · Who manages DMs & messages ----------
    { id: "d1",  part: "dm", channel: "Instagram", account: "DMs, comments & story replies (all brands)", primary: "Sparsha", backup: "", notes: "Reply + qualify within SLA" },
    { id: "d2",  part: "dm", channel: "Facebook",  account: "Page messages & comments (all brands)",      primary: "Sparsha", backup: "", notes: "" },
    { id: "d3",  part: "dm", channel: "WhatsApp",  account: "Primelaze — +91 99155 59151",                primary: "Sparsha", backup: "", notes: "Chat button + all WhatsApp links" },
    { id: "d4",  part: "dm", channel: "WhatsApp",  account: "Casovil — +91 97013 82034",                  primary: "Sparsha", backup: "", notes: "Chat button + contact page" },
    { id: "d5",  part: "dm", channel: "Phone",     account: "Primelaze Sales — +91 74167 35111",          primary: "Sparsha", backup: "", notes: "Main sales/demo enquiry line" },
    { id: "d6",  part: "dm", channel: "Phone",     account: "Primelaze Service — +91 97013 82034",        primary: "Vikas", backup: "", notes: "Service support" },
    { id: "d7",  part: "dm", channel: "Phone",     account: "Primelaze HR — +91 78459 13001",             primary: "Sandeepika (HR)", backup: "", notes: "HR & Careers" },
    { id: "d8",  part: "dm", channel: "Phone",     account: "Casovil Sales — +91 97013 82034",            primary: "Sparsha", backup: "", notes: "Call & contact page" },
    { id: "d9",  part: "dm", channel: "Email",     account: "Primelaze Sales — calls@ / salessupport@",   primary: "Sparsha", backup: "", notes: "Sales & general enquiries" },
    { id: "d10", part: "dm", channel: "Email",     account: "Casovil — sales@casovil.com / info@",        primary: "Sparsha", backup: "", notes: "Sales & general enquiries" },
    { id: "d11", part: "dm", channel: "Email",     account: "Service — servicesupport@primelaze.com",     primary: "Vikas", backup: "", notes: "Service / technical" },
    { id: "d12", part: "dm", channel: "Email",     account: "HR — hr@primelaze.com",                      primary: "Sandeepika (HR)", backup: "", notes: "HR & Careers" },
    { id: "d13", part: "dm", channel: "Indiamart", account: "Buyer enquiries — 7339513001",               primary: "Sparsha", backup: "", notes: "" },
    { id: "d14", part: "dm", channel: "Lead entry", account: "Bigin / Casovil Dashboard",                 primary: "Mayank", backup: "", notes: "Enters every qualified lead" },
  ],
};
