# Firebase setup — Primelaze dashboard

The dashboard now signs in with **Firebase Auth** and stores permissions +
edits in **Firestore**. Do these one-time steps in the
[Firebase console](https://console.firebase.google.com/) for project
**primelaze-fd050**.

## 1. Enable Email/Password sign-in
Build → **Authentication** → **Get started** → **Sign-in method** →
enable **Email/Password** → Save.

## 2. Create the Firestore database
Build → **Firestore Database** → **Create database** → Production mode →
pick a location → Enable.

## 3. Publish the security rules
Firestore Database → **Rules** tab → paste the contents of
[`firestore.rules`](firestore.rules) → **Publish**.

## 4. Create the first (bootstrap) admin
Authentication → **Users** → **Add user** →
email `bhanup@primelaze.com` + a password. This email is the built-in
super-admin (set in `assets/js/firebase-config.js` and `firestore.rules` —
change it in both places if you want a different one).

Sign in to the app with that account. On first login it auto-creates its own
admin permission doc and seeds `config/app.dataKey` with the current data
password (`prime@1986`). After that, use the **⚙ Admin** tab to add everyone
else and set their page / HQ access.

## 5. Authorize your web domain
Authentication → **Settings** → **Authorized domains** → make sure your site's
domain is listed (e.g. `bhanup-netizen.github.io` for GitHub Pages, and
`localhost` for local testing). `*.firebaseapp.com` is there by default.

---

## How access works
- **Login** — every user signs in with email + password (accounts you create in
  the Admin tab).
- **Roles** — `admin` (full edit, sees landing/cost prices, sees the Admin tab)
  or `view` (read-only).
- **Per-user scope** — which **pages** and which **HQs** each user can see, and
  whether they may see **landing/lending cost prices**.
- **Data at rest** — the dashboard data stays AES-encrypted in
  `assets/js/data.enc.js`; the key lives in `config/app` and is handed out only
  after a successful sign-in, so the public file stays unreadable to anonymous
  visitors.
- **Edits** — admin edits to inventory stock, ETAs and HQ targets save to
  `edits/overrides` and load for everyone.

## Data model (Firestore)
```
config/app         { dataKey: "prime@1986" }
users/{uid}        { email, role: "admin"|"view", pages: "all"|[ids],
                     hqs: "all"|[hqNames], landing: bool, name }
edits/overrides    { stock: {sku: n}, eta: {sku: date}, hqTargets: {key: n},
                     demo: { status: {"r#c": v}, movement: {"r#c": v} } }
challans/{id}      { no, date, mode, dispatch, arrival, fromName, fromAddr,
                     toName, toAddr, declaredValue, items:[{desc,amount}],
                     notes, createdBy, createdAt }
```

The **Delivery Challan** module stores challans in the `challans` collection
(admins create/edit; everyone reads & downloads). Rules for it are already in
`firestore.rules`.

## Notes / limits
- Creating a user from the Admin tab uses a temporary secondary Firebase app so
  your admin session isn't interrupted. The person should change their password
  after first login (Auth handles reset emails if you enable the template).
- **Revoke** in the Admin tab removes a user's Firestore permission doc (cuts off
  their access). Fully deleting the Auth account requires the Firebase console
  or Admin SDK (client SDKs can't delete other users).
- To change the data-encryption password later: update `config/app.dataKey` and
  re-run `node scripts/encrypt_data.js` with the same `PRIMELAZE_PW`.
