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
  version: 10,
  note: "Two parts: who POSTS content (now all handled by the agency Buzzfied, with Avedan + Rashmi as backup — reviewing & approving), and who MANAGES DMs, messages, calls & emails. The posting section is split into Primelaze (Primelaze · Celluma · Esthemax) and Casovil. Contacts match the live primelaze.com & casovil.com sites: Primelaze leads@ + hr@, +91 97013 82034 (General/Sales/Support), +91 78459 13001 (HR), WhatsApp +91 99155 59151 (Vikas); Casovil sales@casovil.com + +91 86109 96995. Editable by Marketing/Admin — saves for everyone.",
  rows: [
    // ---------- PART 1 · Who posts (content) ----------
    { id: "p1",  part: "post", channel: "Instagram", account: "Primelaze — @primelazemeditech", primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied posts per approved calendar (3–5/week + daily stories); Avedan + Rashmi brief, review & approve; community-manage." },
    { id: "p2",  part: "post", channel: "Instagram", account: "Celluma — @Celluma_india",        primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied posts per approved calendar; Avedan + Rashmi brief, review & approve." },
    { id: "p3",  part: "post", channel: "Instagram", account: "Esthemax — @esthemax.india",       primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied posts; Avedan + Rashmi brief, review & approve the calendar." },
    { id: "p5",  part: "post", channel: "Facebook",  account: "Primelaze",                         primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied posts per approved calendar; reshare Instagram content." },
    { id: "p6",  part: "post", channel: "Facebook",  account: "Esthemax",                          primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied posts; Avedan + Rashmi review & approve." },
    { id: "p7",  part: "post", channel: "YouTube",   account: "Primelaze — @marketingprimelaze",  primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied uploads demo/education videos per plan; Avedan + Rashmi review & approve." },
    { id: "p8",  part: "post", channel: "LinkedIn",  account: "Primelaze — company page",          primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied posts company/product updates; engages relevant pages." },
    { id: "p9",  part: "post", channel: "Pinterest", account: "Primelaze",                         primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied pins product/creative content per plan." },
    { id: "p10", part: "post", channel: "Indiamart", account: "Primelaze — 7339513001",           primary: "Rashmi + Avedan", backup: "", notes: "Keep catalogue & product listings updated (handled in-house, not the agency). (OTP login on Dhinesh sir's number.)" },
    { id: "p4",  part: "post", channel: "Instagram", account: "Casovil — @casovil.world",         primary: "Buzzfied (agency)", backup: "Avedan + Rashmi", notes: "Buzzfied posts; Avedan + Rashmi brief, review & approve the calendar." },
    // ---------- PART 2 · Who manages DMs & messages ----------
    { id: "d1",  part: "dm", channel: "Instagram", account: "DMs, comments & story replies (all brands)", primary: "Sparsha", backup: "", notes: "Reply within 1 hr (working hrs); qualify & pass hot leads to Mayank." },
    { id: "d2",  part: "dm", channel: "Facebook",  account: "Page messages & comments (all brands)",      primary: "Sparsha", backup: "", notes: "Reply within 1 hr; qualify & forward leads to Mayank." },
    { id: "d3",  part: "dm", channel: "WhatsApp",  account: "Primelaze — +91 99155 59151 (Vikas, site-wide chat button)", primary: "Vikas", backup: "Sparsha", notes: "Floating WhatsApp chat on every Primelaze page (Vikas's number). Answer within 1 hr; share brochure/pricing. Vikas → Mayank enters; Sparsha backup." },
    { id: "d4",  part: "dm", channel: "WhatsApp",  account: "Casovil — +91 86109 96995 (Lubdha)",         primary: "Lubdha", backup: "", notes: "Floating WhatsApp chat + wa.me links on every Casovil page. Answer within 1 hr; share brochure/pricing. Lubdha updates Mayank (cc Sparsha) → Mayank enters, Sparsha backup." },
    { id: "d6",  part: "dm", channel: "Phone",     account: "Primelaze — +91 97013 82034 (website, site-wide)", primary: "Arjun", backup: "", notes: "General, Sales & Support — the main number shown site-wide. Arjun posts every enquiry in the WhatsApp group with a screenshot → Sparsha → Mayank enters." },
    { id: "d7",  part: "dm", channel: "Phone",     account: "Primelaze HR / Careers — +91 78459 13001",   primary: "Sandeepika (HR)", backup: "", notes: "HR / careers line. Attend HR / careers calls." },
    { id: "d8",  part: "dm", channel: "Phone",     account: "Casovil — +91 86109 96995 (Lubdha)",         primary: "Lubdha", backup: "", notes: "Click-to-call button on every Casovil page. Attend & follow up order enquiries. Lubdha updates Mayank (cc Sparsha) → Mayank enters, Sparsha backup." },
    { id: "d9c", part: "dm", channel: "Email",     account: "leads@primelaze.com",                        primary: "Mayank", backup: "", notes: "On the public website — General, Sales & Support. Contact & Book-a-Demo forms + mailto all land here. Create the Bigin pipeline within 8 working hrs (holiday → next morning), tag the source & attach the file. Mayank has access." },
    { id: "d10", part: "dm", channel: "Email",     account: "sales@casovil.com",                         primary: "Sparsha", backup: "", notes: "Public Casovil sales/orders inbox + destination for all casovil.com contact-form enquiries & order emails. Reply within 4 working hrs; Sparsha updates Mayank → Mayank enters." },
    { id: "d12", part: "dm", channel: "Email",     account: "hr@primelaze.com",                          primary: "Sandeepika (HR)", backup: "", notes: "Careers / job applications only. Reply within 24 hrs." },
    { id: "d14", part: "dm", channel: "Instagram", account: "Casovil — @casovil.world (DMs & comments)",  primary: "Sparsha", backup: "", notes: "Reply within 1 hr (working hrs); qualify & pass hot leads → Mayank. (Profile posted by Buzzfied agency — see Posts.)" },
    { id: "d15", part: "dm", channel: "Indiamart", account: "Buyer enquiries — 7339513001",               primary: "Sparsha", backup: "", notes: "Respond to buyer enquiries; qualify; log the lead." },
    { id: "d16", part: "dm", channel: "Lead entry", account: "Esthemax & device (machine) pipeline — company leads", primary: "Mayank", backup: "Sparsha → Avedan", notes: "Create the Bigin pipeline within 8 working hrs (holiday → next morning), tagged by source, with the file attached. Mayank on leave → Sparsha; both on leave → Avedan. Sparsha validates the next working day." },
    { id: "d16b",part: "dm", channel: "Lead entry", account: "Consumable & service pipeline",               primary: "Vikas",  backup: "Sparsha → Avedan", notes: "Vikas creates the pipeline; backup Sparsha → Avedan. Same 8-working-hr rule; Sparsha validates the next working day." },
  ],
};
