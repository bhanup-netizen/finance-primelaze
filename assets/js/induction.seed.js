/* ============================================================
   Primelaze — New-Joinee Induction / Onboarding plan (HR)
   Seeded from HR's "Induction – SPOC list", reorganised into the
   standard onboarding phases (Pre-boarding → Day 1 → Week 1 →
   First month → Probation) and enriched with onboarding best
   practices (the SHRM "4 C's": Compliance, Clarification,
   Culture, Connection — a buddy, a single owner, 30-60-90 goals
   and scheduled check-ins).
   Fully editable by admins / HR from the dashboard; the live copy
   is stored in the shared edits doc so the whole team sees the same.
   ============================================================ */
window.INDUCTION_SEED = {
  note: "Our standard onboarding runs across five phases and is built on the SHRM “4 C’s” — Compliance (paperwork, policies), Clarification (role, KPIs), Culture (values, code of conduct) and Connection (team, buddy, manager). One owner drives each new hire’s first 90 days. Tick each item as it is completed.",
  phases: [
    {
      id: "pre", title: "Phase 1 · Before joining (Pre-boarding)",
      subtitle: "Finish paperwork, accounts and the welcome kit before Day 1 so Day 1 is about people, not forms.",
      items: [
        { id: "i1", activity: "Offer Letter released & accepted", resp: "HR", spoc: "Sandeepika", when: "Before joining", remark: "", done: false },
        { id: "i2", activity: "Employee documents collected (ID, address, education, PAN, bank, photos)", resp: "HR", spoc: "Sandeepika", when: "Before joining", remark: "", done: false },
        { id: "i3", activity: "Official email ID created", resp: "HR", spoc: "Sandeepika", when: "Before joining", remark: "", done: false },
        { id: "i4", activity: "Welcome email + Day-1 agenda & joining instructions sent to new hire", resp: "HR", spoc: "Sandeepika", when: "Before joining", remark: "Best practice — sets expectations, reduces Day-1 nerves.", done: false },
        { id: "i5", activity: "Team announcement (who is joining, role, start date)", resp: "HR / Reporting Manager", spoc: "Sandeepika / RM", when: "Before joining", remark: "", done: false },
        { id: "i6", activity: "Assign a Buddy / mentor for the first month", resp: "Reporting Manager", spoc: "Respective RM", when: "Before joining", remark: "Best practice — a go-to person speeds settling in.", done: false },
        { id: "i7", activity: "Workspace / seat ready & desk set up", resp: "Admin", spoc: "Ayush", when: "Before joining", remark: "", done: false },
        { id: "i8", activity: "Mobile & SIM card arranged", resp: "Admin", spoc: "Ayush", when: "7–10 days prior", remark: "Raise request at least 7 days ahead.", done: false },
        { id: "i9", activity: "Laptop (subject to approval)", resp: "Admin", spoc: "Ayush", when: "7–10 days prior", remark: "", done: false },
        { id: "i10", activity: "Google Workspace access (email ID)", resp: "Admin", spoc: "Ayush", when: "7–10 days prior", remark: "", done: false },
        { id: "i11", activity: "ID card, visiting cards, diary & pen, carry backpack", resp: "Admin", spoc: "Ayush", when: "7–10 days prior", remark: "", done: false },
        { id: "i12", activity: "Brochures (25 copies of each available set)", resp: "Admin", spoc: "Ayush", when: "7–10 days prior", remark: "For field/sales roles.", done: false },
        { id: "i13", activity: "Demo material for Esthemax — Sample bag (15 samples 27gm), demo kit bag, bowls/spatula/cups/brush/sponge/bottles (2 each)", resp: "Admin", spoc: "Ayush", when: "7–10 days prior", remark: "For demo/sales roles.", done: false },
        { id: "i14", activity: "Add to company WhatsApp group", resp: "Admin", spoc: "Ayush", when: "On/Before Day 1", remark: "", done: false },
      ],
    },
    {
      id: "day1", title: "Phase 2 · Day 1 — Welcome & orientation",
      subtitle: "Make them feel welcome, set up access, and give clarity on role, team and rules.",
      items: [
        { id: "i15", activity: "Warm welcome, office tour, facilities & safety walk-through", resp: "HR / Admin", spoc: "Sandeepika / Ayush", when: "Day 1", remark: "", done: false },
        { id: "i16", activity: "Employee Code generated", resp: "HR", spoc: "Sandeepika", when: "Day 1", remark: "", done: false },
        { id: "i17", activity: "HROne profile created", resp: "HR", spoc: "Sandeepika", when: "Day 1", remark: "", done: false },
        { id: "i18", activity: "Attendance process explained", resp: "HR", spoc: "Sandeepika", when: "Day 1", remark: "", done: false },
        { id: "i19", activity: "Leave policy explained", resp: "HR", spoc: "Sandeepika", when: "Day 1", remark: "", done: false },
        { id: "i20", activity: "Company policies walk-through", resp: "HR", spoc: "Sandeepika", when: "Day 1", remark: "", done: false },
        { id: "i21", activity: "Code of Conduct explained & acknowledged", resp: "HR", spoc: "Sandeepika", when: "Day 1", remark: "", done: false },
        { id: "i22", activity: "Reporting structure explained", resp: "HR", spoc: "Sandeepika", when: "Day 1", remark: "", done: false },
        { id: "i23", activity: "Manager 1:1 welcome meeting", resp: "Reporting Manager", spoc: "Respective RM", when: "Day 1", remark: "Best practice — manager owns the first 90 days.", done: false },
        { id: "i24", activity: "Role & Responsibilities explained", resp: "Reporting Manager", spoc: "Respective RM", when: "Day 1", remark: "", done: false },
        { id: "i25", activity: "KPIs / Targets shared", resp: "HR / Reporting Manager", spoc: "Sandeepika / RM", when: "Day 1", remark: "", done: false },
        { id: "i26", activity: "Team introduction", resp: "HR / Reporting Manager", spoc: "Sandeepika / RM", when: "Day 1", remark: "", done: false },
        { id: "i27", activity: "Sales Support induction", resp: "Project Manager — Primelaze", spoc: "Vikas", when: "Day 1", remark: "", done: false },
        { id: "i28", activity: "Finance induction + Zoho Expense access creation & training", resp: "Finance Manager", spoc: "Sonal", when: "Day 1", remark: "", done: false },
        { id: "i29", activity: "Admin induction", resp: "Admin Manager", spoc: "Ayush", when: "Day 1", remark: "", done: false },
        { id: "i30", activity: "Marketing induction", resp: "Marketing Manager / Asst.", spoc: "Akshay Dahiya", when: "Day 1", remark: "", done: false },
        { id: "i31", activity: "Bigin credentials created", resp: "Admin", spoc: "Ayush", when: "Day 1", remark: "", done: false },
        { id: "i32", activity: "Unified Dashboard credentials created (Casovil)", resp: "IT", spoc: "Bhanu", when: "Day 1", remark: "", done: false },
      ],
    },
    {
      id: "week1", title: "Phase 3 · Week 1 — Training & immersion",
      subtitle: "Product, business and systems training, plus shadowing and early goals.",
      items: [
        { id: "i33", activity: "Product / Business introduction — Primelaze (1 week training)", resp: "Department", spoc: "Naresh", when: "Day 2 – Day 8", remark: "1 week training", done: false },
        { id: "i34", activity: "Product / Business introduction — Casovil (1 week training)", resp: "Department", spoc: "Lubdha", when: "Day 2 – Day 8", remark: "1 week training", done: false },
        { id: "i35", activity: "Bigin training — Sales", resp: "Project Manager — Primelaze", spoc: "Vikas", when: "Day 2 – Day 5", remark: "4 days training", done: false },
        { id: "i36", activity: "Unified Dashboard training (Casovil)", resp: "Project Manager — Casovil", spoc: "Sparsha", when: "Day 2 – Day 5", remark: "4 days training", done: false },
        { id: "i37", activity: "Zoho Projects — backend", resp: "Relevant team", spoc: "", when: "Day 2 – Day 5", remark: "4 days training", done: false },
        { id: "i38", activity: "Shadow a senior / first field visit or demo", resp: "Reporting Manager", spoc: "Respective RM", when: "Week 1", remark: "Best practice — learn by doing.", done: false },
        { id: "i39", activity: "Agree 30-60-90 day goals with manager", resp: "Reporting Manager", spoc: "Respective RM", when: "End of Week 1", remark: "Best practice — clear early milestones.", done: false },
      ],
    },
    {
      id: "month1", title: "Phase 4 · First month — Settle in & review",
      subtitle: "Check the new hire is settling, performing and supported.",
      items: [
        { id: "i40", activity: "First-week review", resp: "HR", spoc: "Sandeepika", when: "After training", remark: "", done: false },
        { id: "i41", activity: "30-day manager check-in (progress vs 30-day goals)", resp: "Reporting Manager", spoc: "Respective RM", when: "Day 30", remark: "", done: false },
        { id: "i42", activity: "First-month review", resp: "HR", spoc: "Sandeepika", when: "End of Month 1", remark: "", done: false },
        { id: "i43", activity: "New-hire onboarding feedback survey (how was the experience?)", resp: "HR", spoc: "Sandeepika", when: "End of Month 1", remark: "Best practice — improve the process each time.", done: false },
      ],
    },
    {
      id: "prob", title: "Phase 5 · Probation & confirmation",
      subtitle: "Ramp to full productivity and confirm the hire.",
      items: [
        { id: "i44", activity: "60-day & 90-day check-ins vs 30-60-90 plan", resp: "Reporting Manager", spoc: "Respective RM", when: "Day 60 & Day 90", remark: "", done: false },
        { id: "i45", activity: "Appointment / confirmation letter", resp: "HR", spoc: "Sandeepika", when: "On confirmation", remark: "", done: false },
        { id: "i46", activity: "Probation / confirmation review", resp: "HR / RM / Director", spoc: "Sandeepika / RM / Director", when: "After 6 months", remark: "", done: false },
      ],
    },
  ],
};
