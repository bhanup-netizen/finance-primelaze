/* Social-media presence seed (Admin › Social Media tab).
   Sheet1 = platform presence (visible to anyone with the page).
   Sheet2 = account logins — passwords are shown to admins / super admins only
   in the UI. NOTE: this file is plaintext in the repo; treat with care. */
window.SOCIAL_SEED = {
  presence: [
    { n: 1,  media: "Instagram",   account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "Yes" },
    { n: 2,  media: "Threads",     account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "Yes" },
    { n: 3,  media: "Facebook",    account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "No"  },
    { n: 4,  media: "Youtube",     account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "Yes", celluma: "No"  },
    { n: 5,  media: "LinkedIn",    account: "Available",     active: "Active",     managedBy: "Sparsha/Avedan", primelaze: "Yes", esthemax: "No",  celluma: "No"  },
    { n: 6,  media: "Pinterest",   account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "No",  celluma: "No"  },
    { n: 7,  media: "Indiamart",   account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "No",  celluma: "No"  },
    { n: 8,  media: "Mail",        account: "Available",     active: "Active",     managedBy: "Sparsha",        primelaze: "Yes", esthemax: "No",  celluma: "No"  },
    { n: 9,  media: "Website",     account: "Available",     active: "Active",     managedBy: "Sparsha/Vikas",  primelaze: "Yes", esthemax: "No",  celluma: "No"  },
    { n: 10, media: "X (Twitter)", account: "Not Available", active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No"  },
    { n: 11, media: "Quora",       account: "Not Available", active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No"  },
    { n: 12, media: "Snapchat",    account: "Available",     active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No"  },
    { n: 13, media: "Reddit",      account: "Not Available", active: "Not Active", managedBy: "-",              primelaze: "No",  esthemax: "No",  celluma: "No"  },
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
  websites: [
    {
      brand: "Casovil", site: "casovil.com",
      emails: [
        { addr: "sales@casovil.com", purpose: "Sales & orders — contact/enquiry form and the cart's “send order request”", where: "Contact page, all footers, order flow" },
        { addr: "info@casovil.com", purpose: "General enquiries (catch-all)", where: "Contact page, all footers, legal pages" },
        { addr: "itsupport@primelaze.com", purpose: "Admin login only — internal order-management backend", where: "Not shown publicly on the site" },
      ],
      phones: [
        { num: "+91 97013 82034", purpose: "Call & WhatsApp — floating “Chat on WhatsApp” button + contact page" },
      ],
      social: [
        { platform: "Instagram", handle: "@casovil.world", link: "https://instagram.com/casovil.world" },
      ],
      addresses: [
        { label: "Corporate Office", value: "SCO No. 23, Upper Ground Floor, Block A, Chandigarh Citi Center, VIP Road, Zirakpur, Mohali, Punjab – 140603" },
        { label: "Head Office", value: "306, Bharathiyar Salai, Ashok Nagar, Lawspet, Puducherry – 605008" },
        { label: "Hours", value: "Mon–Sat, 10am–7pm IST" },
      ],
    },
    {
      brand: "Primelaze Meditech", site: "primelaze.com",
      emails: [
        { addr: "calls@primelaze.com", purpose: "General & Sales enquiries (contact, demo, brochure forms)" },
        { addr: "servicesupport@primelaze.com", purpose: "Service / technical support" },
        { addr: "hr@primelaze.com", purpose: "HR & Careers (job applications)" },
        { addr: "salessupport@primelaze.com", purpose: "Sales support (support portal)" },
        { addr: "info@primelaze.com", purpose: "General info (support portal)" },
      ],
      phones: [
        { num: "+91 74167 35111", purpose: "Sales / Demo Enquiry (main — shown in header on every page)" },
        { num: "+91 97013 82034", purpose: "Service Support" },
        { num: "+91 78459 13001", purpose: "HR & Careers" },
        { num: "+91 99155 59151", purpose: "WhatsApp (chat button + all “WhatsApp” links)" },
      ],
      social: [
        { platform: "Facebook", handle: "facebook.com/primelaze", link: "https://facebook.com/primelaze" },
        { platform: "Instagram", handle: "instagram.com/primelazemeditech", link: "https://instagram.com/primelazemeditech" },
        { platform: "YouTube", handle: "youtube.com/@marketingprimelaze", link: "https://youtube.com/@marketingprimelaze" },
        { platform: "LinkedIn (company)", handle: "linkedin.com/company/primelaze-meditech", link: "https://linkedin.com/company/primelaze-meditech" },
      ],
      addresses: [],
    },
  ],
};
