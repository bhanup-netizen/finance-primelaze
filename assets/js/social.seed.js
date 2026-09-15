/* Social-media presence seed (Admin › Social Media tab).
   presence = platform × brand matrix (grouped by type & status in the UI).
   accounts = every account as its own row: platform, brand, id (fixed), owner
              (editable), login + password (admins/super only, shown in-row).
   addresses = office addresses per brand.
   NOTE: this file is plaintext in the repo; treat the logins/passwords with care. */
window.SOCIAL_SEED = {
  // type: Social | Video | Marketplace | Owned | Messaging | Community
  presence: [
    { n: 1,  media: "Instagram",   type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "Yes", celluma: "Yes", casovil: "Yes" },
    { n: 3,  media: "Facebook",    type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "Yes", celluma: "No",  casovil: "No"  },
    { n: 5,  media: "LinkedIn",    type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha/Avedan",  primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 6,  media: "Pinterest",   type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 10, media: "X (Twitter)", type: "Social",      account: "Not Available", active: "Not Active", managedBy: "-",               primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 4,  media: "Youtube",     type: "Video",       account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "Yes", celluma: "No",  casovil: "No"  },
    { n: 7,  media: "Indiamart",   type: "Marketplace", account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 8,  media: "Mail",        type: "Owned",       account: "Available",     active: "Active",     managedBy: "Function-wise",    primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "Yes" },
    { n: 9,  media: "Website",     type: "Owned",       account: "Available",     active: "Active",     managedBy: "Vikas (build)",    primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "Yes" },
  ],
  // One row per account. fn: Sales | Service | HR | General | Admin | WhatsApp.
  // owner = default (editable in UI); login + pass shown to admins/super only.
  accounts: [
    // Websites
    { platform: "Website", brand: "Primelaze", id: "primelaze.com", link: "https://primelaze.com", owner: "Vikas", note: "Company website" },
    { platform: "Website", brand: "Casovil",   id: "casovil.com",   link: "https://casovil.com",   owner: "Vikas", note: "E-commerce / orders site" },
    // Emails
    { platform: "Email", brand: "Primelaze", id: "calls@primelaze.com",        fn: "Sales",   owner: "Sparsha",         note: "General & Sales enquiries (contact, demo, brochure forms)" },
    { platform: "Email", brand: "Primelaze", id: "salessupport@primelaze.com", fn: "Sales",   owner: "Sparsha",         note: "Sales support (support portal)" },
    { platform: "Email", brand: "Primelaze", id: "servicesupport@primelaze.com", fn: "Service", owner: "Vikas", note: "Service / technical support" },
    { platform: "Email", brand: "Primelaze", id: "hr@primelaze.com",           fn: "HR",      owner: "Sandeepika (HR)", note: "HR & Careers (job applications)" },
    { platform: "Email", brand: "Primelaze", id: "info@primelaze.com",         fn: "General", owner: "Sparsha",         note: "General info (support portal)" },
    { platform: "Email", brand: "Casovil",   id: "sales@casovil.com",          fn: "Sales",   owner: "Sparsha",         note: "Sales & orders — contact form + cart" },
    { platform: "Email", brand: "Casovil",   id: "info@casovil.com",           fn: "General", owner: "Sparsha",         note: "General enquiries (catch-all)" },
    { platform: "Email", brand: "Casovil",   id: "itsupport@primelaze.com",    fn: "Admin",   owner: "Bhanu",           note: "Admin login only — order-management backend" },
    // Phone / WhatsApp
    { platform: "Phone",    brand: "Primelaze", id: "+91 74167 35111", fn: "Sales",    owner: "Sparsha",         note: "Sales / Demo Enquiry (main — header on every page)" },
    { platform: "Phone",    brand: "Primelaze", id: "+91 97013 82034", fn: "Service",  owner: "Vikas",           note: "Service Support" },
    { platform: "Phone",    brand: "Primelaze", id: "+91 78459 13001", fn: "HR",       owner: "Sandeepika (HR)", note: "HR & Careers" },
    { platform: "WhatsApp", brand: "Primelaze", id: "+91 99155 59151", fn: "WhatsApp", owner: "Sparsha",         note: "WhatsApp chat button + all WhatsApp links" },
    { platform: "Phone",    brand: "Casovil",   id: "+91 97013 82034", fn: "Sales",    owner: "Sparsha",         note: "Call & contact page" },
    { platform: "WhatsApp", brand: "Casovil",   id: "+91 97013 82034", fn: "Sales",    owner: "Sparsha",         note: "Casovil WhatsApp — chat button + contact page" },
    // Instagram — posting owner (company: Rashmi + Avedan; agency brands: the agency)
    { platform: "Instagram", brand: "Primelaze", id: "primelazemeditech", link: "https://instagram.com/primelazemeditech", owner: "Rashmi + Avedan", login: "primelazemeditech",   pass: "Ju5645@P" },
    { platform: "Instagram", brand: "Celluma",   id: "Celluma_india",     link: "https://instagram.com/Celluma_india",     owner: "Rashmi + Avedan", login: "Celluma_india",       pass: "Primelaze@Zirakhpur" },
    { platform: "Instagram", brand: "Esthemax",  id: "esthemax.india",    link: "https://instagram.com/esthemax.india",    owner: "ClanConnect (agency)", login: "esthemax.india",      pass: "plmesth12!@" },
    { platform: "Instagram", brand: "Casovil",   id: "@casovil.world",    link: "https://instagram.com/casovil.world",     owner: "Buzzfied (agency)", login: "Casovil / 9701382034", pass: "plmesth12!@" },
    // Facebook
    { platform: "Facebook", brand: "Primelaze", id: "facebook.com/primelaze", link: "https://facebook.com/primelaze", owner: "Rashmi + Avedan", login: "er.arjun1987@gmail.com", pass: "Primelazefacebook#-123" },
    { platform: "Facebook", brand: "Esthemax",  id: "Esthemax page",          owner: "ClanConnect (agency)", login: "esthemaxindia@gmail.com", pass: "Hju537&@9FG" },
    // YouTube
    { platform: "YouTube", brand: "Primelaze", id: "youtube.com/@marketingprimelaze", link: "https://youtube.com/@marketingprimelaze", owner: "Rashmi + Avedan", login: "marketing@primelaze.com", pass: "Primelazemeditech@2022" },
    // LinkedIn
    { platform: "LinkedIn", brand: "Primelaze", id: "linkedin.com/company/primelaze-meditech", link: "https://linkedin.com/company/primelaze-meditech", owner: "Rashmi + Avedan", login: "er.arjun1987@gmail.com", pass: "Arjun@plm321" },
    // Pinterest
    { platform: "Pinterest", brand: "Primelaze", id: "Pinterest (primelaze)", owner: "Rashmi + Avedan", login: "marketing@primelaze.com", pass: "Primelazemeditech@2022" },
    // Indiamart
    { platform: "Indiamart", brand: "Primelaze", id: "7339513001", owner: "Rashmi + Avedan", login: "7339513001", pass: "OTP on Dhinesh sir's number", note: "OTP-based login" },
  ],
  addresses: [
    { brand: "Casovil", label: "Corporate Office", value: "SCO No. 23, Upper Ground Floor, Block A, Chandigarh Citi Center, VIP Road, Zirakpur, Mohali, Punjab – 140603" },
    { brand: "Casovil", label: "Head Office", value: "306, Bharathiyar Salai, Ashok Nagar, Lawspet, Puducherry – 605008" },
    { brand: "Casovil", label: "Hours", value: "Mon–Sat, 10am–7pm IST" },
  ],
  // Online-marketing structure (from the Marketing Structure doc — online only;
  // offline/events intentionally excluded). Escalation: Arjun → Bhanu.
  marketing: {
    onlineOwners: "Avedan + Rashmi",
    scope: "Social media pages, content calendar, agency management, campaigns. Online only — no conference or stall responsibilities.",
    agencies: "ClanConnect (Esthemax) · Buzzfied (Casovil)",
    // 2.1 Who runs which page
    pages: [
      { brand: "Celluma India", model: "Company (internal team)", owners: "Rashmi + Avedan" },
      { brand: "Primelaze", model: "Company (internal team)", owners: "Rashmi + Avedan" },
      { brand: "Esthemax India", model: "Agency — ClanConnect (IRIDA)", owners: "Rashmi + Avedan (manage the agency)" },
      { brand: "Casovil", model: "Agency — Buzzfied", owners: "Rashmi + Avedan (manage the agency)" },
    ],
    models: [
      "Company-managed (Celluma India, Primelaze): Rashmi & Avedan run the page themselves — ideation, content, scheduling, posting, community management, reporting. Once the monthly calendar is approved, individual posts need no further sign-off.",
      "Agency-managed (Esthemax India, Casovil): the agency creates & publishes. Rashmi & Avedan are the client-side counterparts — brief the agency, share events/product focus, review & approve, chase gaps, run the monthly strategy call. They do not create the content. Casovil (Buzzfied) mirrors the Esthemax (ClanConnect) model.",
    ],
    // 2.3 Monthly content calendar
    calendar: [
      { brand: "Celluma India", prepared: "Rashmi + Avedan", approved: "Arjun + Bhanu", due: "25th of preceding month" },
      { brand: "Primelaze", prepared: "Rashmi + Avedan", approved: "Arjun + Bhanu", due: "25th of preceding month" },
      { brand: "Esthemax India", prepared: "ClanConnect", approved: "Rashmi + Avedan, then Arjun + Bhanu", due: "25th of preceding month" },
      { brand: "Casovil", prepared: "Buzzfied", approved: "Rashmi + Avedan, then Arjun + Bhanu", due: "25th of preceding month" },
    ],
    // 2.4 Quarterly strategy note (company-managed brands)
    strategyNote: {
      sections: [
        "Who we are talking to — the audience for the quarter (e.g. dermatologists in tier-1 cities, salon owners exploring LED).",
        "What we post about — three or four content themes, with roughly how much of the month goes to each.",
        "What we want out of it — the numbers we chase: followers, reach, enquiries per month.",
        "What is happening this quarter — product launches, conferences, campaigns the content needs to support.",
      ],
      due: "One page, due one week before the quarter starts. Prepared by Rashmi + Avedan, approved by Arjun + Bhanu. Monthly calendars must visibly follow it. Agency brands: the agency's own strategy deck covers this; Rashmi & Avedan review it against the same four questions.",
    },
    // 2.5 Fixed cadence
    cadence: [
      { deliverable: "Quarterly strategy note (Celluma India, Primelaze)", owner: "Rashmi + Avedan", freq: "1 week before quarter start" },
      { deliverable: "Monthly content calendar (all 4 brands)", owner: "Rashmi + Avedan (2 internal, 2 chased from agency)", freq: "25th monthly" },
      { deliverable: "Biweekly review meeting", owner: "Rashmi + Avedan present", freq: "Every alternate Monday" },
      { deliverable: "Monthly performance report", owner: "Rashmi + Avedan", freq: "5th of following month" },
      { deliverable: "Agency strategy call (Esthemax, Casovil)", owner: "Avedan", freq: "Monthly, per contract" },
    ],
    escalation: "Agencies (ClanConnect & Buzzfied): email is the channel of record — not WhatsApp. If a committed deliverable is missed, Avedan raises it in writing the same day. Two unanswered reminders, then escalate to Bhanu. A missed calendar or undelivered activation does not ride to month-end unreported.",
    // 3. Telemarketing (across all channels, online enquiries + WhatsApp + calls)
    telemarketing: {
      owner: "Sparsha",
      note: "Sparsha handles DM replies and post engagement on every page, collects the leads, qualifies them, and passes the contact details to Mayank for entry.",
      flow: [
        "Someone DMs or comments on a post — interested in a machine or device.",
        "Sparsha talks to them, shares the brochure, and gets their contact details.",
        "Sparsha passes the contact details to Mayank.",
        "Mayank enters the lead — Bigin CRM for Primelaze, Primelaze Dashboard (Casovil Sale) for Casovil.",
      ],
      sources: [
        "Instagram & Threads — DMs, comments, story replies (all brands)",
        "Facebook — page messages and comments",
        "WhatsApp — the dedicated WhatsApp Business number",
        "Phone — inbound calls on the enquiry numbers + outbound follow-up calls",
        "Website & email enquiry forms (calls@ / sales@ / info@)",
        "Indiamart — buyer enquiries and leads",
      ],
      standards: [
        "First response within 4 working hours.",
        "Handover to sales within 24 hours of qualification.",
        "HR replies to careers / HR enquiries within 24 hours.",
        "No lead lives only in WhatsApp — everything reaches Bigin the same day.",
        "Source tagged on every lead: brand + channel (online / conference / doctor event).",
      ],
    },
    // 4. Lead entry into Bigin + routing to sales
    leadEntry: {
      owner: "Mayank",
      note: "Mayank enters every lead Sparsha passes on, tagged by source, into the right system.",
      routing: [
        { brand: "Primelaze / Celluma / Esthemax", to: "Bigin CRM" },
        { brand: "Casovil", to: "Primelaze Dashboard (Casovil Sale)" },
      ],
    },
  },
};
