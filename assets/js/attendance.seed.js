/* ============================================================
   Primelaze — Attendance & Bigin Reporting Compliance Protocol (HR)
   Seeded from HR's "Attendance / Bigin Compliance Protocol" sheet and
   refined: abbreviations spelled out, a clear definition of a "valid,
   acceptable reason", and an abbreviations legend added.
   Fully editable by admins / HR from the dashboard; the live copy is
   stored in the shared edits doc so the whole team sees the same.
   ============================================================ */
window.ATTENDANCE_SEED = {
  note: "This protocol governs daily field attendance and Bigin reporting for all field/sales staff. It is enforced every working day. Read it with the abbreviations and the “valid reason” note below.",
  validNote: "A “valid, acceptable reason” means one of: approved leave; a pre-informed technical/network failure (Bigin or HROne down, phone/connectivity issue reported at the earliest); or a genuine field emergency communicated to the Reporting Manager in advance or at the earliest opportunity. Whether a reason is acceptable is decided by the Reporting Manager together with HR — not by the employee alone.",
  rows: [
    {
      id: "a1",
      area: "Attendance – Clinic Location",
      trigger: "Attendance must be marked from the actual clinic/customer location. The clinic board/name must be clearly visible in the photo, OR the employee’s photo together with the clinic board/name must be visible.",
      action: "Attendance marked from a surrounding area, en route, a nearby location, parking/roadside, or where the clinic board/name is not visible is treated as INVALID and may be marked Absent.",
      monitor: "Vikas & HR verify attendance compliance daily.",
    },
    {
      id: "a2",
      area: "Daily Bigin Reporting",
      trigger: "All doctor/clinic visits, customer interactions, follow-ups, demos, meetings and relevant remarks must be updated in Bigin on the same working day.",
      action: "Non-reporting is treated as reporting non-compliance.",
      monitor: "Vikas reviews Bigin reporting daily and shares it with HR & Management.",
    },
    {
      id: "a3",
      area: "1 working day — non-reporting",
      trigger: "Bigin reporting is not updated for 1 working day without a valid, acceptable reason.",
      action: "Daily Allowance (DA) is deducted as per Company policy. The non-compliance is recorded.",
      monitor: "HR includes the case in the daily compliance reporting.",
    },
    {
      id: "a4",
      area: "2 consecutive working days",
      trigger: "Bigin reporting is not updated for 2 consecutive working days without a valid, acceptable reason.",
      action: "Employee is marked Absent from the 2nd day itself and a Warning Letter is issued.",
      monitor: "HR escalates / reports the case to Arjun & Dhinesh.",
    },
    {
      id: "a5",
      area: "3 working days — non-reporting",
      trigger: "Non-reporting continues for 3 working days without a valid reason or response.",
      action: "Bigin access is deactivated; Absent is marked for the applicable days; reactivation only with Reporting Manager (RM) approval; no HROne Attendance Regularisation (AR) during the deactivation period; daily reporting via official email to the RM until reactivation.",
      monitor: "HR formally documents and escalates the case.",
    },
    {
      id: "a6",
      area: "Repeated non-compliance",
      trigger: "Employee receives 2 Warning Letters for repeated attendance/reporting non-compliance.",
      action: "Formal HR & Management review. Strict disciplinary action, up to and including termination of services, may be taken as applicable under Company policy and law.",
      monitor: "HR maintains the records and coordinates the management review.",
    },
    {
      id: "a7",
      area: "Daily HR–Management reporting",
      trigger: "Every working day.",
      action: "HR compiles the Attendance & Bigin Reporting Compliance Status.",
      monitor: "Shared every working day with Arjun & Dhinesh — covering attendance validity, Bigin reporting, missing reporting, DA/absence/warning cases and any significant deviations.",
    },
  ],
  legendNote: "Abbreviations used above:",
  legend: [
    { id: "g1", term: "Bigin", meaning: "The CRM app where every field visit and customer interaction is logged." },
    { id: "g2", term: "HROne", meaning: "The HR / attendance system." },
    { id: "g3", term: "DA", meaning: "Daily Allowance." },
    { id: "g4", term: "AR", meaning: "Attendance Regularisation — correcting a missed or incorrect punch in HROne." },
    { id: "g5", term: "RM", meaning: "Reporting Manager." },
  ],
};
