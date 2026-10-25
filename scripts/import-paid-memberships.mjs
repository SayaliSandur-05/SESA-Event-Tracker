
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd());

const csvPath = path.join(
  process.cwd(),
  "scripts",
  "sesa_paid_students_87.csv"
);
const jsonPath = path.join(
  process.cwd(),
  ".data",
  "sesa_store.json"
);

if (!fs.existsSync(csvPath)) {
  throw new Error(`CSV not found: ${csvPath}`);
}
if (!fs.existsSync(jsonPath)) {
  throw new Error(`Local JSON not found: ${jsonPath}`);
}

function parseCSVLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' && quoted && line[i + 1] === '"') {
      value += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += ch;
    }
  }

  values.push(value.trim());
  return values;
}

const lines = fs.readFileSync(csvPath, "utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter(line => line.trim());

const headers = parseCSVLine(lines.shift()).map(h =>
  h.trim().toLowerCase()
);

const csvStudents = lines.map(line => {
  const values = parseCSVLine(line);
  return Object.fromEntries(
    headers.map((header, i) => [header, values[i] ?? ""])
  );
});

const normalizePRN = value =>
  String(value ?? "").trim().toUpperCase();

const localStore = JSON.parse(
  fs.readFileSync(jsonPath, "utf8")
);

const localByPRN = new Map(
  (localStore.memberships ?? []).map(m => [
    normalizePRN(m.prn),
    m
  ])
);

const seen = new Set();

const rows = csvStudents.map((student, index) => {
  const prn = normalizePRN(student.prn);
  const full_name = String(student.full_name ?? "").trim();

  if (!prn || !full_name) {
    throw new Error(`Missing PRN/name on CSV row ${index + 2}`);
  }

  if (seen.has(prn)) {
    throw new Error(`Duplicate PRN in CSV: ${prn}`);
  }
  seen.add(prn);

  const existing = localByPRN.get(prn);

  return {
    id: existing?.id ?? `mem_${prn}`,
    prn,
    full_name,
    email: existing?.email || null,
    contact: existing?.contact || null,
    branch: existing?.branch || null,
    academic_year:
      student.academic_year || existing?.academic_year || null,
    payment_status: "paid",
    fee_amount: existing?.fee_amount ?? 1000,
    payment_mode: existing?.payment_mode || null,
    verified_at: existing?.verified_at || null,
    verified_by: existing?.verified_by || null,
    verification_notes:
      "Matched against the supplied 87-student SESA paid-fee list.",
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
});

if (rows.length !== 87) {
  throw new Error(
    `Expected 87 CSV records, found ${rows.length}. Import stopped.`
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase environment variables in .env.local"
  );
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { error } = await supabase
  .from("memberships")
  .upsert(rows, { onConflict: "prn" });

if (error) {
  throw new Error(`Import failed: ${error.message}`);
}

const { count, error: verifyError } = await supabase
  .from("memberships")
  .select("prn", { count: "exact", head: true })
  .in("prn", rows.map(row => row.prn));

if (verifyError) {
  throw new Error(`Verification failed: ${verifyError.message}`);
}

console.log("Paid-student migration completed.");
console.log("CSV records imported:", rows.length);
console.log("Matching records verified in Supabase:", count);
