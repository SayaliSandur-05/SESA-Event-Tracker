
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const filePath = path.join(
  process.cwd(),
  ".data",
  "sesa_store.json"
);

if (!fs.existsSync(filePath)) {
  throw new Error(`Data file not found: ${filePath}`);
}

const store = JSON.parse(
  fs.readFileSync(filePath, "utf8")
);

const memberships = store.memberships ?? [];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase URL or SUPABASE_SECRET_KEY in .env.local"
  );
}

if (memberships.length === 0) {
  throw new Error("No membership records found.");
}

const normalizePrn = (value) =>
  String(value ?? "").trim().toUpperCase();

const seen = new Set();
const duplicates = [];

const rows = memberships.map((m) => {
  const prn = normalizePrn(m.prn);

  if (!prn) {
    throw new Error("A membership has a missing PRN.");
  }

  if (seen.has(prn)) duplicates.push(prn);
  seen.add(prn);

  return {
    prn,
    full_name: m.full_name,
    email: m.email || null,
    contact: m.contact || null,
    branch: m.branch || null,
    academic_year: m.academic_year || null,
    payment_status: m.payment_status,
    fee_amount: m.fee_amount,
    payment_mode: m.payment_mode || null,
    verified_at: m.verified_at || null,
    verified_by: m.verified_by || null,
    verification_notes: m.verification_notes || null,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
});

if (duplicates.length > 0) {
  throw new Error(
    `Duplicate PRNs found: ${[...new Set(duplicates)].join(", ")}`
  );
}

for (const row of rows) {
  if (!row.full_name || !row.payment_status) {
    throw new Error(
      `Missing full name or payment status for PRN ${row.prn}`
    );
  }
}

console.log("Memberships found:", rows.length);
console.log("Unique PRNs:", seen.size);
console.log(
  "Payment statuses:",
  rows.reduce((counts, row) => {
    counts[row.payment_status] =
      (counts[row.payment_status] || 0) + 1;
    return counts;
  }, {})
);

if (process.env.CONFIRM_IMPORT !== "YES") {
  console.log("\nPREVIEW ONLY — no data was written.");
  console.log("Review the output before confirming the import.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { error } = await supabase
  .from("memberships")
  .upsert(rows, { onConflict: "prn" });

if (error) {
  throw new Error(`Membership import failed: ${error.message}`);
}

const { count, error: countError } = await supabase
  .from("memberships")
  .select("prn", { count: "exact", head: true });

if (countError) {
  throw new Error(
    `Import ran, but row-count verification failed: ${countError.message}`
  );
}

console.log("\nMembership import completed.");
console.log("Supabase membership row count:", count);
console.log("Local membership record count:", rows.length);
