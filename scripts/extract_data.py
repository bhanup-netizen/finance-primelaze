#!/usr/bin/env python3
"""
Extract the Primelaze Unified Dashboard and Esthemax price workbooks into a
single clean JSON payload consumed by the web app.

Usage:
    python scripts/extract_data.py

Outputs:
    src/data/data.json      -- pretty JSON (source of truth, easy to diff)
    assets/js/data.js       -- `window.APP_DATA = {...}` (loaded by the app,
                               works over file:// with no fetch/CORS issues)

The parsers below are intentionally targeted at the known layout of each sheet
rather than being fully generic — the workbooks are hand-built dashboards with
section headers and merged cells, so a generic table reader produces noise.
"""
import json
import os
from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WB_DIR = os.path.join(ROOT, "source_workbooks")
DASHBOARD = os.path.join(WB_DIR, "Primelaze_Unified_Dashboard_FY2627.xlsx")
PRICES = os.path.join(WB_DIR, "Esthemax_prices_working.xlsx")


def rows_of(ws):
    """Return list of row-lists (1-indexed friendly: rows_of(ws)[i] == row i+1)."""
    return [list(r) for r in ws.iter_rows(values_only=True)]


def clean(v):
    if isinstance(v, str):
        return v.strip()
    return v


def num(v):
    """Round floats a touch to kill spreadsheet noise, keep ints as ints."""
    if isinstance(v, float):
        if v == int(v):
            return int(v)
        return round(v, 2)
    return v


# --------------------------------------------------------------------------
# Dashboard workbook
# --------------------------------------------------------------------------
def parse_kpis(ws):
    r = rows_of(ws)
    # R7 (index 6): [None, 229, None, 120, None, 12, None, 4]
    vals = r[6]
    labels = r[7]
    return {
        "devices": num(vals[1]),
        "celluma": num(vals[3]),
        "activeReps": num(vals[5]),
        "vacant": num(vals[7]),
        "devicesNote": clean(labels[1]),
        "cellumaNote": clean(labels[3]),
        "repsNote": clean(labels[5]),
        "vacantNote": clean(labels[7]),
    }


def parse_master_targets(ws):
    """Rows 14..46: zone headers, HQ headers, and numbered salesperson rows."""
    r = rows_of(ws)
    zones = []
    cur_zone = None
    cur_hq = None
    for row in r[13:47]:
        c1 = clean(row[1])
        if c1 is None:
            continue
        text = str(c1)
        if text.startswith("◆") or "ZONE" in text and text.startswith("   ◆"):
            cur_zone = {"name": text.replace("◆", "").strip(), "hqs": []}
            zones.append(cur_zone)
            cur_hq = None
            continue
        if text.startswith("▶"):
            cur_hq = {"name": text.replace("▶", "").strip(), "people": []}
            if cur_zone is None:
                cur_zone = {"name": "Other", "hqs": []}
                zones.append(cur_zone)
            cur_zone["hqs"].append(cur_hq)
            continue
        # numbered person row
        if isinstance(c1, (int, float)):
            person = {
                "num": num(c1),
                "name": clean(row[2]),
                "role": clean(row[3]),
                "baseHQ": clean(row[4]),
                "reportsTo": clean(row[5]),
                "devices": num(row[6]) if row[6] not in (None, "") else None,
                "celluma": num(row[7]) if row[7] not in (None, "") else None,
                "notes": clean(row[8]),
            }
            if cur_hq is None:
                cur_hq = {"name": cur_zone["name"] if cur_zone else "Team", "people": []}
                (cur_zone or {"hqs": zones}).setdefault("hqs", []).append(cur_hq)
            cur_hq["people"].append(person)
    return zones


def parse_roster(ws):
    r = rows_of(ws)
    people = []
    for row in r[7:26]:  # rows 8..26
        n = row[1]
        if not isinstance(n, (int, float)):
            continue
        people.append({
            "num": num(n),
            "name": clean(row[2]),
            "designation": clean(row[3]),
            "baseHQ": clean(row[4]),
            "reportsTo": clean(row[5]),
            "zone": clean(row[6]),
            "notes": clean(row[11]) if len(row) > 11 else None,
        })
    summary = {}
    for row in r[26:30]:
        label = clean(row[1])
        val = None
        for c in row[2:]:
            if isinstance(c, (int, float)):
                val = num(c)
                break
        if label:
            summary[label.replace("•", "").strip()] = val
    return {"people": people, "summary": summary}


def parse_device_incentive(ws):
    r = rows_of(ws)

    def grab(start):
        out = []
        for row in r[start:start + 12]:
            name = clean(row[1])
            if not name or clean(row[2]) is None and not isinstance(row[2], (int, float)):
                continue
            out.append({
                "device": name,
                "quotation": num(row[2]),
                "standard": num(row[3]),
                "minimum": num(row[4]),
                "stdIncentive": num(row[5]),
                "minIncentive": num(row[6]),
                "aboveStd": clean(row[7]),
            })
        return out

    return {"salesperson": grab(7), "manager": grab(23)}


def parse_celluma_incentive(ws):
    r = rows_of(ws)
    out = []
    for row in r[7:20]:  # rows 8..20
        name = clean(row[1])
        if not name:
            continue
        out.append({
            "model": name,
            "sellingPrice": num(row[2]),
            "salespersonIncentive": num(row[3]),
            "managerIncentive": num(row[4]),
        })
    return out


def parse_esthemax_incentive(ws):
    r = rows_of(ws)

    def tiers(start):
        out = []
        for row in r[start:start + 6]:
            tier = clean(row[1])
            if not tier:
                continue
            out.append({
                "tier": tier,
                "min": num(row[2]),
                "max": clean(row[3]),
                "incentive": num(row[4]),
                "label": clean(row[5]),
            })
        return out

    return {"salesperson": tiers(7), "manager": tiers(20)}


def parse_device_cost(ws):
    r = rows_of(ws)
    out = []
    for row in r[5:18]:
        name = clean(row[1])
        if not name:
            continue
        out.append({
            "device": name,
            "landingCost": num(row[2]),
            "quotation": num(row[3]),
            "standard": num(row[4]),
            "minimum": num(row[5]),
        })
    return out


def parse_celluma_cost(ws):
    r = rows_of(ws)
    out = []
    for row in r[6:19]:
        name = clean(row[1])
        if not name:
            continue
        out.append({
            "model": name,
            "quotation": num(row[2]),
            "selling": num(row[3]),
        })
    return out


def parse_esthemax_cost(ws):
    r = rows_of(ws)
    sections = {"hydrojelly": [], "retail": [], "footMask": []}
    cur = None
    for row in r[4:47]:
        c1 = clean(row[1])
        if c1 is None:
            continue
        text = str(c1)
        if "HYDROJELLY MASK" in text:
            cur = "hydrojelly"; continue
        if "RETAIL HYDROJELLY" in text:
            cur = "retail"; continue
        if "COLLAGEN FOOT MASK" in text or (text == "Collagen Foot Mask"):
            cur = "footMask"
        if cur is None:
            continue
        if not isinstance(row[2], str):
            # variant rows have a pack string in col 2
            pass
        if clean(row[2]) is None:
            continue
        sections[cur].append({
            "variant": clean(row[1]),
            "pack": clean(row[2]),
            "landingCost": num(row[3]),
            "standardTotal": num(row[4]),
            "mrp": num(row[5]),
            "newMrp": num(row[6]),
            "minEXW": num(row[7]),
        })
    return sections


def parse_tc(ws):
    r = rows_of(ws)
    sections = []
    cur = None
    for row in r[5:]:
        c1 = clean(row[1])
        c2 = clean(row[2])
        if c1 is None:
            continue
        text = str(c1)
        if text[:2].strip().isdigit() and "." in text[:4]:
            cur = {"title": text.strip(), "items": []}
            sections.append(cur)
            continue
        if cur is not None and c2:
            cur["items"].append({"term": text.strip(), "detail": str(c2).strip()})
    return sections


def parse_comments(ws):
    r = rows_of(ws)
    out = []
    for row in r[6:28]:
        n = row[1]
        if not isinstance(n, (int, float)):
            continue
        out.append({
            "num": num(n),
            "raisedBy": clean(row[2]),
            "location": clean(row[3]),
            "topic": clean(row[4]),
            "comment": clean(row[5]),
            "resolution": clean(row[6]),
            "status": clean(row[7]),
        })
    return out


def parse_hq(ws):
    """Generic-ish parser for the regional HQ target sheets."""
    r = rows_of(ws)
    title = clean(r[1][1]) if len(r) > 1 else ws.title
    subtitle = clean(r[3][1]) if len(r) > 3 else None

    # Top summary block: header row is the one containing 'FY25-26 Actual'.
    # Values are on the next row, descriptive notes on the row after that.
    summary = []
    for i, row in enumerate(r[:12]):
        cells = [clean(c) for c in row]
        if any(isinstance(c, str) and "FY25-26 Actual" in c for c in cells):
            head = r[i]
            vals = r[i + 1] if i + 1 < len(r) else []
            notes = r[i + 2] if i + 2 < len(r) else []
            for j, h in enumerate(head):
                if not clean(h):
                    continue
                v = vals[j] if j < len(vals) else None
                if v is None or (isinstance(v, str) and not v.strip()):
                    continue
                summary.append({
                    "label": clean(h),
                    "value": num(v) if isinstance(v, (int, float)) else clean(v),
                    "note": clean(notes[j]) if j < len(notes) else None,
                })
            break

    # Product plan tables — some HQs (e.g. West) carry several sub-plans, one
    # per rep. Capture every 'Product' header block, labelling each with the
    # nearest preceding section header (row starting with ▶ or 'ASM Plan —').
    plans = []
    for i, row in enumerate(r):
        cells = [clean(c) for c in row]
        if "Product" not in cells or not ("FY26-27" in cells or "FY25-26" in cells):
            continue
        # find a label by scanning upward for a section header
        label = None
        for back in range(i - 1, max(i - 6, -1), -1):
            t = clean(r[back][1])
            if isinstance(t, str) and t.strip():
                st = t.strip()
                if st.startswith("▶") or "Plan" in st or "ASM" in st or "Role" in st:
                    label = st.replace("▶", "").strip()
                    break
        rows = []
        for prow in r[i + 1:i + 30]:
            name = clean(prow[1])
            if not name:
                continue
            if str(name).upper().startswith("TOTAL"):
                rows.append({
                    "product": "TOTAL",
                    "fy2526": num(prow[2]) if isinstance(prow[2], (int, float)) else None,
                    "fy2627": num(prow[3]) if isinstance(prow[3], (int, float)) else None,
                    "totalValue": num(prow[5]) if isinstance(prow[5], (int, float)) else None,
                    "isTotal": True,
                })
                break
            if not any(isinstance(prow[k], (int, float)) for k in (2, 3, 4, 5)):
                break
            rows.append({
                "product": name,
                "fy2526": num(prow[2]) if isinstance(prow[2], (int, float)) else prow[2],
                "fy2627": num(prow[3]) if isinstance(prow[3], (int, float)) else prow[3],
                "deviceValue": num(prow[4]) if isinstance(prow[4], (int, float)) else None,
                "totalValue": num(prow[5]) if isinstance(prow[5], (int, float)) else None,
                "notes": clean(prow[9]) if len(prow) > 9 else None,
            })
        if rows:
            plans.append({"label": label, "rows": rows})
    # Backwards-compatible flat plan = first table's rows.
    plan = plans[0]["rows"] if plans else []

    # Quarterly target table (Units / Value rows)
    quarterly = []
    for i, row in enumerate(r):
        cells = [clean(c) for c in row]
        if "Basis" in cells and "Annual" in cells and "Q1" in cells:
            for qrow in r[i + 1:i + 5]:
                basis = clean(qrow[1])
                # Only real quarterly rows: numeric annual + numeric quarters.
                if not basis or not isinstance(qrow[2], (int, float)):
                    break
                quarterly.append({
                    "basis": basis,
                    "annual": num(qrow[2]),
                    "q1": num(qrow[3]),
                    "q2": num(qrow[4]),
                    "q3": num(qrow[5]),
                    "q4": num(qrow[6]),
                })
            break

    # Plan highlights (emoji bullet lines)
    highlights = []
    for row in r:
        c1 = clean(row[1])
        if isinstance(c1, str) and c1 and c1[0] in "📊💎💰🆕🎯👥🗺🔑⭐✅":
            highlights.append(c1)

    return {
        "sheet": ws.title,
        "title": title,
        "subtitle": subtitle,
        "summary": summary,
        "plan": plan,
        "plans": plans,
        "quarterly": quarterly,
        "highlights": highlights,
    }


# --------------------------------------------------------------------------
# Esthemax price workbook (Salon / Doctor)
# --------------------------------------------------------------------------
def parse_price_market(ws):
    """Positional parse — the price sheets have duplicate column names
    (Old Structure vs New Structure both have 'MRP', 'Effective Net Price'),
    so we keep values as an array aligned to the header, never a name-keyed
    dict (which would silently drop columns)."""
    r = rows_of(ws)
    band = [clean(c) if c is not None else "" for c in r[0]]   # row 1: Old/New band
    header = [clean(c) if c is not None else "" for c in r[1]]  # row 2: column names
    ncol = len(header)
    groups = {"HYDROJELLYMASK": [], "RETAIL HYDROJELLYMASK": [], "Foot Mask": []}
    cur = None
    for row in r[2:]:
        first = clean(row[0])
        if isinstance(first, str):
            key = first.upper().replace(" ", "")
            if key == "HYDROJELLYMASK":
                cur = "HYDROJELLYMASK"; continue
            if key == "RETAILHYDROJELLYMASK":
                cur = "RETAIL HYDROJELLYMASK"; continue
            if key == "FOOTMASK":
                cur = "Foot Mask"; continue
        if cur is None or not isinstance(first, (int, float)):
            continue
        values = []
        for idx in range(ncol):
            v = row[idx] if idx < len(row) else None
            values.append(num(v) if isinstance(v, (int, float)) else clean(v))
        groups[cur].append({"srNo": num(first), "name": clean(row[1]), "values": values})
    return {"band": band, "columns": header, "groups": groups}


def main():
    dash = load_workbook(DASHBOARD, data_only=True)
    prices = load_workbook(PRICES, data_only=True)

    hq_sheets = [s for s in dash.sheetnames if s.endswith("HQ")]

    data = {
        "meta": {
            "company": "Primelaze",
            "fiscalYear": "FY 2026-27",
            "title": "Primelaze Unified Dashboard",
            "source": [
                "Primelaze_Unified_Dashboard_FY2627.xlsx",
                "Esthemax_prices_working.xlsx",
            ],
        },
        "kpis": parse_kpis(dash["Master Dashboard"]),
        "zones": parse_master_targets(dash["Master Dashboard"]),
        "roster": parse_roster(dash["Team Roster"]),
        "incentives": {
            "device": parse_device_incentive(dash["Device Incentive"]),
            "celluma": parse_celluma_incentive(dash["Celluma Incentive"]),
            "esthemax": parse_esthemax_incentive(dash["Esthemax Incentive"]),
            "terms": parse_tc(dash["Incentive T&C"]),
        },
        "costs": {
            "device": parse_device_cost(dash["Device Cost"]),
            "celluma": parse_celluma_cost(dash["Celluma Cost"]),
            "esthemax": parse_esthemax_cost(dash["Esthemax Cost"]),
        },
        "hqTargets": [parse_hq(dash[s]) for s in hq_sheets],
        "comments": parse_comments(dash["Comments Log"]),
        "esthemaxPrices": {
            "salon": parse_price_market(prices["Salon Market"]),
            "doctor": parse_price_market(prices["Doctor Market"]),
        },
    }

    out_json = os.path.join(ROOT, "src", "data", "data.json")
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    out_js = os.path.join(ROOT, "assets", "js", "data.js")
    os.makedirs(os.path.dirname(out_js), exist_ok=True)
    with open(out_js, "w") as f:
        f.write("// AUTO-GENERATED by scripts/extract_data.py — do not edit by hand.\n")
        f.write("window.APP_DATA = ")
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write(";\n")

    print("Wrote:")
    print(" ", out_json)
    print(" ", out_js)
    print(f"KPIs: {data['kpis']}")
    print(f"Zones: {len(data['zones'])}  HQ sheets: {len(data['hqTargets'])}")
    print(f"Roster: {len(data['roster']['people'])} people")
    print(f"Device incentive SP rows: {len(data['incentives']['device']['salesperson'])}")
    print(f"Esthemax cost hydrojelly: {len(data['costs']['esthemax']['hydrojelly'])}")


if __name__ == "__main__":
    main()
