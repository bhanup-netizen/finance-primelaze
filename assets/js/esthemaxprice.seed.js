/* ============================================================
   Primelaze — Esthemax full price structure (Company Price · super admin)
   From "Esthemax_price_structure.xlsx" and "Esthemax_Accessories.pdf".
   Row format: [Sr, Variant, Distribution$ , EXW(INR factory), Customs@44%,
                Transport, Landing, Marketing, Profit, Total, MRP]
   Accessories: [Product, MRP].
   ============================================================ */
window.ESTHEMAX_PRICE_SEED = {
  note: "Full Esthemax cost & price structure — distribution price, factory (EXW), customs @44%, transport, landing, marketing, profit, total and MRP. Per box, in ₹ (distribution price in USD).",
  cols: ["Sr", "Variant", "Dist. ($)", "EXW / Factory", "Customs @44%", "Transport", "Landing", "Marketing", "Profit", "Total", "MRP"],
  groups: [
    {
      id: "hydro", title: "Hydrojelly Mask", pack: "850 ml", rows: [
        [1, "Antioxidant Goji", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [2, "Super Greens Strength", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [3, "Brightening Complex", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [4, "Belgium Cacao", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 8990],
        [5, "Egyptian Rose", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [6, "Pure Himalayan White Tea", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9490],
        [7, "Resiliance Caviar Hydrojelly", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 8990],
        [8, "Australian Sheep Placenta", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [9, "Re-Newal", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9490],
        [10, "Radiance Biotin", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9490],
        [11, "Intensive Aftercare", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [12, "Hyaluronic Acid", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9490],
        [13, "Beta-Carotene", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9490],
        [14, "Cica Complex", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9490],
        [15, "Illuminating Orange", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [16, "Phyto-Nutrients Blast", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 8990],
        [17, "Skin Warrior Ageless", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 8990],
        [18, "Purifying Charcoal", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [19, "Vampire Infusion", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [20, "Spot Diminishing ALA", 13.8, 1338.6, 588.98, 66.93, 1994.51, 1994.51, 2991.77, 6980.8, 9990],
        [21, "CBD Dope", 24, 2328, 1024.32, 66.93, 3419.25, 1994.51, 5128.87, 10542.64, 13990],
        [22, "Youthful Elixir", 24, 2328, 1024.32, 66.93, 3419.25, 1994.51, 5128.87, 10542.64, 13990],
      ],
    },
    {
      id: "retail", title: "Retail Hydrojelly Mask", pack: "2 masks / box", rows: [
        [1, "Antioxidant Goji", 11.1, 1076.7, 462.98, 21.53, 1561.22, 312.24, 1561.22, 3434.67, 4990],
        [2, "Super Greens Strength", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4990],
        [3, "Brightening Complex", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4990],
        [4, "Egyptian Rose", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4990],
        [5, "Intensive Aftercare", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4550],
        [6, "Hyaluronic Acid", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4550],
        [7, "Cica Complex", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4550],
        [8, "Illuminating Orange", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4990],
        [9, "Phyto Nutrients", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4550],
        [10, "Skin Warrior Ageless", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4550],
        [11, "Purifying Charcoal", 11.1, 1076.7, 473.75, 21.53, 1571.98, 314.4, 1571.98, 3458.36, 4990],
      ],
    },
    {
      id: "foot", title: "Foot Mask", pack: "5 pairs / pack", rows: [
        [1, "Collagen Foot Mask", 55.1, 5344.7, 2351.67, 267.24, 7963.6, null, null, null, null],
      ],
    },
  ],
  accessories: [
    ["Rolling Cryo Globes — Pink", 11500],
    ["Rolling Cryo Globes — White", 11500],
    ["Natural Sponge", 6900],
    ["Brush", 517.5],
    ["Silicone Brush", 690],
    ["Mixing Bowl — White", 1725],
    ["Mixing Bowl — Hot Pink", 1725],
    ["Mixing Bowl — Neon Green", 1725],
    ["Mixing Bowl — Gold", 1725],
    ["Spatula — White", 517.5],
    ["Spatula — Hot Pink", 517.5],
    ["Spatula — Neon Green", 517.5],
    ["Spatula — Gold", 517.5],
    ["Small Spatula — Cream", 230],
    ["Small Spatula — Pink", 230],
    ["Measuring Cup", 230],
    ["5g Scoop", 115],
    ["Rose Quartz Eye Mask — Hydrojelly Mask", 11500],
  ],
};
