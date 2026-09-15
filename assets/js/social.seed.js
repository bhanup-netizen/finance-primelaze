/* Social-media presence seed (Admin › Social Media tab).
   presence  = platform list (grouped by type & status in the UI).
   websites  = public contact directory per brand (contacts tagged by function).
   credentials = account logins — passwords shown to admins / super admins only.
   NOTE: this file is plaintext in the repo; treat the credentials with care. */
window.SOCIAL_SEED = {
  // type: Social | Video | Marketplace | Owned | Messaging | Community
  // brand columns (Yes/No): primelaze, esthemax, celluma, casovil.
  // `detail` = optional sub-line under the platform name (accounts / URLs / emails).
  presence: [
    { n: 1,  media: "Instagram",   type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "Yes", casovil: "Yes", detail: "Primelaze: primelazemeditech · Celluma: Celluma_india · Esthemax: esthemax.india · Casovil: @casovil.world" },
    { n: 2,  media: "Threads",     type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "Yes", casovil: "Yes", detail: "Same handles as Instagram; Casovil has its own." },
    { n: 3,  media: "Facebook",    type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "No",  casovil: "No"  },
    { n: 5,  media: "LinkedIn",    type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha/Avedan", primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 6,  media: "Pinterest",   type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 10, media: "X (Twitter)", type: "Social",      account: "Not Available", active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 4,  media: "Youtube",     type: "Video",       account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "No",  casovil: "No"  },
    { n: 7,  media: "Indiamart",   type: "Marketplace", account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 8,  media: "Mail",        type: "Owned",       account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "Yes", detail: "Primelaze: calls@, servicesupport@, hr@, salessupport@, info@primelaze.com  ·  Casovil: sales@, info@casovil.com" },
    { n: 9,  media: "Website",     type: "Owned",       account: "Available",     active: "Active",     managedBy: "Sparsha (leads)",  primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "Yes", detail: "Primelaze: primelaze.com  ·  Casovil: casovil.com  ·  site build: Vikas" },
    { n: 12, media: "Snapchat",    type: "Messaging",   account: "Available",     active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 11, media: "Quora",       type: "Community",   account: "Not Available", active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 13, media: "Reddit",      type: "Community",   account: "Not Available", active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
  ],
  websites: [
    {
      brand: "Casovil", site: "casovil.com", siteOwner: "Vikas",
      // fn: Sales | Service | HR | General | Admin | WhatsApp; owner = default (editable)
      emails: [
        { addr: "sales@casovil.com", fn: "Sales", owner: "Sparsha", purpose: "Sales & orders — contact/enquiry form and the cart's “send order request”", where: "Contact page, all footers, order flow" },
        { addr: "info@casovil.com", fn: "General", owner: "Sparsha", purpose: "General enquiries (catch-all)", where: "Contact page, all footers, legal pages" },
        { addr: "itsupport@primelaze.com", fn: "Admin", owner: "Vikas", purpose: "Admin login only — internal order-management backend", where: "Not shown publicly on the site" },
      ],
      phones: [
        { num: "+91 97013 82034", fn: "Sales", owner: "Sparsha", purpose: "Call & WhatsApp — floating “Chat on WhatsApp” button + contact page" },
      ],
      social: [
        { platform: "Instagram", handle: "@casovil.world", owner: "Sparsha", link: "https://instagram.com/casovil.world" },
      ],
      addresses: [
        { label: "Corporate Office", value: "SCO No. 23, Upper Ground Floor, Block A, Chandigarh Citi Center, VIP Road, Zirakpur, Mohali, Punjab – 140603" },
        { label: "Head Office", value: "306, Bharathiyar Salai, Ashok Nagar, Lawspet, Puducherry – 605008" },
        { label: "Hours", value: "Mon–Sat, 10am–7pm IST" },
      ],
    },
    {
      brand: "Primelaze Meditech", site: "primelaze.com", siteOwner: "Vikas",
      emails: [
        { addr: "calls@primelaze.com", fn: "Sales", owner: "Sparsha", purpose: "General & Sales enquiries (contact, demo, brochure forms)" },
        { addr: "salessupport@primelaze.com", fn: "Sales", owner: "Sparsha", purpose: "Sales support (support portal)" },
        { addr: "servicesupport@primelaze.com", fn: "Service", owner: "Sparsha", purpose: "Service / technical support" },
        { addr: "hr@primelaze.com", fn: "HR", owner: "Sandeepika", purpose: "HR & Careers (job applications)" },
        { addr: "info@primelaze.com", fn: "General", owner: "Sparsha", purpose: "General info (support portal)" },
      ],
      phones: [
        { num: "+91 74167 35111", fn: "Sales", owner: "Sparsha", purpose: "Sales / Demo Enquiry (main — shown in header on every page)" },
        { num: "+91 97013 82034", fn: "Service", owner: "Sparsha", purpose: "Service Support" },
        { num: "+91 78459 13001", fn: "HR", owner: "Sandeepika", purpose: "HR & Careers" },
        { num: "+91 99155 59151", fn: "WhatsApp", owner: "Sparsha", purpose: "WhatsApp (chat button + all “WhatsApp” links)" },
      ],
      social: [
        { platform: "Facebook", handle: "facebook.com/primelaze", owner: "Sparsha", link: "https://facebook.com/primelaze" },
        { platform: "Instagram", handle: "instagram.com/primelazemeditech", owner: "Sparsha", link: "https://instagram.com/primelazemeditech" },
        { platform: "YouTube", handle: "youtube.com/@marketingprimelaze", owner: "Sparsha", link: "https://youtube.com/@marketingprimelaze" },
        { platform: "LinkedIn (company)", handle: "linkedin.com/company/primelaze-meditech", owner: "Sparsha/Avedan", link: "https://linkedin.com/company/primelaze-meditech" },
      ],
      addresses: [],
    },
  ],
  credentials: [
    { group: "Instagram & Threads", rows: [
      { user: "Celluma_india",       pass: "Primelaze@Zirakhpur" },
      { user: "esthemax.india",      pass: "plmesth12!@" },
      { user: "primelazemeditech",   pass: "Ju5645@P" },
      { user: "Casovil / 9701382034", pass: "plmesth12!@" },
    ] },
    { group: "Pinterest & Youtube", rows: [
      { user: "marketing@primelaze.com", pass: "Primelazemeditech@2022" },
    ] },
    { group: "Facebook", rows: [
      { user: "er.arjun1987@gmail.com",   pass: "Primelazefacebook#-123", note: "Primelaze" },
      { user: "esthemaxindia@gmail.com",  pass: "Hju537&@9FG",            note: "Esthemax" },
    ] },
    { group: "LinkedIn", rows: [
      { user: "er.arjun1987@gmail.com", pass: "Arjun@plm321" },
    ] },
    { group: "Indiamart", rows: [
      { user: "7339513001", pass: "OTP on Dhinesh sir's number" },
    ] },
  ],
};
