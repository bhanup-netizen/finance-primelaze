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
  version: 6,
  note: "Full Esthemax cost & price structure — distribution ($), factory (EXW), customs @44%, transport, landing and MRP. Saloon & Derma selling MRP is hiked 15% over the listed price; offers 5+1 and 10+3, with extra units beyond a pack at 10% off. Per box, ₹.",
  cols: ["Sr", "Variant", "Dist. ($)", "EXW / Factory", "Customs @44%", "Transport", "Landing", "Marketing", "Profit", "Total", "MRP"],
  // ---- Market price lists (customer-facing MRP + offers, per market) ----
  markets: {
    salon: {
      id: "salon", label: "Saloon", icon: "🧖",
      note: "Saloon market — MRP hiked 15% over the listed price. Offers: 5+1 and 10+3. Any unit bought beyond a complete 5+1 or 10+3 pack is 10% off (e.g. buy 7 → 6 under the 5+1 offer + the 7th at 10% off).",
      discountPct: 10, discountLabel: "Extra unit · 10% off",
      // {label, p(buy), f(free)} — effective net ₹/unit = MRP × p / (p+f).
      offers: [
        { label: "5+1", p: 5, f: 1 },
        { label: "10+3", p: 10, f: 3 },
      ],
      groups: [
        {
          id: "hydro", title: "Hydrojelly Mask", pack: "850 ml", rows: [
            [1, "Antioxidant Goji", 13213.5],
            [2, "Super Greens Strength", 13213.5],
            [3, "Brightening Complex", 13213.5],
            [4, "Belgium Cacao", 11902.5],
            [5, "Egyptian Rose", 13213.5],
            [6, "Pure Himalayan White Tea", 12638.5],
            [7, "Resiliance Caviar", 11902.5],
            [8, "Australian Sheep Placenta", 13213.5],
            [9, "Re-Newal", 12638.5],
            [10, "Radiance Biotin", 12638.5],
            [11, "Intensive Aftercare", 13213.5],
            [12, "Hyaluronic Acid", 12638.5],
            [13, "Beta-Carotene", 12638.5],
            [14, "Cica Complex", 12638.5],
            [15, "Illuminating Orange", 13213.5],
            [16, "Phyto-Nutrients Blast", 11902.5],
            [17, "Skin Warrior Ageless", 11902.5],
            [18, "Purifying Charcoal", 13213.5],
            [19, "Vampire Infusion", 13213.5],
            [20, "Spot Diminishing ALA", 13213.5],
            [21, "CBD Dope", 18388.5],
            [22, "Youthful Elixir", 18388.5],
          ],
        },
        {
          id: "retail", title: "Retail Hydrojelly Mask", pack: "2 masks / box", rows: [
            [1, "Antioxidant Goji", 6382.5],
            [2, "Super Greens Strength", 6382.5],
            [3, "Brightening Complex", 6382.5],
            [4, "Egyptian Rose", 6382.5],
            [5, "Intensive Aftercare", 6037.5],
            [6, "Hyaluronic Acid", 6037.5],
            [7, "Cica Complex", 6037.5],
            [8, "Illuminating Orange", 6382.5],
            [9, "Phyto Nutrients", 6037.5],
            [10, "Skin Warrior Ageless", 6037.5],
            [11, "Purifying Charcoal", 6382.5],
          ],
        },
        {
          id: "foot", title: "Foot Mask", pack: "5 pairs / pack", rows: [
            [1, "Collagen Foot Mask", 17192.5],
          ],
        },
      ],
    },
    doctor: {
      id: "doctor", label: "Derma", icon: "💉",
      note: "Derma (doctor) market — MRP hiked 15% over the listed price. Offers: 5+1 and 10+3. Any unit bought beyond a complete 5+1 or 10+3 pack is 10% off (e.g. buy 7 → 6 under the 5+1 offer + the 7th at 10% off).",
      discountPct: 10, discountLabel: "Extra unit · 10% off",
      offers: [
        { label: "5+1", p: 5, f: 1 },
        { label: "10+3", p: 10, f: 3 },
      ],
      groups: [
        {
          id: "hydro", title: "Hydrojelly Mask", pack: "850 ml", rows: [
            [1, "Antioxidant Goji", 13213.5],
            [2, "Super Greens Strength", 13213.5],
            [3, "Brightening Complex", 13213.5],
            [4, "Belgium Cacao", 11902.5],
            [5, "Egyptian Rose", 13213.5],
            [6, "Pure Himalayan White Tea", 12638.5],
            [7, "Resiliance Caviar", 11902.5],
            [8, "Australian Sheep Placenta", 13213.5],
            [9, "Re-Newal", 12638.5],
            [10, "Radiance Biotin", 12638.5],
            [11, "Intensive Aftercare", 13213.5],
            [12, "Hyaluronic Acid", 12638.5],
            [13, "Beta-Carotene", 12638.5],
            [14, "Cica Complex", 12638.5],
            [15, "Illuminating Orange", 13213.5],
            [16, "Phyto-Nutrients Blast", 11902.5],
            [17, "Skin Warrior Ageless", 11902.5],
            [18, "Purifying Charcoal", 13213.5],
            [19, "Vampire Infusion", 13213.5],
            [20, "Spot Diminishing ALA", 13213.5],
            [21, "CBD Dope", 18388.5],
            [22, "Youthful Elixir", 18388.5],
          ],
        },
        {
          id: "retail", title: "Retail Hydrojelly Mask", pack: "2 masks / box", rows: [
            [1, "Antioxidant Goji", 6382.5],
            [2, "Super Greens Strength", 6382.5],
            [3, "Brightening Complex", 6382.5],
            [4, "Egyptian Rose", 6382.5],
            [5, "Intensive Aftercare", 6037.5],
            [6, "Hyaluronic Acid", 6037.5],
            [7, "Cica Complex", 6037.5],
            [8, "Illuminating Orange", 6382.5],
            [9, "Phyto Nutrients", 6037.5],
            [10, "Skin Warrior Ageless", 6037.5],
            [11, "Purifying Charcoal", 6382.5],
          ],
        },
        {
          id: "foot", title: "Foot Mask", pack: "5 pairs / pack", rows: [
            [1, "Collagen Foot Mask", 17192.5],
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
      id: "foot", title: "Foot Mask", pack: "5 pairs / pack", rows: [
        [1, "Collagen Foot Mask", 55.1, 5344.7, 2351.67, 267.24, 7963.6, null, null, null, 14950],
      ],
    },
  ],
  accessories: [
    // [Product, MRP ₹, Factory $ per unit] — utensil factory prices from the PO
    // (uniform across colours: Mixing Bowl $4.40, Spatula $1.25, Measuring Cup/Scoop $0.66).
    ["Rolling Cryo Globes — Pink", 11500, null],
    ["Rolling Cryo Globes — White", 11500, null],
    ["Natural Sponge", 6900, null],
    ["Brush", 517.5, null],
    ["Silicone Brush", 690, null],
    ["Mixing Bowl — White", 1725, 4.40],
    ["Mixing Bowl — Hot Pink", 1725, 4.40],
    ["Mixing Bowl — Neon Green", 1725, 4.40],
    ["Mixing Bowl — Gold", 1725, 4.40],
    ["Spatula — White", 517.5, 1.25],
    ["Spatula — Hot Pink", 517.5, 1.25],
    ["Spatula — Neon Green", 517.5, 1.25],
    ["Spatula — Gold", 517.5, 1.25],
    ["Small Spatula — Cream", 230, null],
    ["Small Spatula — Pink", 230, null],
    ["Measuring Cup", 230, 0.66],
    ["5g Scoop", 115, 0.66],
    ["Rose Quartz Eye Mask — Hydrojelly Mask", 11500, null],
    ["Rose Quartz Full Face Mask — Hydrojelly Mask", 28750, null],
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
