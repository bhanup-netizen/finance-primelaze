# Primelaze Unified Dashboard · FY 2026-27

A self-contained web dashboard for Primelaze's FY 2026-27 sales plan — team
roster, per-HQ device & Celluma targets, incentive schemes, the full price book,
and the Esthemax salon/doctor market pricing. It is built from two source
workbooks and runs as a **static site** with no backend and no build step.

![Overview](docs/preview.png)

## What's inside

| Tab | Contents |
| --- | --- |
| **Overview** | Company KPIs (229 devices, 120 Celluma, reps, vacancies), zone rollups, device-by-zone and HQ-value charts. |
| **Team Roster** | All 18 personnel with role, base HQ, reporting line, zone and status. Search + filter by Active / To-join / Vacant. |
| **HQ Targets** | Per-HQ FY26-27 product plans (multi-plan where an HQ has several reps), quarterly splits and plan highlights. |
| **Incentives** | Device value-slab, Celluma per-model and Esthemax 6-tier slab plans for both Sales Person and Manager, plus the master T&C. |
| **Price Book** | Landing / quotation / standard / minimum prices for devices, Celluma models and Esthemax skincare. |
| **Esthemax Market** | Full salon & doctor pricing matrices — old vs new (+15% MRP) structures with bulk-offer tiers and effective net prices. |
| **Review Log** | Every review comment raised by Surya / HR / management, with resolution and status. |

Light and dark themes, responsive layout, keyboard-free navigation, deep-linkable
tabs (`#overview`, `#incentives`, …).

## Project structure

```
finance-primelaze/
├── index.html                 # App shell
├── assets/
│   ├── css/styles.css         # Design system (light + dark)
│   └── js/
│       ├── app.js             # All rendering / routing (vanilla JS)
│       └── data.js            # GENERATED — window.APP_DATA payload
├── src/data/data.json         # GENERATED — same data, pretty JSON (easy to diff)
├── scripts/extract_data.py    # Excel → JSON/JS extraction
├── source_workbooks/          # The two source .xlsx files
└── .github/workflows/pages.yml
```

## Run it locally

It's a static site — no server required.

```bash
# simplest: just open the file
open index.html            # macOS   (or: xdg-open index.html on Linux)

# or serve it (any static server works)
python3 -m http.server 8080
# → http://localhost:8080
```

Data is embedded in `assets/js/data.js` as `window.APP_DATA`, so the app works
straight from `file://` with no fetch/CORS issues.

## Regenerating the data

The app data is derived from the two workbooks in `source_workbooks/`. After
updating either workbook, re-run the extractor:

```bash
pip install openpyxl
python3 scripts/extract_data.py
```

This rewrites `src/data/data.json` and `assets/js/data.js`. Commit both.

**Sources**

- `Primelaze_Unified_Dashboard_FY2627.xlsx` — master dashboard, roster,
  incentive/cost tabs and the 9 regional HQ sheets.
- `Esthemax_prices_working.xlsx` — Salon Market and Doctor Market price tables.

## Deploying to GitHub Pages

A workflow at `.github/workflows/pages.yml` deploys the site on every push to
`main`. Enable it once under **Settings → Pages → Source: “GitHub Actions”**.
The published URL will be `https://<owner>.github.io/finance-primelaze/`.

## Notes

- All figures are **excluding GST** unless a column states otherwise.
- Incentives are computed on the **Standard / selling** basis, not the quotation.
- 🟡 draft cells in the source workbooks (minimums / incentives pending
  Finance verification) are carried through as-is — verify against source before
  operational use.
