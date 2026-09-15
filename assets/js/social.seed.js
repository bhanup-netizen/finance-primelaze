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
    { n: 2,  media: "Threads",     type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "Yes", celluma: "Yes", casovil: "Yes" },
    { n: 3,  media: "Facebook",    type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "Yes", celluma: "No",  casovil: "No"  },
    { n: 5,  media: "LinkedIn",    type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha/Avedan",  primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 6,  media: "Pinterest",   type: "Social",      account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 10, media: "X (Twitter)", type: "Social",      account: "Not Available", active: "Not Active", managedBy: "-",               primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 4,  media: "Youtube",     type: "Video",       account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "Yes", celluma: "No",  casovil: "No"  },
    { n: 7,  media: "Indiamart",   type: "Marketplace", account: "Available",     active: "Active",     managedBy: "Sparsha",         primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 8,  media: "Mail",        type: "Owned",       account: "Available",     active: "Active",     managedBy: "Function-wise",    primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "Yes" },
    { n: 9,  media: "Website",     type: "Owned",       account: "Available",     active: "Active",     managedBy: "Vikas (build)",    primelaze: "Yes", esthemax: "No",  celluma: "No",  casovil: "Yes" },
    { n: 12, media: "Snapchat",    type: "Messaging",   account: "Available",     active: "Not Active", managedBy: "-",               primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 11, media: "Quora",       type: "Community",   account: "Not Available", active: "Not Active", managedBy: "-",               primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
    { n: 13, media: "Reddit",      type: "Community",   account: "Not Available", active: "Not Active", managedBy: "-",               primelaze: "No",  esthemax: "No",  celluma: "No",  casovil: "No"  },
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
    { platform: "Email", brand: "Primelaze", id: "servicesupport@primelaze.com", fn: "Service", owner: "Service team", note: "Service / technical support" },
    { platform: "Email", brand: "Primelaze", id: "hr@primelaze.com",           fn: "HR",      owner: "Sandeepika (HR)", note: "HR & Careers (job applications)" },
    { platform: "Email", brand: "Primelaze", id: "info@primelaze.com",         fn: "General", owner: "Sparsha",         note: "General info (support portal)" },
    { platform: "Email", brand: "Casovil",   id: "sales@casovil.com",          fn: "Sales",   owner: "Sparsha",         note: "Sales & orders — contact form + cart" },
    { platform: "Email", brand: "Casovil",   id: "info@casovil.com",           fn: "General", owner: "Sparsha",         note: "General enquiries (catch-all)" },
    { platform: "Email", brand: "Casovil",   id: "itsupport@primelaze.com",    fn: "Admin",   owner: "Vikas",           note: "Admin login only — order-management backend" },
    // Phone / WhatsApp
    { platform: "Phone",    brand: "Primelaze", id: "+91 74167 35111", fn: "Sales",    owner: "Sparsha",         note: "Sales / Demo Enquiry (main — header on every page)" },
    { platform: "Phone",    brand: "Primelaze", id: "+91 97013 82034", fn: "Service",  owner: "Service team",    note: "Service Support" },
    { platform: "Phone",    brand: "Primelaze", id: "+91 78459 13001", fn: "HR",       owner: "Sandeepika (HR)", note: "HR & Careers" },
    { platform: "WhatsApp", brand: "Primelaze", id: "+91 99155 59151", fn: "WhatsApp", owner: "Sparsha",         note: "WhatsApp chat button + all WhatsApp links" },
    { platform: "Phone",    brand: "Casovil",   id: "+91 97013 82034", fn: "Sales",    owner: "Sparsha",         note: "Call & WhatsApp — chat button + contact page" },
    // Instagram
    { platform: "Instagram", brand: "Primelaze", id: "primelazemeditech", link: "https://instagram.com/primelazemeditech", owner: "Sparsha", login: "primelazemeditech",   pass: "Ju5645@P" },
    { platform: "Instagram", brand: "Celluma",   id: "Celluma_india",     link: "https://instagram.com/Celluma_india",     owner: "Sparsha", login: "Celluma_india",       pass: "Primelaze@Zirakhpur" },
    { platform: "Instagram", brand: "Esthemax",  id: "esthemax.india",    link: "https://instagram.com/esthemax.india",    owner: "Sparsha", login: "esthemax.india",      pass: "plmesth12!@" },
    { platform: "Instagram", brand: "Casovil",   id: "@casovil.world",    link: "https://instagram.com/casovil.world",     owner: "Sparsha", login: "Casovil / 9701382034", pass: "plmesth12!@" },
    // Threads (same logins as Instagram)
    { platform: "Threads", brand: "Primelaze", id: "primelazemeditech", owner: "Sparsha", login: "primelazemeditech",   pass: "Ju5645@P",          note: "Same login as Instagram" },
    { platform: "Threads", brand: "Esthemax",  id: "esthemax.india",    owner: "Sparsha", login: "esthemax.india",      pass: "plmesth12!@",       note: "Same login as Instagram" },
    { platform: "Threads", brand: "Celluma",   id: "Celluma_india",     owner: "Sparsha", login: "Celluma_india",       pass: "Primelaze@Zirakhpur", note: "Same login as Instagram" },
    { platform: "Threads", brand: "Casovil",   id: "@casovil.world",    owner: "Sparsha", login: "Casovil / 9701382034", pass: "plmesth12!@",      note: "Same login as Instagram" },
    // Facebook
    { platform: "Facebook", brand: "Primelaze", id: "facebook.com/primelaze", link: "https://facebook.com/primelaze", owner: "Sparsha", login: "er.arjun1987@gmail.com", pass: "Primelazefacebook#-123" },
    { platform: "Facebook", brand: "Esthemax",  id: "Esthemax page",          owner: "Sparsha", login: "esthemaxindia@gmail.com", pass: "Hju537&@9FG" },
    // YouTube
    { platform: "YouTube", brand: "Primelaze", id: "youtube.com/@marketingprimelaze", link: "https://youtube.com/@marketingprimelaze", owner: "Sparsha", login: "marketing@primelaze.com", pass: "Primelazemeditech@2022" },
    // LinkedIn
    { platform: "LinkedIn", brand: "Primelaze", id: "linkedin.com/company/primelaze-meditech", link: "https://linkedin.com/company/primelaze-meditech", owner: "Sparsha / Avedan", login: "er.arjun1987@gmail.com", pass: "Arjun@plm321" },
    // Pinterest
    { platform: "Pinterest", brand: "Primelaze", id: "Pinterest (primelaze)", owner: "Sparsha", login: "marketing@primelaze.com", pass: "Primelazemeditech@2022" },
    // Indiamart
    { platform: "Indiamart", brand: "Primelaze", id: "7339513001", owner: "Sparsha", login: "7339513001", pass: "OTP on Dhinesh sir's number", note: "OTP-based login" },
  ],
  addresses: [
    { brand: "Casovil", label: "Corporate Office", value: "SCO No. 23, Upper Ground Floor, Block A, Chandigarh Citi Center, VIP Road, Zirakpur, Mohali, Punjab – 140603" },
    { brand: "Casovil", label: "Head Office", value: "306, Bharathiyar Salai, Ashok Nagar, Lawspet, Puducherry – 605008" },
    { brand: "Casovil", label: "Hours", value: "Mon–Sat, 10am–7pm IST" },
  ],
};
