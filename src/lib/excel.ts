import * as XLSX from "xlsx";
import { normalizePrn } from "./utils";

export interface ParsedMembershipRecord {
  prn: string;
  full_name: string;
  email?: string;
  contact?: string;
  branch?: string;
  academic_year?: string;
  payment_status: "paid" | "pending" | "unpaid";
  fee_amount?: number;
  payment_mode?: string;
  verification_notes?: string;
  isValid: boolean;
  error?: string;
}

export interface ParseResult {
  records: ParsedMembershipRecord[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatePrns: string[];
}

/**
 * Universal parser for Excel (.xlsx, .xls) and CSV
 */
export function parseMembershipSheet(bufferOrString: ArrayBuffer | Uint8Array | string): ParseResult {
  let workbook: XLSX.WorkBook;

  if (typeof bufferOrString === "string") {
    workbook = XLSX.read(bufferOrString, { type: "string" });
  } else {
    const uint8 = bufferOrString instanceof Uint8Array ? bufferOrString : new Uint8Array(bufferOrString);
    workbook = XLSX.read(uint8, { type: "array" });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { records: [], totalRows: 0, validRows: 0, invalidRows: 0, duplicatePrns: [] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  const records: ParsedMembershipRecord[] = [];
  const seenPrns = new Set<string>();
  const duplicatePrns: string[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];

    const normalizedKeys: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      const cleanKey = k.trim().toLowerCase().replace(/[\s._-]+/g, "_");
      normalizedKeys[cleanKey] = typeof v === "string" ? v.trim() : v;
    }

    const rawPrn =
      normalizedKeys["prn"] ||
      normalizedKeys["college_id"] ||
      normalizedKeys["student_id"] ||
      normalizedKeys["roll_no"] ||
      normalizedKeys["id"] ||
      "";
    const prn = normalizePrn(String(rawPrn));

    const fullName = String(
      normalizedKeys["full_name"] ||
        normalizedKeys["name"] ||
        normalizedKeys["student_name"] ||
        normalizedKeys["student"] ||
        ""
    ).trim();

    const email = String(
      normalizedKeys["email"] ||
        normalizedKeys["email_address"] ||
        normalizedKeys["mail"] ||
        ""
    ).trim();

    const contact = String(
      normalizedKeys["contact"] ||
        normalizedKeys["phone"] ||
        normalizedKeys["mobile"] ||
        normalizedKeys["contact_number"] ||
        ""
    ).trim();

    const branch = String(
      normalizedKeys["branch"] ||
        normalizedKeys["department"] ||
        "Department Of Software Engineering"
    ).trim();

    const academicYear = String(
      normalizedKeys["academic_year"] ||
        normalizedKeys["year"] ||
        normalizedKeys["class"] ||
        "Third Year (TY)"
    ).trim();

    const rawStatus = String(
      normalizedKeys["payment_status"] ||
        normalizedKeys["status"] ||
        normalizedKeys["paid"] ||
        "paid"
    ).toLowerCase();

    let paymentStatus: "paid" | "pending" | "unpaid" = "paid";
    if (rawStatus.includes("unpaid") || rawStatus === "no" || rawStatus === "pending") {
      paymentStatus = rawStatus.includes("unpaid") || rawStatus === "no" ? "unpaid" : "pending";
    }

    const rawAmount = normalizedKeys["fee_amount"] || normalizedKeys["amount"] || normalizedKeys["fee"];
    const feeAmount = rawAmount ? Number(String(rawAmount).replace(/[^0-9.]/g, "")) : 1000;

    const paymentMode = String(
      normalizedKeys["payment_mode"] ||
        normalizedKeys["mode"] ||
        normalizedKeys["method"] ||
        "Excel / CSV Bulk Import"
    ).trim();

    const verificationNotes = String(
      normalizedKeys["verification_notes"] ||
        normalizedKeys["notes"] ||
        normalizedKeys["remarks"] ||
        normalizedKeys["utr"] ||
        normalizedKeys["receipt"] ||
        "Verified ₹1,000 annual membership fee"
    ).trim();

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
    } else {
      seenPrns.add(prn);
    }

    records.push({
      prn,
      full_name: fullName,
      email: email || undefined,
      contact: contact || undefined,
      branch,
      academic_year: academicYear,
      payment_status: paymentStatus,
      fee_amount: feeAmount || 1000,
      payment_mode: paymentMode,
      verification_notes: verificationNotes,
      isValid,
      error,
    });
  }

  const validRows = records.filter((r) => r.isValid).length;
  const invalidRows = records.length - validRows;

  return {
    records,
    totalRows: records.length,
    validRows,
    invalidRows,
    duplicatePrns: Array.from(new Set(duplicatePrns)),
  };
}
