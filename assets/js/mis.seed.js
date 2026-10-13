/* ============================================================
   Primelaze — MIS import seed (from MIS_2026.xlsx).
   One-time bootstrap data for Finance -> MIS. The "Load MIS_2026
   data" button (admin) writes these months into the Firestore "mis"
   collection via the signed-in session, skipping any period already
   present. Bank figures converted from Rs Cr to rupees; machine sales,
   expenses and collections are in rupees as listed. The YTD sales
   summary from the sheet is intentionally omitted (it is stale and
   identical across months). After import, edit/add months in-app.
   ============================================================ */
window.MIS_IMPORT_SEED = [
  {
    "period": "May 2026 (25–31)",
    "monthKey": "2026-05",
    "machineSales": [
      {
        "drName": "Dr Sheetal Jalori",
        "machine": "Celluma Nova",
        "salesPerson": "",
        "hq": "",
        "amount": 300000.0
      },
      {
        "drName": "Dr. M.S Batar",
        "machine": "Magic Pulse co2 40 watt",
        "salesPerson": "",
        "hq": "",
        "amount": 1250000.0
      }
    ],
    "banks": [
      {
        "account": "Bank 1",
        "opening": 131350710,
        "collection": 245890267,
        "payment": 201406653,
        "balance": 175834324
      },
      {
        "account": "Bank 2",
        "opening": 526957241,
        "collection": 202197300,
        "payment": 548901267,
        "balance": 180253274
      }
    ],
    "expenses": [
      {
        "type": "Variable",
        "details": "ADVANCE PAID FOR TRAVEL",
        "amount": 85500.0
      },
      {
        "type": "Variable",
        "details": "CREDITOR (HLS HYPERTECH LASER)",
        "amount": 5489012.67
      },
      {
        "type": "Variable",
        "details": "CONFERENCE EXPENSE",
        "amount": 613080.0
      },
      {
        "type": "Variable",
        "details": "CUSTOMS DUTY",
        "amount": 570145.35
      },
      {
        "type": "Variable",
        "details": "FEES & TAXES",
        "amount": 110841.0
      },
      {
        "type": "Variable",
        "details": "INTERNAL TRANSFER",
        "amount": 300000.0
      },
      {
        "type": "Variable",
        "details": "INTERNET/TELEPHONE EXP.",
        "amount": 742.58
      },
      {
        "type": "Variable",
        "details": "LOCAL CREDITORS",
        "amount": 30669.0
      },
      {
        "type": "Variable",
        "details": "MARKETING EXPENSES",
        "amount": 75000.0
      },
      {
        "type": "Variable",
        "details": "OFFICE EXPENSES",
        "amount": 78023.6
      },
      {
        "type": "Variable",
        "details": "PROFESSIONAL CHARGES",
        "amount": 142560.0
      },
      {
        "type": "Variable",
        "details": "REPAIRS & MAINTANCE",
        "amount": 7505.0
      }
    ],
    "collections": [
      {
        "date": "30/05/2026",
        "name": "Dr Ambikia kumar",
        "tag": "Esthemax Sale",
        "amount": 7991.0
      },
      {
        "date": "",
        "name": "Dr.Namita Narkhede",
        "tag": "",
        "amount": 100000.0
      },
      {
        "date": "25/05/2026",
        "name": "Skinnova Skin Clinic",
        "tag": "Esthemax Sale",
        "amount": 19184.0
      },
      {
        "date": "",
        "name": "PRIMELAZE PRIVATE LIMITED",
        "tag": "",
        "amount": 300000.0
      },
      {
        "date": "25/05/2026",
        "name": "Luxury Derm Clinic",
        "tag": "Esthemax Sale",
        "amount": 48105.0
      },
      {
        "date": "",
        "name": "Dr Sushila Nagur",
        "tag": "",
        "amount": 300000.0
      },
      {
        "date": "26/05/2026",
        "name": "Glow Aesthetic LLP",
        "tag": "Esthemax Sale",
        "amount": 12681.0
      },
      {
        "date": "",
        "name": "Dr Prachi Bhattar",
        "tag": "",
        "amount": 210000.0
      },
      {
        "date": "27/05/2026",
        "name": "Diverge Aesthetics",
        "tag": "Esthemax Sale",
        "amount": 8991.0
      },
      {
        "date": "",
        "name": "Gupta Multispeciality Hospital",
        "tag": "",
        "amount": 8991.0
      },
      {
        "date": "27/05/2026",
        "name": "SAMYAT HEALTHCARE PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 12591.07
      },
      {
        "date": "",
        "name": "Dr Sugandh Gandhi",
        "tag": "",
        "amount": 210000.0
      },
      {
        "date": "28/05/2026",
        "name": "BODYCRAFT SALON SKIN & COSMETOLOGY PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 163170.0
      },
      {
        "date": "",
        "name": "Dr Aditi vashisht",
        "tag": "",
        "amount": 775000.0
      },
      {
        "date": "29/05/2026",
        "name": "SREYAS HOLISTIC REMEDIES PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 386650.6
      },
      {
        "date": "",
        "name": "FAB SKINOLOGY SOLUTIONS PRIVATE LIMITED",
        "tag": "",
        "amount": 17982.0
      },
      {
        "date": "30/05/2026",
        "name": "KLEARA SKIN HAIR AND LASER CLINIC",
        "tag": "Esthemax Sale",
        "amount": 8991.0
      },
      {
        "date": "",
        "name": "Dr Shivanu Mathon",
        "tag": "",
        "amount": 100000.0
      },
      {
        "date": "31/05/2026",
        "name": "ISHA DERMACARE",
        "tag": "Esthemax Sale",
        "amount": 8991.0
      },
      {
        "date": "29/05/2026",
        "name": "Dr. Anisha Rai Kumar",
        "tag": "Esthemax Sale",
        "amount": 8991.0
      },
      {
        "date": "25/05/2026",
        "name": "Dr. Simran Pal Aneja",
        "tag": "Esthemax Sale/Sales Of Consumables",
        "amount": 33741.0
      },
      {
        "date": "25/05/2026",
        "name": "SkinEva Clinic",
        "tag": "Esthemax Sale/Sales Of Consumables",
        "amount": 50000.0
      },
      {
        "date": "28/05/2026",
        "name": "Dr Sheetal Jalori",
        "tag": "New SALES OF MACHINE",
        "amount": 30000.0
      },
      {
        "date": "30/05/2026",
        "name": "Dr. M.S Batar",
        "tag": "New SALES OF MACHINE",
        "amount": 2100.0
      },
      {
        "date": "27/05/2026",
        "name": "Dr. Ashwant 's Dermacare Skin Clinic",
        "tag": "SALE OF CONSUMABLES",
        "amount": 52500.0
      },
      {
        "date": "28/05/2026",
        "name": "CUTIS SKIN CLINIC PRIVATE LIMITED",
        "tag": "SALE OF CONSUMABLES",
        "amount": 65625.0
      },
      {
        "date": "28/05/2026",
        "name": "Dr. P.S. Walia",
        "tag": "SALE OF CONSUMABLES",
        "amount": 53000.0
      },
      {
        "date": "25/05/2026",
        "name": "Dr. Haritha Bandaru",
        "tag": "SALES OF MACHINE",
        "amount": 50000.0
      },
      {
        "date": "26/05/2026",
        "name": "DR. ABHISHEK THAKUR",
        "tag": "SALES OF MACHINE",
        "amount": 50000.0
      },
      {
        "date": "26/05/2026",
        "name": "Dr. Haritha Bandaru",
        "tag": "SALES OF MACHINE",
        "amount": 50000.0
      },
      {
        "date": "27/05/2026",
        "name": "Dr. Anisha Sethi",
        "tag": "SALES OF MACHINE",
        "amount": 50000.0
      },
      {
        "date": "27/05/2026",
        "name": "Dr.Naga Sahithi",
        "tag": "SALES OF MACHINE",
        "amount": 200000.0
      },
      {
        "date": "27/05/2026",
        "name": "Dr. Bharathi Patel",
        "tag": "SALES OF MACHINE",
        "amount": 35000.0
      },
      {
        "date": "27/05/2026",
        "name": "Dr Harsimran chawla",
        "tag": "SALES OF MACHINE",
        "amount": 125000.0
      },
      {
        "date": "28/05/2026",
        "name": "Amppawings private limited",
        "tag": "SALES OF MACHINE",
        "amount": 50000.0
      },
      {
        "date": "28/05/2026",
        "name": "Dr. Mandeep Bhukar",
        "tag": "SALES OF MACHINE",
        "amount": 800000.0
      },
      {
        "date": "25/05/2026",
        "name": "UNIMED HEALTH CARE PRIVATE LIMITED",
        "tag": "",
        "amount": 75600.0
      }
    ],
    "note": "Imported from MIS_2026.xlsx (May 2026 (25–31)). Sales summary left blank (the sheet's YTD summary is stale)."
  },
  {
    "period": "July 2026 (13–19)",
    "monthKey": "2026-07",
    "machineSales": [
      {
        "drName": "Sandeep",
        "machine": "Cellina PR",
        "salesPerson": "",
        "hq": "",
        "amount": 1470000.0
      },
      {
        "drName": "Dhinesh Sir",
        "machine": "Bi-axis Q Switch",
        "salesPerson": "",
        "hq": "",
        "amount": 3600000.0
      }
    ],
    "banks": [
      {
        "account": "Bank 1",
        "opening": 145275722,
        "collection": 112636800,
        "payment": 158315757,
        "balance": 99596765
      },
      {
        "account": "Bank 2",
        "opening": 114044995,
        "collection": 293196500,
        "payment": 11800,
        "balance": 407229695
      }
    ],
    "expenses": [
      {
        "type": "Variable",
        "details": "ADVANCE PAID FOR TRAVEL",
        "amount": 55000.0
      },
      {
        "type": "Variable",
        "details": "Bank Charges",
        "amount": 118.0
      },
      {
        "type": "Variable",
        "details": "CONFERENCE EXPENSE",
        "amount": 388402.4
      },
      {
        "type": "Variable",
        "details": "CUSTOMS DUTY",
        "amount": 12504.0
      },
      {
        "type": "Variable",
        "details": "FEES & TAXES",
        "amount": 120029.0
      },
      {
        "type": "Variable",
        "details": "INTERNET/TELEPHONE EXP.",
        "amount": 1708.64
      },
      {
        "type": "Fixed",
        "details": "Investment",
        "amount": 150000.0
      },
      {
        "type": "Variable",
        "details": "MARKETING EXPENSES",
        "amount": 50000.0
      },
      {
        "type": "Variable",
        "details": "OFFICE EXPENSES",
        "amount": 210000.0
      },
      {
        "type": "Variable",
        "details": "POSTAGE & COURIER CHARGES",
        "amount": 293082.86
      },
      {
        "type": "Variable",
        "details": "Repairs & Maintance",
        "amount": 19444.0
      },
      {
        "type": "Variable",
        "details": "SOFTWARE EXPENSES",
        "amount": 97382.67
      },
      {
        "type": "Variable",
        "details": "TRAVELLING",
        "amount": 185604.0
      }
    ],
    "collections": [
      {
        "date": "13/07/2026",
        "name": "Dr. Mandeep Bhukar",
        "tag": "SALES OF MACHINE",
        "amount": 500000.0
      },
      {
        "date": "13/07/2026",
        "name": "MANISHA VINOD KUMAR",
        "tag": "Sales of Machine",
        "amount": 1000000.0
      },
      {
        "date": "13/07/2026",
        "name": "Dr. Neha Rani",
        "tag": "Sales of Consumables",
        "amount": 24998.0
      },
      {
        "date": "13/07/2026",
        "name": "Dr. Saumya Kumari",
        "tag": "Sales of Machine",
        "amount": 145000.0
      },
      {
        "date": "14/07/2026",
        "name": "Sudha Skin Hair and Aesthetics",
        "tag": "Esthemax Sale",
        "amount": 52155.0
      },
      {
        "date": "14/07/2026",
        "name": "Dr.Dhananjay & Dr.Kiran",
        "tag": "Sales Of Machine",
        "amount": 100000.0
      },
      {
        "date": "14/07/2026",
        "name": "KOSMODERMA HEALTHCARE PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 12591.0
      },
      {
        "date": "14/07/2026",
        "name": "Dr.Fathima",
        "tag": "Sales of Machine",
        "amount": 300000.0
      },
      {
        "date": "15/07/2026",
        "name": "Dr. R Kumar",
        "tag": "SALES OF MACHINE",
        "amount": 100000.0
      },
      {
        "date": "14/07/2026",
        "name": "Dr. Priyanka Reddy",
        "tag": "Sales of Machine",
        "amount": 200000.0
      },
      {
        "date": "15/07/2026",
        "name": "The Bay Aesthetics",
        "tag": "Esthemax Sales",
        "amount": 8541.0
      },
      {
        "date": "14/07/2026",
        "name": "Dr. Priyanka Reddy",
        "tag": "Sales of Machine",
        "amount": 200000.0
      },
      {
        "date": "15/07/2026",
        "name": "SHRUTHI SKIN CLINIC",
        "tag": "Esthemax Sales",
        "amount": 44505.0
      },
      {
        "date": "14/07/2026",
        "name": "Dr. Priyanka Reddy",
        "tag": "Sales of Machine",
        "amount": 200000.0
      },
      {
        "date": "15/07/2026",
        "name": "SKIN CACHE",
        "tag": "Esthemax Sales",
        "amount": 50000.0
      },
      {
        "date": "14/07/2026",
        "name": "DNA SKIN CLINIC AND WELLNESS CENTRE",
        "tag": "Sale of Consumables",
        "amount": 26250.0
      },
      {
        "date": "16/07/2026",
        "name": "Dr. Swaroopa",
        "tag": "Esthemax Sales/SALES OF MACHINE & SALE OF CONSUMABLES",
        "amount": 182230.0
      },
      {
        "date": "14/07/2026",
        "name": "DR. UJJWALA'S SKIN CLINIC",
        "tag": "Esthemax Sale",
        "amount": 91259.0
      },
      {
        "date": "17/07/2026",
        "name": "SKIN CACHE",
        "tag": "Esthemax Sales",
        "amount": 47557.0
      },
      {
        "date": "14/07/2026",
        "name": "DRHARANS MEDICARE PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 44955.0
      },
      {
        "date": "17/07/2026",
        "name": "Dr. Raj Kirit",
        "tag": "Sale of Consumables",
        "amount": 12600.0
      },
      {
        "date": "15/07/2026",
        "name": "DR.ABHIRUT THAKUR",
        "tag": "Sales of Machine",
        "amount": 50000.0
      },
      {
        "date": "17/07/2026",
        "name": "Sonal Expenses",
        "tag": "Refund Excess Amount",
        "amount": 190.0
      },
      {
        "date": "15/07/2026",
        "name": "DR.ABHIRUT THAKUR",
        "tag": "Sales of Machine",
        "amount": 50000.0
      },
      {
        "date": "17/07/2026",
        "name": "SaaRang Skin Care Hospital",
        "tag": "Sales Of Consumables",
        "amount": 10500.0
      },
      {
        "date": "16/07/2026",
        "name": "Dr. Bharathi Patel",
        "tag": "Sales of Machine",
        "amount": 37000.0
      },
      {
        "date": "17/07/2026",
        "name": "Aarshvi Skin Clinic",
        "tag": "SALE OF CONSUMABLES",
        "amount": 13125.0
      },
      {
        "date": "16/07/2026",
        "name": "Dr. Shrilata Trasi",
        "tag": "Sale of Consumables",
        "amount": 37501.0
      },
      {
        "date": "18/07/2026",
        "name": "Glow Aesthetic LLP",
        "tag": "Esthemax Sales",
        "amount": 21267.0
      },
      {
        "date": "16/07/2026",
        "name": "Helios Advanced Skin,Hair & laser Clinic (Dr.Shradha)",
        "tag": "Sales of Machine",
        "amount": 300000.0
      },
      {
        "date": "18/07/2026",
        "name": "Ms. Shivani Agrawal",
        "tag": "Esthemax Sales",
        "amount": 2000.0
      },
      {
        "date": "16/07/2026",
        "name": "Dr. Dhriti Nagrani",
        "tag": "Sales of Machine",
        "amount": 100000.0
      },
      {
        "date": "18/07/2026",
        "name": "THOL AESTHETICS AND DERMATOLOGY LLP",
        "tag": "SALE OF CONSUMABLES",
        "amount": 13125.0
      },
      {
        "date": "19/07/2026",
        "name": "Dr. Poojitha",
        "tag": "Sales of Machine",
        "amount": 50000.0
      },
      {
        "date": "19/07/2026",
        "name": "Renee Skin Hair Laser and Aesthetic Center",
        "tag": "Esthemax Sales Global Aesthetics Summit 2026",
        "amount": 7992.0
      },
      {
        "date": "19/07/2026",
        "name": "Dr.keerthana Reddy",
        "tag": "Esthemax Sales Global Aesthetics Summit 2026",
        "amount": 15000.0
      },
      {
        "date": "19/07/2026",
        "name": "kakode skin clinic",
        "tag": "Esthemax Sales Global Aesthetics Summit 2026",
        "amount": 7992.0
      }
    ],
    "note": "Imported from MIS_2026.xlsx (July 2026 (13–19)). Sales summary left blank (the sheet's YTD summary is stale)."
  },
  {
    "period": "July 2026 (20–26)",
    "monthKey": "2026-07",
    "machineSales": [],
    "banks": [
      {
        "account": "Bank 1",
        "opening": 99596765,
        "collection": 106082200,
        "payment": 123073368,
        "balance": 82605597
      },
      {
        "account": "Bank 2",
        "opening": 407229695,
        "collection": 85345000,
        "payment": 387633794,
        "balance": 104940901
      }
    ],
    "expenses": [
      {
        "type": "Variable",
        "details": "ADVANCE PAID FOR TRAVEL",
        "amount": 70000.0
      },
      {
        "type": "Variable",
        "details": "CREDITOR(HLS HYPERTECH LASER SYSTEMS GMBH)",
        "amount": 3876337.94
      },
      {
        "type": "Variable",
        "details": "CONFERENCE EXPENSE",
        "amount": 105970.0
      },
      {
        "type": "Variable",
        "details": "CUSTOM DUTY",
        "amount": 603205.0
      },
      {
        "type": "Variable",
        "details": "Employee Expenses",
        "amount": 24559.47
      },
      {
        "type": "Variable",
        "details": "FEES & TAXES",
        "amount": 33445.0
      },
      {
        "type": "Variable",
        "details": "Insurance",
        "amount": 174534.0
      },
      {
        "type": "Variable",
        "details": "INTERNET/TELEPHONE EXP.",
        "amount": 1025.48
      },
      {
        "type": "Variable",
        "details": "Local Creditors",
        "amount": 15466.73
      },
      {
        "type": "Variable",
        "details": "MARKETING EXPENSES",
        "amount": 80000.0
      },
      {
        "type": "Variable",
        "details": "OFFICE EXPENSES",
        "amount": 21759.0
      },
      {
        "type": "Fixed",
        "details": "Salary (F & F)",
        "amount": 100769.0
      }
    ],
    "collections": [
      {
        "date": "21/07/2026",
        "name": "Sparsh Skin and Dental clinic",
        "tag": "Esthemax Sale",
        "amount": 17982.0
      },
      {
        "date": "20/07/2026",
        "name": "Met Phi Healthcare LLP",
        "tag": "Sale of Consumables",
        "amount": 26250.0
      },
      {
        "date": "22/07/2026",
        "name": "Laser Skin and ENT Care",
        "tag": "Esthemax Sale",
        "amount": 8991.0
      },
      {
        "date": "21/07/2026",
        "name": "Dr.Amruta Ajit Dinkar",
        "tag": "Sale of Consumables",
        "amount": 7200.0
      },
      {
        "date": "22/07/2026",
        "name": "SKINIII POLY CLINIC PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 26523.0
      },
      {
        "date": "20/07/2026",
        "name": "LABELLE BODY CARE PVT LTD",
        "tag": "Sales of Machine",
        "amount": 300000.0
      },
      {
        "date": "23/07/2026",
        "name": "PROMED AESTHETICS",
        "tag": "Esthemax Sale",
        "amount": 8991.0
      },
      {
        "date": "20/07/2026",
        "name": "LABELLE BODY CARE PVT LTD",
        "tag": "Sales of Machine",
        "amount": 275000.0
      },
      {
        "date": "24/07/2026",
        "name": "KOSMODERMA HEALTHCARE PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 50364.0
      },
      {
        "date": "24/07/2026",
        "name": "Dr Kanika Agarwal",
        "tag": "Sales of Machine",
        "amount": 100000.0
      },
      {
        "date": "24/07/2026",
        "name": "DENDI HEALTH SCIENCE PRIVATE LIMITED",
        "tag": "Esthemax Sale",
        "amount": 8991.0
      },
      {
        "date": "25/07/2026",
        "name": "Dr. Rakesh Sahu (Dr. Ekta Sahu)",
        "tag": "Sales of Machine",
        "amount": 145000.0
      },
      {
        "date": "24/07/2026",
        "name": "Cosmoshine Orthcure Clinic",
        "tag": "Esthemax Sale",
        "amount": 16991.0
      },
      {
        "date": "24/07/2026",
        "name": "Dr. Nirmala Purohit",
        "tag": "Esthemax Sale",
        "amount": 89910.0
      },
      {
        "date": "25/07/2026",
        "name": "LUEUR AESTHETIC",
        "tag": "Esthemax Sale",
        "amount": 96660.0
      },
      {
        "date": "20/07/2026",
        "name": "DERMABLISS THE SKIN CLINIC",
        "tag": "Esthemax Sales",
        "amount": 8982.0
      },
      {
        "date": "20/07/2026",
        "name": "Dr. Sumit Jagyasi",
        "tag": "Esthemax Sales",
        "amount": 7992.0
      },
      {
        "date": "20/07/2026",
        "name": "AestheticbyDrRiddhi",
        "tag": "Esthemax Sales",
        "amount": 8991.0
      },
      {
        "date": "21/07/2026",
        "name": "Dr Gayathri Skin and sugar clinic",
        "tag": "Esthemax Sales",
        "amount": 26973.0
      },
      {
        "date": "20/07/2026",
        "name": "Skinnovation",
        "tag": "SALE OF CONSUMABLES",
        "amount": 26250.0
      },
      {
        "date": "21/07/2026",
        "name": "DR.THAJS SKIN PHARMACY",
        "tag": "SALE OF CONSUMABLES",
        "amount": 74998.0
      },
      {
        "date": "22/07/2026",
        "name": "S S HEALTHCARE",
        "tag": "SALE OF CONSUMABLES",
        "amount": 13125.0
      },
      {
        "date": "22/07/2026",
        "name": "Dermaworld Skin & Hair Clinics",
        "tag": "SALE OF CONSUMABLES",
        "amount": 13125.0
      },
      {
        "date": "22/07/2026",
        "name": "Shanti Wellness",
        "tag": "SALE OF CONSUMABLES",
        "amount": 13125.0
      },
      {
        "date": "23/07/2026",
        "name": "Indra Skin Clinic Dr Ajay Kr Rai",
        "tag": "SALE OF CONSUMABLES",
        "amount": 2500.0
      },
      {
        "date": "25/07/2026",
        "name": "LABELLE BODY CARE PRIVATE LIMITED",
        "tag": "SALE OF CONSUMABLES",
        "amount": 78750.0
      },
      {
        "date": "24/07/2026",
        "name": "B16 PHARMACY",
        "tag": "SALE OF CONSUMABLES/Esthemax Sale",
        "amount": 110608.0
      },
      {
        "date": "21/07/2026",
        "name": "Dr. Prakash Khute",
        "tag": "Sales of Machine",
        "amount": 100000.0
      },
      {
        "date": "22/07/2026",
        "name": "Dr. C. P. Thajudheen",
        "tag": "SALES OF MACHINE",
        "amount": 100000.0
      },
      {
        "date": "23/07/2026",
        "name": "Srisai Subhramaniya hospitals private limited",
        "tag": "SALES OF MACHINE",
        "amount": 100000.0
      },
      {
        "date": "25/07/2026",
        "name": "Dr.Poornima",
        "tag": "SALES OF MACHINE",
        "amount": 50000.0
      }
    ],
    "note": "Imported from MIS_2026.xlsx (July 2026 (20–26)). Sales summary left blank (the sheet's YTD summary is stale)."
  }
];
