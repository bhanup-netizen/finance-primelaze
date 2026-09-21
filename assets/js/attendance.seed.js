/* ============================================================
   Primelaze — Attendance & Reporting Compliance Protocol (HR)
   Three separate sections:
     • Field / Sales staff   → report from the field in BIGIN
     • Backend / Office staff → mark attendance in HRONE (office)
     • Work From Home (WFH)   → strict rules for anyone working from home
   Each row names ONE single owner (one row = one person's duty).
   Values HR still needs to set are marked "[HR to confirm …]".
   Fully editable by admins / HR; the live copy is stored in the shared
   edits doc so the whole team sees the same.
   ============================================================ */
window.ATTENDANCE_SEED = {
  note: "This protocol governs daily attendance and reporting. Field/sales staff report from the field in Bigin; backend/office staff mark attendance in HROne; and separate strict rules apply to anyone working from home (WFH). It is enforced every working day, and each row has ONE owner accountable for that check.",
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
          area: "Continued non-reporting (4th day onward, N days)",
          trigger: "After deactivation, non-reporting/attendance still continues from the 4th working day onward — for as many days as it lasts (N days) — without a valid reason or response.",
          action: "Bigin access stays deactivated; every such day is marked Absent and treated as Loss of Pay (LOP). The employee must report daily via official email to the RM until reactivation. If non-reporting continues for 7 continuous working days, it is treated as absence without intimation / abandonment of duty — a show-cause notice is issued and disciplinary action up to and including termination follows as per Company policy and law.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "f7",
          area: "Repeated non-compliance",
          trigger: "Employee receives 2 Warning Letters for repeated attendance/reporting non-compliance.",
          action: "Formal HR & Management review. Strict disciplinary action, up to and including termination of services, may be taken as applicable under Company policy and law.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "f8",
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
          area: "Office working hours & break",
          trigger: "Punch IN by [HR to confirm — in-time] and punch OUT at/after [HR to confirm — out-time] in HROne, from office. Lunch/break: [HR to confirm — break window & duration].",
          action: "Working fewer than the required hours, or taking breaks beyond the allowed window, is treated as short-time / Half-day as per Company policy.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b2",
          area: "Daily HROne punch",
          trigger: "Punch IN and OUT in HROne every working day from the office.",
          action: "A day with no punch is treated as Absent unless a valid reason is approved.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b3",
          area: "Late / missing punch",
          trigger: "Punch-in is later than the in-time (after the [HR to confirm — grace, e.g. 10 min] grace), or not done, without prior approval.",
          action: "Marked Late / Half-day as per Company policy. Repeated lateness is recorded.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b4",
          area: "Attendance Regularisation (AR)",
          trigger: "A missed or incorrect punch must be regularised by raising an AR in HROne within 2 working days, with a valid reason.",
          action: "AR not raised in time, or without a valid reason, leaves the day marked Absent. AR needs Reporting Manager (RM) approval.",
          owner: "Reporting Manager",
        },
        {
          id: "b5",
          area: "Leave application",
          trigger: "Leave must be applied in HROne in advance (except a genuine emergency, which must be informed the same day).",
          action: "Unapproved absence is treated as Loss of Pay (LOP) as per Company policy.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b6",
          area: "2 consecutive unmarked days",
          trigger: "Attendance is not marked / not regularised in HROne for 2 consecutive working days without a valid reason.",
          action: "Employee is marked Absent from the 2nd day and a Warning Letter is issued.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b7",
          area: "Repeated non-compliance",
          trigger: "Employee receives 2 Warning Letters for repeated attendance non-compliance.",
          action: "Formal HR & Management review. Strict disciplinary action, up to and including termination of services, may be taken as applicable under Company policy and law.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "b8",
          area: "Daily reporting to Management",
          trigger: "Every working day.",
          action: "Compile the HROne Attendance Compliance Status and share it with Arjun & Dhinesh — attendance, late/half-day, LOP/absence/warning cases and any significant deviations.",
          owner: "HR (Sandeepika)",
        },
      ],
    },
    {
      id: "wfh",
      title: "Work From Home (WFH) — strict rules",
      subtitle: "WFH is a privilege, not a right. [HR to confirm the WFH policy — e.g. prior RM approval each occasion, or a fixed number of days/week.] Every rule below applies on each WFH day, for backend/office staff working from home.",
      rows: [
        {
          id: "w1",
          area: "Eligibility & approval",
          trigger: "WFH is allowed only as per the Company WFH policy [HR to confirm] and must be approved in ADVANCE by the Reporting Manager. No self-declared WFH.",
          action: "WFH taken without prior written approval is treated as Absent / Loss of Pay (LOP).",
          owner: "Reporting Manager",
        },
        {
          id: "w2",
          area: "Attendance on WFH days",
          trigger: "Punch IN at the start and OUT at the end of the day in HROne (marked as WFH), at the same office in/out timings [HR to confirm].",
          action: "A WFH day with no HROne punch is treated as Absent.",
          owner: "HR (Sandeepika)",
        },
        {
          id: "w3",
          area: "Availability & response",
          trigger: "Remain reachable and online on call / official WhatsApp / work channels throughout working hours [HR to confirm core hours] and respond within [HR to confirm — e.g. 15 minutes].",
          action: "Being unreachable during working hours without a valid reason is treated as reporting non-compliance / absence for that period.",
          owner: "Reporting Manager",
        },
        {
          id: "w4",
          area: "Daily work report (EOD)",
          trigger: "Submit an End-of-Day (EOD) work report of the tasks completed to the Reporting Manager on every WFH day.",
          action: "No EOD report = the WFH day is treated as non-reporting (unpaid / Absent).",
          owner: "Reporting Manager",
        },
        {
          id: "w5",
          area: "Online check-in / stand-up",
          trigger: "Attend the daily online check-in / stand-up with camera ON at [HR to confirm — time].",
          action: "Missing the check-in without prior intimation is recorded as non-compliance.",
          owner: "Reporting Manager",
        },
        {
          id: "w6",
          area: "WFH non-compliance / withdrawal",
          trigger: "Repeated WFH non-compliance — no HROne punch, no EOD report, unreachable during hours, or missed check-ins.",
          action: "The WFH facility is withdrawn; a Warning Letter is issued; continued non-compliance follows the same disciplinary ladder, up to and including termination, as per Company policy.",
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
    { id: "g6", term: "WFH", meaning: "Work From Home." },
    { id: "g7", term: "EOD", meaning: "End of Day — the daily work report submitted on WFH days." },
    { id: "g8", term: "RM", meaning: "Reporting Manager." },
  ],
};
