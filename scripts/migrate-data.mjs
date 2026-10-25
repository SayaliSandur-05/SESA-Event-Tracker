
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd());

const storePath = path.join(
  process.cwd(),
  ".data",
  "sesa_store.json"
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in your environment."
  );
}

if (!fs.existsSync(storePath)) {
  throw new Error(`Local data file not found: ${storePath}`);
}

const store = JSON.parse(fs.readFileSync(storePath, "utf8"));

if (!store || typeof store !== "object") {
  throw new Error("The local JSON file does not contain a valid data object.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Only migrate these three collections.
// Old test registrations, attendance, memberships, and audit logs
// are deliberately excluded.
const migrations = [
  {
    source: "events",
    table: "events",
  },
  {
    source: "profiles",
    table: "profiles",
  },
  {
    source: "volunteerAccounts",
    table: "volunteer_accounts",
  },
];

async function migrateCollection(source, table) {
  const rows = store[source];

  if (!Array.isArray(rows)) {
    throw new Error(
      `Expected "${source}" to be an array in sesa_store.json.`
    );
  }

  if (rows.length === 0) {
    console.log(`SKIPPED ${table}: no local records found.`);
    return;
  }

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(
        `Invalid record at ${source}[${index}].`
      );
    }

    if (row.id === undefined || row.id === null || row.id === "") {
      throw new Error(
        `Record ${index + 1} in "${source}" has no ID.`
      );
    }
  }

  // Prevent duplicate IDs within a single imported collection.
  const ids = rows.map((row) => String(row.id));

  if (new Set(ids).size !== ids.length) {
    throw new Error(
      `Duplicate IDs found in local collection "${source}".`
    );
  }

  console.log(
    `Importing ${rows.length} records into ${table}...`
  );

  const { error } = await supabase
    .from(table)
    .upsert(rows, {
      onConflict: "id",
    });

  if (error) {
    console.error(`FAILED: ${table}`);
    console.error(error.message);
    throw new Error(`Migration stopped at table "${table}".`);
  }

  console.log(`SUCCESS: ${rows.length} records imported into ${table}.`);
}

async function main() {
  console.log("Starting SESA data migration...");
  console.log("Existing Supabase memberships will NOT be modified.");
  console.log("Old test registrations and attendance will NOT be imported.");
  console.log("");

  for (const migration of migrations) {
    await migrateCollection(
      migration.source,
      migration.table
    );
  }

  console.log("");
  console.log("Migration completed successfully.");
  console.log("Imported: events, profiles, volunteer_accounts.");
  console.log("Untouched: memberships, event_registrations, attendance, audit_logs, event_staff.");
}

main().catch((error) => {
  console.error("");
  console.error("MIGRATION STOPPED:");
  console.error(error.message);
  process.exitCode = 1;
});
