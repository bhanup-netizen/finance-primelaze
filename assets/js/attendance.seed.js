/* ============================================================
   Primelaze — Attendance & Reporting Compliance Protocol (HR)
   Two separate sections:
     • Field / Sales staff  → report from the field in BIGIN
     • Backend / Office staff → mark attendance in HRONE
   Each row names ONE single owner (one row = one person's duty).
   Refined from HR's uploaded protocol: abbreviations spelled out and
   a clear definition of a "valid, acceptable reason" added.
   Fully editable by admins / HR; the live copy is stored in the shared
   edits doc so the whole team sees the same.
   ============================================================ */
window.ATTENDANCE_SEED = {
  note: "This protocol governs daily attendance and reporting. Field/sales staff report from the field in Bigin; backend/office staff mark attendance in HROne. It is enforced every working day. Each row has ONE owner accountable for that check.",
  validNote: "A “valid, acceptable reason” means one of: approved leave; a pre-informed technical/network failure (Bigin or HROne down, phone/connectivity issue reported at the earliest); or a genuine emergency communicated to the Reporting Manager in advance or at the earliest opportunity. Whether a reason is acceptable is decided by the Reporting Manager together with HR — not by the employee alone.",
  sections: [
    {
      id: "field",
      title: "Field / Sales staff — reporting in BIGIN",
      subtitle: "Applies to all field/sales staff. Attendance is marked from the actual clinic/customer location and every visit is reported in Bigin the same working day.",
      rows: [
        {
          id: "f1",
          area: "Attendance – clinic location",
          trigger: "Attendance must be marked from the actual clinic/customer location. The clinic board/name must be clearly visible in the photo, OR the employee’s photo together with the clinic board/name must be visible.",
          action: "Attendance marked from a surrounding area, en route, a nearby location, parking/roadside, or where the clinic board/name is not visible is treated as INVALID and may be marked Absent.",
          owner: "Vikas",
        },
        {
          id: "f2",
          area: "Daily Bigin reporting",
          trigger: "All doctor/clinic visits, customer interactions, follow-ups, demos, meetings and relevant remarks must be updated in Bigin on the same working day.",
          action: "Non-reporting is treated as reporting non-compliance.",
          owner: "Vikas",
        },
        {
          id: "f3",
          area: "1 working day — non-reporting",
          trigger: "Bigin reporting is not updated for 1 working day without a valid, acceptable reason.",
          action: "Daily Allowance (DA) is deducted as per Company policy. The non-compliance is recorded.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "f4",
          area: "2 consecutive working days",
          trigger: "Bigin reporting is not updated for 2 consecutive working days without a valid, acceptable reason.",
          action: "Employee is marked Absent from the 2nd day itself and a Warning Letter is issued.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "f5",
          area: "3 working days — non-reporting",
          trigger: "Non-reporting continues for 3 working days without a valid reason or response.",
          action: "Bigin access is deactivated; Absent is marked for the applicable days; reactivation only with Reporting Manager (RM) approval; no HROne Attendance Regularisation (AR) during the deactivation period; daily reporting via official email to the RM until reactivation.",
          owner: "Reporting Manager",
        },
        {
          id: "f6",
          area: "Repeated non-compliance",
          trigger: "Employee receives 2 Warning Letters for repeated attendance/reporting non-compliance.",
          action: "Formal HR & Management review. Strict disciplinary action, up to and including termination of services, may be taken as applicable under Company policy and law.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "f7",
          area: "Daily reporting to Management",
          trigger: "Every working day.",
          action: "Compile the Field Attendance & Bigin Reporting Compliance Status and share it with Arjun & Dhinesh — attendance validity, Bigin reporting, missing reporting, DA/absence/warning cases and any significant deviations.",
          owner: "HR (Sandeepika)",
        },
      ],
    },
    {
      id: "backend",
      title: "Backend / Office staff — attendance in HRONE",
      subtitle: "Applies to all office/backend staff. Attendance is punched in HROne from office; leaves and corrections go through HROne.",
      rows: [
        {
          id: "b1",
          area: "Office attendance – HROne punch",
          trigger: "Punch IN and OUT in HROne every working day from the office within working hours.",
          action: "A day with no punch is treated as Absent unless a valid reason is approved.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b2",
          area: "Late / missing punch",
          trigger: "Punch-in is not done, or is late, without prior approval.",
          action: "Marked Late / Half-day as per Company policy. Repeated lateness is recorded.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b3",
          area: "Attendance Regularisation (AR)",
          trigger: "A missed or incorrect punch must be regularised by raising an AR in HROne within 2 working days, with a valid reason.",
          action: "AR not raised in time, or without a valid reason, leaves the day marked Absent. AR needs Reporting Manager (RM) approval.",
          owner: "Reporting Manager",
        },
        {
          id: "b4",
          area: "Leave application",
          trigger: "Leave must be applied in HROne in advance (except a genuine emergency, which must be informed the same day).",
          action: "Unapproved absence is treated as Loss of Pay (LOP) as per Company policy.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b5",
          area: "2 consecutive unmarked days",
          trigger: "Attendance is not marked / not regularised in HROne for 2 consecutive working days without a valid reason.",
          action: "Employee is marked Absent from the 2nd day and a Warning Letter is issued.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b6",
          area: "Repeated non-compliance",
          trigger: "Employee receives 2 Warning Letters for repeated attendance non-compliance.",
          action: "Formal HR & Management review. Strict disciplinary action, up to and including termination of services, may be taken as applicable under Company policy and law.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b7",
          area: "Daily reporting to Management",
          trigger: "Every working day.",
          action: "Compile the HROne Attendance Compliance Status and share it with Arjun & Dhinesh — attendance, late/half-day, LOP/absence/warning cases and any significant deviations.",
          owner: "HR (Sandeepika)",
        },
      ],
    },
  ],
  legendNote: "Abbreviations used above:",
  legend: [
    { id: "g1", term: "Bigin", meaning: "The CRM app where field staff log every visit and customer interaction." },
    { id: "g2", term: "HROne", meaning: "The HR / attendance system where office staff punch in and out." },
    { id: "g3", term: "DA", meaning: "Daily Allowance." },
    { id: "g4", term: "LOP", meaning: "Loss of Pay." },
    { id: "g5", term: "AR", meaning: "Attendance Regularisation — correcting a missed or incorrect punch in HROne." },
    { id: "g6", term: "RM", meaning: "Reporting Manager." },
  ],
};
