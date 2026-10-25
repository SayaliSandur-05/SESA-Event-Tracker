
import fs from "node:fs";
import path from "node:path";

const filePath = path.join(
  process.cwd(),
  ".data",
  "sesa_store.json"
);

if (!fs.existsSync(filePath)) {
  throw new Error(`Local JSON not found: ${filePath}`);
}

const store = JSON.parse(
  fs.readFileSync(filePath, "utf8")
);

const collections = [
  "events",
  "registrations",
  "attendance",
  "profiles",
  "volunteerAccounts",
  "auditLogs",
  "memberships"
];

for (const name of collections) {
  const records = store[name] ?? [];

  console.log(`\n${name}: ${records.length} records`);

  if (records.length > 0) {
    console.log(
      "Fields:",
      Object.keys(records[0]).join(", ")
    );
  }
}

const eventIds = new Set(
  (store.events ?? []).map(item => item.id)
);

const registrationIds = new Set(
  (store.registrations ?? []).map(item => item.id)
);

const missingEventLinks = (store.registrations ?? [])
  .filter(item => !eventIds.has(item.event_id)).length;

const missingRegistrationLinks = (store.attendance ?? [])
  .filter(item => !registrationIds.has(item.registration_id))
  .length;

console.log("\nRelationship checks:");
console.log("Registrations with missing event IDs:", missingEventLinks);
console.log(
  "Attendance records with missing registration IDs:",
  missingRegistrationLinks
);

console.log("\nInspection complete. No data was changed.");
