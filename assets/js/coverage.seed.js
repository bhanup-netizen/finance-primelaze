/* ============================================================
   Primelaze — Marketing Coverage Matrix (Marketing)
   Split into TWO parts:
     • part:"post" → who POSTS content on each channel
     • part:"dm"   → who MANAGES DMs, comments, messages, calls & emails
   Each row: channel, account, primary owner, backup (if on leave), and an
   ACTION (what that person must do). Pre-filled from the real accounts;
   backups start blank for Marketing to assign. Fully editable.
   ============================================================ */
window.COVERAGE_SEED = {
  version: 3,
  note: "Two parts: who POSTS content, and who MANAGES DMs, messages, calls & emails. Each row has an owner, a backup (for leave), and the action they must do. Contact numbers/emails match the live Primelaze & Casovil sites. Editable by Marketing/Admin — saves for everyone.",
  rows: [
    // ---------- PART 1 · Who posts (content) ----------
    { id: "p1",  part: "post", channel: "Instagram", account: "Primelaze — @primelazemeditech", primary: "Rashmi + Avedan", backup: "", notes: "Post per approved calendar (3–5/week + daily stories); community-manage." },
    { id: "p2",  part: "post", channel: "Instagram", account: "Celluma — @Celluma_india",        primary: "Rashmi + Avedan", backup: "", notes: "Post per approved calendar; community-manage." },
    { id: "p3",  part: "post", channel: "Instagram", account: "Esthemax — @esthemax.india",       primary: "ClanConnect (agency)", backup: "Avedan (client-side)", notes: "Agency posts; Avedan briefs, reviews & approves the calendar." },
    { id: "p4",  part: "post", channel: "Instagram", account: "Casovil — @casovil.world",         primary: "Buzzfied (agency)",    backup: "Avedan (client-side)", notes: "Agency posts; Avedan briefs, reviews & approves the calendar." },
    { id: "p5",  part: "post", channel: "Facebook",  account: "Primelaze",                         primary: "Rashmi + Avedan", backup: "", notes: "Post per approved calendar; reshare Instagram content." },
    { id: "p6",  part: "post", channel: "Facebook",  account: "Esthemax",                          primary: "ClanConnect (agency)", backup: "Avedan (client-side)", notes: "Agency posts; Avedan reviews & approves." },
    { id: "p7",  part: "post", channel: "YouTube",   account: "Primelaze — @marketingprimelaze",  primary: "Rashmi + Avedan", backup: "", notes: "Upload demo/education videos per plan; titles, thumbnails, tags." },
    { id: "p8",  part: "post", channel: "LinkedIn",  account: "Primelaze — company page",          primary: "Rashmi + Avedan", backup: "", notes: "Post company/product updates; engage relevant pages." },
    { id: "p9",  part: "post", channel: "Pinterest", account: "Primelaze",                         primary: "Rashmi + Avedan", backup: "", notes: "Pin product/creative content per plan." },
    { id: "p10", part: "post", channel: "Indiamart", account: "Primelaze — 7339513001",           primary: "Rashmi + Avedan", backup: "", notes: "Keep catalogue & product listings updated. (OTP login on Dhinesh sir's number.)" },
    // ---------- PART 2 · Who manages DMs & messages ----------
    { id: "d1",  part: "dm", channel: "Instagram", account: "DMs, comments & story replies (all brands)", primary: "Sparsha", backup: "", notes: "Reply within 1 hr (working hrs); qualify & pass hot leads to Mayank." },
    { id: "d2",  part: "dm", channel: "Facebook",  account: "Page messages & comments (all brands)",      primary: "Sparsha", backup: "", notes: "Reply within 1 hr; qualify & forward leads to Mayank." },
    { id: "d3",  part: "dm", channel: "WhatsApp",  account: "Primelaze — +91 99155 59151 (site-wide chat button)", primary: "Sparsha", backup: "", notes: "Floating WhatsApp chat on every Primelaze page. Answer within 1 hr; share brochure/pricing; capture lead → Mayank." },
    { id: "d4",  part: "dm", channel: "WhatsApp",  account: "Casovil — +91 86109 96995 (Lubdha)",         primary: "Lubdha", backup: "", notes: "Floating WhatsApp chat + wa.me links on every Casovil page. Answer within 1 hr; share brochure/pricing; capture order → Mayank." },
    { id: "d5",  part: "dm", channel: "Phone",     account: "Primelaze Sales / Demo — +91 74167 35111 (site-wide header)", primary: "Sparsha", backup: "", notes: "Main sales/demo line shown in the header on every page. Attend calls; log the enquiry; follow up; pass lead → Mayank." },
    { id: "d6",  part: "dm", channel: "Phone",     account: "Primelaze Service / Technical — +91 97013 82034", primary: "Vikas", backup: "", notes: "Service & technical-support line. Attend service calls; raise & track the service ticket." },
    { id: "d7",  part: "dm", channel: "Phone",     account: "Primelaze HR / Careers — +91 78459 13001",   primary: "Sandeepika (HR)", backup: "", notes: "HR / careers line. Attend HR / careers calls." },
    { id: "d8",  part: "dm", channel: "Phone",     account: "Casovil — +91 86109 96995 (Lubdha)",         primary: "Lubdha", backup: "", notes: "Click-to-call button on every Casovil page. Attend & follow up order enquiries; log → Mayank." },
    { id: "d9",  part: "dm", channel: "Email",     account: "calls@primelaze.com",                       primary: "Sparsha", backup: "", notes: "Reply within 4 working hrs; qualify; log the lead." },
    { id: "d9b", part: "dm", channel: "Email",     account: "salessupport@primelaze.com (main inbox)",   primary: "Sparsha", backup: "", notes: "Single main Primelaze inbox — ALL sales, demo, brochure & service/support enquiries (Contact & Book-a-Demo forms, Download-Brochure popup). Also the Support-portal admin login. Reply within 4 working hrs; qualify & log." },
    { id: "d10", part: "dm", channel: "Email",     account: "sales@casovil.com",                         primary: "Sparsha", backup: "", notes: "Public Casovil sales/orders inbox + destination for all casovil.com contact-form enquiries & order emails. Reply within 4 working hrs; qualify & log the lead." },
    { id: "d10b",part: "dm", channel: "Email",     account: "itsupport@primelaze.com (backend admin — NOT public)", primary: "IT / internal", backup: "", notes: "Admin login for the Casovil order-management backend only. Never shown on the public site; internal use." },
    { id: "d11", part: "dm", channel: "Email",     account: "servicesupport@primelaze.com",              primary: "Vikas", backup: "", notes: "Reply within 4 working hrs; raise a service ticket." },
    { id: "d12", part: "dm", channel: "Email",     account: "hr@primelaze.com",                          primary: "Sandeepika (HR)", backup: "", notes: "Careers / job applications only. Reply within 24 hrs." },
    { id: "d13", part: "dm", channel: "Email",     account: "info@primelaze.com",                        primary: "Sparsha", backup: "", notes: "Reply within 4 working hrs; route to the right person." },
    { id: "d14", part: "dm", channel: "Instagram", account: "Casovil — @casovil.world (DMs & comments)",  primary: "Sparsha", backup: "", notes: "Reply within 1 hr (working hrs); qualify & pass hot leads → Mayank. (Profile posted by Buzzfied agency — see Posts.)" },
    { id: "d15", part: "dm", channel: "Indiamart", account: "Buyer enquiries — 7339513001",               primary: "Sparsha", backup: "", notes: "Respond to buyer enquiries; qualify; log the lead." },
    { id: "d16", part: "dm", channel: "Lead entry", account: "Bigin / Casovil Dashboard",                 primary: "Mayank", backup: "", notes: "Enter every qualified lead within 24 hrs, tagged by source." },
  ],
};
