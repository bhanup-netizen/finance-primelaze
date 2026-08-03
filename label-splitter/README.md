# 📦 Label & Invoice Splitter

A tiny, mobile‑friendly web tool that takes a **Flipkart / E‑Kart shipping PDF**
(where every page has a shipping label on top and a tax invoice below the dashed
cut line) and turns it into two clean, print‑ready outputs:

- **4×6 inch shipping labels** — one label per page, cropped and centred, ready
  for a thermal label printer (or A4 + cut).
- **Tax invoices, several‑to‑a‑page** — 4 invoices per A4 page by default, to
  save paper. You can also choose 2, 6, or 1 per page.

You upload the file, tap **Split PDF**, and download:

| File | What it is |
|------|-----------|
| `…-COMBINED.pdf`  | Labels first, then the packed invoices — the "complete PDF" to hand to staff |
| `…-LABELS-4x6.pdf`| Just the 4×6 shipping labels |
| `…-INVOICES-4up.pdf` | Just the packed tax invoices |

### 🔒 Everything runs in your browser
The PDF is processed **entirely on your device** using
[`pdf-lib`](https://pdf-lib.js.org/) (bundled locally in `vendor/`). No file is
ever uploaded to any server, which is why it works great on a phone and offline.

---

## Use it locally
Just open `index.html` in any modern browser, or serve the folder:

```bash
cd label-splitter
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy on Netlify

**Option A — deploy only this tool (recommended)**
1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import from Git**, pick the repo.
3. Set **Base directory** to `label-splitter`.
4. Leave **Build command** empty and **Publish directory** to `label-splitter`
   (the included `netlify.toml` already sets `publish = "."`).
5. Deploy. Your tool is live at `https://<your-site>.netlify.app/`.

**Option B — drag & drop**
Drag the `label-splitter` folder onto <https://app.netlify.com/drop>. Done.

**Option C — publish the whole repo**
If you deploy the repository root, the tool is available at
`https://<your-site>.netlify.app/label-splitter/`.

---

## Notes & tuning
- It’s calibrated for the standard Flipkart A4 label+invoice layout (label box
  and the dashed cut line at ~46% down the page). The crop is expressed as
  *fractions* of each page, so minor size differences are handled automatically.
- If your marketplace uses a different layout and the crop looks off, adjust the
  `CUT`, `LABEL`, and `INV` constants near the top of the `<script>` in
  `index.html`.
