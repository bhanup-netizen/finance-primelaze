/* ============================================================
   Primelaze — Marketing Coverage Matrix (Marketing)
   Who looks after which channel (social media, WhatsApp, phone,
   email, enquiries) and who is the BACKUP when the owner is on leave.
   Pre-filled from the real accounts; backups are left blank for the
   Marketing team to assign. Fully editable; the live copy is stored in
   the shared edits doc so the whole team sees the same.
   ============================================================ */
window.COVERAGE_SEED = {
  note: "Who owns which channel, and who covers it when the owner is on leave. Fill in a Backup for every row so nothing goes unattended. Editable by Marketing/Admin — saves for everyone.",
  rows: [
    // Social media
    { id: "c1",  channel: "Instagram", account: "Primelaze — @primelazemeditech", primary: "Rashmi + Avedan", backup: "", notes: "Company-managed" },
    { id: "c2",  channel: "Instagram", account: "Celluma — @Celluma_india",        primary: "Rashmi + Avedan", backup: "", notes: "Company-managed" },
    { id: "c3",  channel: "Instagram", account: "Esthemax — @esthemax.india",       primary: "ClanConnect (agency)", backup: "Avedan (client-side)", notes: "Agency; Avedan manages the agency" },
    { id: "c4",  channel: "Instagram", account: "Casovil — @casovil.world",         primary: "Buzzfied (agency)",    backup: "Avedan (client-side)", notes: "Agency; Avedan manages the agency" },
    { id: "c5",  channel: "Facebook",  account: "Primelaze",                         primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "c6",  channel: "Facebook",  account: "Esthemax",                          primary: "ClanConnect (agency)", backup: "Avedan (client-side)", notes: "Agency" },
    { id: "c7",  channel: "YouTube",   account: "Primelaze — @marketingprimelaze",  primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "c8",  channel: "LinkedIn",  account: "Primelaze — company page",          primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "c9",  channel: "Pinterest", account: "Primelaze",                         primary: "Rashmi + Avedan", backup: "", notes: "" },
    { id: "c10", channel: "Indiamart", account: "Primelaze — 7339513001",           primary: "Rashmi + Avedan", backup: "", notes: "OTP login on Dhinesh sir's number" },
    // Messaging & phone
    { id: "c11", channel: "WhatsApp",  account: "Primelaze — +91 99155 59151",       primary: "Sparsha", backup: "", notes: "Chat button + all WhatsApp links" },
    { id: "c12", channel: "WhatsApp",  account: "Casovil — +91 97013 82034",         primary: "Sparsha", backup: "", notes: "Chat button + contact page" },
    { id: "c13", channel: "Phone",     account: "Primelaze Sales — +91 74167 35111", primary: "Sparsha", backup: "", notes: "Main sales/demo enquiry number" },
    { id: "c14", channel: "Phone",     account: "Primelaze Service — +91 97013 82034", primary: "Vikas", backup: "", notes: "Service support" },
    { id: "c15", channel: "Phone",     account: "Primelaze HR — +91 78459 13001",    primary: "Sandeepika (HR)", backup: "", notes: "HR & Careers" },
    { id: "c16", channel: "Phone",     account: "Casovil Sales — +91 97013 82034",   primary: "Sparsha", backup: "", notes: "Call & contact page" },
    // Email
    { id: "c17", channel: "Email",     account: "Primelaze Sales — calls@ / salessupport@", primary: "Sparsha", backup: "", notes: "Sales & general enquiries" },
    { id: "c18", channel: "Email",     account: "Casovil — sales@casovil.com / info@",      primary: "Sparsha", backup: "", notes: "Sales & general enquiries" },
    { id: "c19", channel: "Email",     account: "Service — servicesupport@primelaze.com",   primary: "Vikas", backup: "", notes: "Service / technical" },
    { id: "c20", channel: "Email",     account: "HR — hr@primelaze.com",                    primary: "Sandeepika (HR)", backup: "", notes: "HR & Careers" },
    // Enquiries & leads
    { id: "c21", channel: "DMs / comments / enquiries", account: "All pages (all brands)", primary: "Sparsha (Lead Collection)", backup: "", notes: "Reply + qualify within SLA" },
    { id: "c22", channel: "Lead entry", account: "Bigin / Casovil Dashboard", primary: "Mayank", backup: "", notes: "Enters every qualified lead" },
  ],
};
