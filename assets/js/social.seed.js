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
};
