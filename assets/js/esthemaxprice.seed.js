/* ============================================================
   Primelaze — Esthemax full price structure (Company Price · super admin)
   From the Esthemax price structure + the new price list (MRP incl. 18% GST).

   Two market price lists (New Structure @15% hike in MRP):
     • markets.salon  → Saloon market  (Doctor Price @10%, offers 5+2 … corporate)
     • markets.doctor → Derma  market  (Doctor Price @20%, offers 3+1 … corporate)
   Each market row: [Sr, Name, MRP]. Every offer's effective net ₹/unit is
   computed as MRP × buy / (buy + free); the "on discounted price" corporate
   offers are computed on the doctor price instead of the MRP.

   Cost side (market-independent) — groups[] carries the factory cost build-up:
     Row: [Sr, Variant, Distribution$, EXW(INR factory), Customs@44%, Transport,
           Landing, Marketing, Profit, Total, MRP]
   Accessories: [Product, MRP, Factory$]. purchaseOrders: factory buys (USD).
   ============================================================ */
window.ESTHEMAX_PRICE_SEED = {
  version: 7,
  note: "Esthemax cost & price. Landing cost (factory → landing) is shared by both markets. Saloon & Derma carry the LISTED MRP; each market's selling MRP, extra-unit discount and offers are set live in its own calculator (defaults: +15% hike, 10% off, offers 5+1 and 10+3). Per box, ₹.",
  cols: ["Sr", "Variant", "Dist. ($)", "EXW / Factory", "Customs @44%", "Transport", "Landing", "Marketing", "Profit", "Total", "MRP"],
  // ---- Market price lists (customer-facing MRP + offers, per market) ----
  markets: {
    salon: {
      id: "salon", label: "Saloon", icon: "🧖",
      note: "Saloon market. MRP is the listed price (same for Saloon & Derma, not hiked). 1 box = MRP − single-box discount %; the two bulk tiers are buy+free offers. Margins are shown against a target guide. Adjust in the calculator — saves for everyone.",
      mrpHikePct: 15, discountPct: 10, discountLabel: "Extra unit · 10% off",
      // {label, p(buy), f(free)} — effective net ₹/unit = MRP × p / (p+f).
      offers: [
        { label: "5+1", p: 5, f: 1 },
        { label: "10+3", p: 10, f: 3 },
      ],
      groups: [
        {
          id: "hydro", title: "Hydrojelly Mask", pack: "850 ml", rows: [
            [1, "Antioxidant Goji", 11490],
            [2, "Super Greens Strength", 11490],
            [3, "Brightening Complex", 11490],
            [4, "Belgium Cacao", 10350],
            [5, "Egyptian Rose", 11490],
            [6, "Pure Himalayan White Tea", 10990],
            [7, "Resiliance Caviar", 10350],
            [8, "Australian Sheep Placenta", 11490],
            [9, "Re-Newal", 10990],
            [10, "Radiance Biotin", 10990],
            [11, "Intensive Aftercare", 11490],
            [12, "Hyaluronic Acid", 10990],
            [13, "Beta-Carotene", 10990],
            [14, "Cica Complex", 10990],
            [15, "Illuminating Orange", 11490],
            [16, "Phyto-Nutrients Blast", 10350],
            [17, "Skin Warrior Ageless", 10350],
            [18, "Purifying Charcoal", 11490],
            [19, "Vampire Infusion", 11490],
            [20, "Spot Diminishing ALA", 11490],
            [21, "CBD Dope", 15990],
            [22, "Youthful Elixir", 15990],
          ],
        },
        {
          id: "retail", title: "Retail Hydrojelly Mask", pack: "2 masks / box", rows: [
            [1, "Antioxidant Goji", 7500],
            [2, "Super Greens Strength", 7500],
            [3, "Brightening Complex", 7500],
            [4, "Egyptian Rose", 7500],
            [5, "Intensive Aftercare", 7500],
            [6, "Hyaluronic Acid", 7500],
            [7, "Cica Complex", 7500],
            [8, "Illuminating Orange", 7500],
            [9, "Phyto Nutrients", 7500],
            [10, "Skin Warrior Ageless", 7500],
            [11, "Purifying Charcoal", 7500],
          ],
        },
        {
          id: "foot", title: "Foot Mask", pack: "5 pairs / pack", priceMode: "target", rows: [
            [1, "Collagen Foot Mask", 14950],
          ],
        },
      ],
    },
    doctor: {
      id: "doctor", label: "Derma", icon: "💉",
      note: "Derma (doctor) market. MRP is the listed price (same for Saloon & Derma, not hiked). 1 box = MRP − single-box discount %; the two bulk tiers are buy+free offers. Margins are shown against a target guide. Adjust in the calculator — saves for everyone.",
      mrpHikePct: 15, discountPct: 10, discountLabel: "Extra unit · 10% off",
      offers: [
        { label: "5+1", p: 5, f: 1 },
        { label: "10+3", p: 10, f: 3 },
      ],
      groups: [
        {
          id: "hydro", title: "Hydrojelly Mask", pack: "850 ml", rows: [
            [1, "Antioxidant Goji", 11490],
            [2, "Super Greens Strength", 11490],
            [3, "Brightening Complex", 11490],
            [4, "Belgium Cacao", 10350],
            [5, "Egyptian Rose", 11490],
            [6, "Pure Himalayan White Tea", 10990],
            [7, "Resiliance Caviar", 10350],
            [8, "Australian Sheep Placenta", 11490],
            [9, "Re-Newal", 10990],
            [10, "Radiance Biotin", 10990],
            [11, "Intensive Aftercare", 11490],
            [12, "Hyaluronic Acid", 10990],
            [13, "Beta-Carotene", 10990],
            [14, "Cica Complex", 10990],
            [15, "Illuminating Orange", 11490],
            [16, "Phyto-Nutrients Blast", 10350],
            [17, "Skin Warrior Ageless", 10350],
            [18, "Purifying Charcoal", 11490],
            [19, "Vampire Infusion", 11490],
            [20, "Spot Diminishing ALA", 11490],
            [21, "CBD Dope", 15990],
            [22, "Youthful Elixir", 15990],
          ],
        },
        {
          id: "retail", title: "Retail Hydrojelly Mask", pack: "2 masks / box", rows: [
            [1, "Antioxidant Goji", 7500],
            [2, "Super Greens Strength", 7500],
            [3, "Brightening Complex", 7500],
            [4, "Egyptian Rose", 7500],
            [5, "Intensive Aftercare", 7500],
            [6, "Hyaluronic Acid", 7500],
            [7, "Cica Complex", 7500],
            [8, "Illuminating Orange", 7500],
            [9, "Phyto Nutrients", 7500],
            [10, "Skin Warrior Ageless", 7500],
            [11, "Purifying Charcoal", 7500],
          ],
        },
        {
          id: "foot", title: "Foot Mask", pack: "5 pairs / pack", priceMode: "target", rows: [
            [1, "Collagen Foot Mask", 14950],
          ],
        },
      ],
    },
  },
  groups: [
    {
      id: "hydro", title: "Hydrojelly Mask", pack: "850 ml", rows: [
        [1, "Antioxidant Goji", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [2, "Super Greens Strength", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [3, "Brightening Complex", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [4, "Belgium Cacao", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10350],
        [5, "Egyptian Rose", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [6, "Pure Himalayan White Tea", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10990],
        [7, "Resiliance Caviar", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10350],
        [8, "Australian Sheep Placenta", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [9, "Re-Newal", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10990],
        [10, "Radiance Biotin", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10990],
        [11, "Intensive Aftercare", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [12, "Hyaluronic Acid", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10990],
        [13, "Beta-Carotene", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10990],
        [14, "Cica Complex", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10990],
        [15, "Illuminating Orange", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [16, "Phyto-Nutrients Blast", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10350],
        [17, "Skin Warrior Ageless", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 10350],
        [18, "Purifying Charcoal", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [19, "Vampire Infusion", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [20, "Spot Diminishing ALA", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 11490],
        [21, "CBD Dope", 24, 2328, 1024.32, 66.93, 3419.25, 1994.51, 5128.87, 10542.64, 15990],
        [22, "Youthful Elixir", 24, 2328, 1024.32, 66.93, 3419.25, 1994.51, 5128.87, 10542.64, 15990],
      ],
    },
    {
      id: "retail", title: "Retail Hydrojelly Mask", pack: "2 masks / box", rows: [
        [1, "Antioxidant Goji", 11.1, 1076.7, 462.98, 21.53, 1561.22, 312.24, 1561.22, 3434.67, 5550],
        [2, "Super Greens Strength", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5550],
        [3, "Brightening Complex", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5550],
        [4, "Egyptian Rose", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5550],
        [5, "Intensive Aftercare", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5250],
        [6, "Hyaluronic Acid", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5250],
        [7, "Cica Complex", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5250],
        [8, "Illuminating Orange", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5550],
        [9, "Phyto Nutrients", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5250],
        [10, "Skin Warrior Ageless", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5250],
        [11, "Purifying Charcoal", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 5550],
      ],
    },
    {
      id: "foot", title: "Foot Mask", pack: "5 pairs / pack", priceMode: "target", rows: [
        [1, "Collagen Foot Mask", 55.1, 5344.7, 2351.67, 267.24, 7963.6, null, null, null, 14950],
      ],
    },
  ],
  accessories: [
    // [Product, MRP ₹ (null = priced to target margin), Factory $ per unit].
    // Colour variants share one price, so each is a single "any colour" row.
    // Accessories are priced to the target margins from their landing cost.
    ["Ampoule Caps (10 caps)", null, 2.50],
    ["Enzyme Activator", null, 4.40],
    ["Esthepro Cryo Globes", null, 20.50],
    ["Rolling Cryo Globes (any colour)", null, 27.50],
    ["24K Gold Plated Derma Stamp (12 stamps)", null, 82.50],
    ["5g Scoop for Enzyme Powder", null, 0.22],
    ["Natural Sponge (50 counts)", null, 17.60],
    ["Brush", null, 1.35],
    ["Silicone Brush", null, 1.85],
    ["Spa Utensils Organizer", null, 9.30],
    ["Fan Brush", null, 3.50],
    ["Volume Fan Brush", null, 4.95],
    ["Gauze (A4 / 100)", null, 6.00],
    ["Turban", null, 6.00],
    ["Mixing Bowl (any colour)", null, 4.40],
    ["Spatula (any colour)", null, 1.25],
    ["Small Spatula (any colour)", null, 0.66],
    ["Measuring Cup", null, 0.66],
    ["Rose Quartz Eye Mask", null, 29.70],
    ["Rose Quartz Face Mask", null, 66.00],
  ],
  purchaseOrders: [
    {
      no: "202607-IND", date: "20 Jul 2026", shipBy: "Air", payment: "TT",
      supplier: "K Beauty Group INC (DBA esthemax) — 1740 Crenshaw Blvd, Torrance, CA 90501",
      authorised: "Dhinesh R",
      totalQty: 1422, totalUsd: 8153.20,
      lines: [
        ["792", "Youthful Elixir Hydrojelly Mask 850gm", "30 fl oz", 48, 24.00, 1152.00],
        ["773", "Brightening Complex Hydrojelly Mask 850gm", "30 fl oz", 48, 13.80, 662.40],
        ["774", "Belgium Cacao Hydrojelly Mask 850gm", "30 fl oz", 48, 13.80, 662.40],
        ["781", "Intensive Aftercare Hydrojelly Mask 850gm", "30 fl oz", 48, 13.80, 662.40],
        ["775", "Egyptian Rose Hydrojelly Mask 850gm", "30 fl oz", 120, 13.80, 1656.00],
        ["785", "Illuminating Orange Hydrojelly Mask 850gm", "30 fl oz", 144, 13.80, 1987.20],
        ["R781", "Retail — Intensive Aftercare Hydrojelly Mask", "2 masks/box", 50, 11.10, 555.00],
        ["1102-4", "Spa Utensil — Mixing Bowl (Neon Green)", "", 50, 4.40, 220.00],
        ["1102-5", "Spa Utensil — Mixing Bowl (Hot Pink)", "", 50, 4.40, 220.00],
        ["1111-4", "Spa Utensil — Spatula (Neon Green)", "", 50, 1.25, 62.50],
        ["1111-2", "Spa Utensil — Spatula (Hot Pink)", "", 50, 1.25, 62.50],
        ["1121", "Spa Utensil — Measuring Cup", "", 150, 0.66, 99.00],
        ["775", "Sample — Egyptian Rose Hydrojelly Mask", "30 fl oz", 11, 13.80, 151.80],
      ],
    },
  ],
};
