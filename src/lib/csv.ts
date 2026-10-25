import Papa from "papaparse";
import { normalizePrn, sanitizeFormula, formatDateIST } from "./utils";
import { EventRegistration, AttendanceRecord, Membership, EventItem } from "./types";

export interface ParsedCsvMembershipRow {
  prn: string;
  full_name: string;
  email?: string;
  contact?: string;
  branch?: string;
  academic_year?: string;
  payment_status?: string;
  verification_notes?: string;
  isValid: boolean;
  error?: string;
}

export function parseMembershipCsv(csvText: string): {
  rows: ParsedCsvMembershipRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatePrns: string[];
} {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, "_"),
  });

  const rows: ParsedCsvMembershipRow[] = [];
  const seenPrns = new Set<string>();
  const duplicatePrns: string[] = [];

  for (let idx = 0; idx < result.data.length; idx++) {
    const raw = result.data[idx];
    // Find PRN from common header variations
    const rawPrn = raw.prn || raw.college_id || raw.student_id || raw.roll_no || raw.id || "";
    const prn = normalizePrn(rawPrn);

    // Find Name from common variations
    const fullName = (
      raw.full_name ||
      raw.name ||
      raw.student_name ||
      raw.attendee_name ||
      ""
    ).trim();

    const email = (raw.email || raw.email_address || raw.mail || "").trim();
    const contact = (raw.contact || raw.phone || raw.mobile || raw.contact_number || "").trim();
    const branch = (raw.branch || raw.department || "Department Of Software Engineering").trim();
    const academicYear = (raw.academic_year || raw.year || "Third Year (TY)").trim();
    const paymentStatus = (raw.payment_status || raw.status || raw.paid || "paid").trim();
    const notes = (raw.notes || raw.remarks || raw.verification_notes || "").trim();

    let isValid = true;
    let error: string | undefined;

    if (!prn) {
      isValid = false;
      error = "Missing PRN";
    } else if (!fullName) {
      isValid = false;
      error = "Missing full name";
    } else if (seenPrns.has(prn)) {
      duplicatePrns.push(prn);
      // Still included, but marked as duplicate
    } else {
      seenPrns.add(prn);
    }

    rows.push({
      prn,
      full_name: fullName,
      email,
      contact,
      branch,
      academic_year: academicYear,
      payment_status: paymentStatus,
      verification_notes: notes,
      isValid,
      error,
    });
  }

  const validRows = rows.filter((r) => r.isValid).length;
  const invalidRows = rows.length - validRows;

  return {
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicatePrns: Array.from(new Set(duplicatePrns)),
  };
}

/**
 * Generate Event Registrations CSV with Formula Injection Protection
 */
export function generateRegistrationsCsv(
  event: EventItem,
  attendees: Array<{
    registration: EventRegistration;
    membership: Membership | null;
    attendance: AttendanceRecord | null;
    status: "present" | "absent";
  }>
): string {
  const data = attendees.map((item, index) => ({
    "Sr. No": index + 1,
    "Event Name": sanitizeFormula(event.name),
    "PRN": sanitizeFormula(item.registration.prn),
    "Student Name": sanitizeFormula(item.registration.student_name_snapshot),
    "Email": sanitizeFormula(item.registration.email),
    "Contact Number": sanitizeFormula(item.registration.contact || item.membership?.contact || "N/A"),
    "Department / Branch": sanitizeFormula(item.membership?.branch || "Software Engineering"),
    "Academic Year": sanitizeFormula(item.membership?.academic_year || "N/A"),
    "Registration Type": sanitizeFormula(item.registration.registration_type.toUpperCase()),
    "Registered At (IST)": sanitizeFormula(formatDateIST(item.registration.registered_at)),
    "Attendance Status": sanitizeFormula(item.status.toUpperCase()),
    "Checked In At (IST)": sanitizeFormula(item.attendance ? formatDateIST(item.attendance.checked_in_at) : "N/A"),
    "Verified By": sanitizeFormula(item.attendance?.checked_in_by_name || "N/A"),
  }));

  return Papa.unparse(data);
}

/**
 * Generate Attendance Turnout CSV with Formula Injection Protection
 */
export function generateAttendanceCsv(
  event: EventItem,
  attendees: Array<{
    registration: EventRegistration;
    membership: Membership | null;
    attendance: AttendanceRecord | null;
    status: "present" | "absent";
  }>
): string {
  // Only present attendees
  const presentAttendees = attendees.filter((a) => a.status === "present");

  const data = presentAttendees.map((item, index) => ({
    "Check-in Sequence": index + 1,
    "Event": sanitizeFormula(event.name),
    "Venue": sanitizeFormula(event.venue),
    "PRN": sanitizeFormula(item.registration.prn),
    "Student Name": sanitizeFormula(item.registration.student_name_snapshot),
    "Email": sanitizeFormula(item.registration.email),
    "Contact": sanitizeFormula(item.registration.contact || item.membership?.contact || "N/A"),
    "Entry Method": sanitizeFormula(item.attendance?.method === "walk_in" ? "WALK-IN" : "PRE-REGISTERED"),
    "Checked In Time (IST)": sanitizeFormula(formatDateIST(item.attendance?.checked_in_at)),
    "Desk Volunteer": sanitizeFormula(item.attendance?.checked_in_by_name || "N/A"),
  }));

  return Papa.unparse(data);
}

/**
 * Generate Membership Roster CSV with Formula Injection Protection
 */
export function generateMembershipsCsv(memberships: Membership[]): string {
  const data = memberships.map((m, index) => ({
    "Sr. No": index + 1,
    "PRN": sanitizeFormula(m.prn),
    "Full Name": sanitizeFormula(m.full_name),
    "Email": sanitizeFormula(m.email || "N/A"),
    "Contact": sanitizeFormula(m.contact || "N/A"),
    "Department / Branch": sanitizeFormula(m.branch || "Software Engineering"),
    "Academic Year": sanitizeFormula(m.academic_year || "N/A"),
    "Payment Status": sanitizeFormula(m.payment_status.toUpperCase()),
    "Verified At (IST)": sanitizeFormula(m.verified_at ? formatDateIST(m.verified_at) : "UNVERIFIED"),
    "Verified By": sanitizeFormula(m.verified_by || "N/A"),
    "Verification Notes": sanitizeFormula(m.verification_notes || "N/A"),
    "Created Date": sanitizeFormula(formatDateIST(m.created_at)),
    "Last Updated": sanitizeFormula(formatDateIST(m.updated_at)),
  }));

  return Papa.unparse(data);
}
