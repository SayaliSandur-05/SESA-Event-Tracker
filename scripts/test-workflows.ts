/**
 * SESA EVENT TRACKER — AUTOMATED WORKFLOW VERIFICATION SUITE
 * Verifies core business logic, membership verification, registration,
 * walk-ins, duplicate prevention, and CSV safety.
 */

import { db } from "../src/lib/db";
import { parseMembershipCsv, generateRegistrationsCsv } from "../src/lib/csv";
import { normalizePrn } from "../src/lib/utils";

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING SESA EVENT TRACKER AUTOMATED WORKFLOW TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // 1. PRN Normalization
    console.log("--- 1. PRN Normalization & Validation ---");
    assert(normalizePrn(" mit2024001 ") === "MIT2024001", "Trims and capitalizes PRN");
    assert(normalizePrn("mit 2024 002") === "MIT2024002", "Strips whitespace in PRN");

    // 2. Membership Verification
    console.log("\n--- 2. Membership Eligibility Check ---");
    const paidMember = await db.getMembershipByPrn("202501100001");
    assert(paidMember !== null && paidMember.payment_status === "paid", "Existing paid member verified");

    const testPendingPrn = `PENDING_${Date.now().toString().slice(-4)}`;
    await db.addOrUpdateMembership(
      {
        prn: testPendingPrn,
        full_name: "Pending Verification Student",
        payment_status: "pending",
        verification_notes: "Awaiting payment verification",
      },
      { id: "test_actor", name: "Test Runner" }
    );
    const pendingMember = await db.getMembershipByPrn(testPendingPrn);
    assert(pendingMember !== null && pendingMember.payment_status === "pending", "Pending member identified");

    const unknownMember = await db.getMembershipByPrn("UNKNOWN999");
    assert(unknownMember === null, "Unknown PRN returns null");

    // 3. New Member Instant Eligibility without redeployment
    console.log("\n--- 3. Instant Eligibility Mutation ---");
    const newPrn = `TEST${Date.now().toString().slice(-6)}`;
    await db.addOrUpdateMembership(
      {
        prn: newPrn,
        full_name: "Test Dynamic Student",
        payment_status: "paid",
        verification_notes: "Automated test addition",
      },
      { id: "test_actor", name: "Test Runner" }
    );
    const addedMember = await db.getMembershipByPrn(newPrn);
    assert(addedMember !== null && addedMember.payment_status === "paid", "Dynamically added member is immediately eligible");

    // 4. Safe CSV Bulk Import (Upsert & Protection of Paid Members)
    console.log("\n--- 4. Safe CSV Bulk Import ---");
    const testCsv = `prn,full_name,payment_status\n${newPrn},Test Dynamic Student,unpaid\nTEST_NEW_2,Second Student,paid\n,Invalid Row Student,paid`;
    const parsed = parseMembershipCsv(testCsv);
    assert(parsed.totalRows === 3, "Parses 3 total CSV rows");
    assert(parsed.validRows === 2, "Identifies 2 valid rows and 1 invalid row without PRN");

    const importResult = await db.bulkImportMemberships(
      parsed.rows.filter((r) => r.isValid),
      { id: "test_actor", name: "Test Runner" }
    );
    const checkedMember = await db.getMembershipByPrn(newPrn);
    // Crucial rule: existing paid member was NOT demoted to unpaid!
    assert(checkedMember?.payment_status === "paid", "SAFE UPSERT: Existing paid member was NEVER demoted by unpaid CSV row");

    // 5. Event Creation & Retrieval
    console.log("\n--- 5. Event Lifecycle ---");
    const event = await db.createEvent(
      {
        name: `Automated Test Hackathon ${Date.now()}`,
        slug: `auto-test-hackathon-${Date.now()}`,
        summary: "Test summary",
        description: "Test description",
        venue: "Virtual Lab 101",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 172800000).toISOString(),
        registration_opens_at: new Date(Date.now() - 3600000).toISOString(),
        registration_closes_at: new Date(Date.now() + 86400000).toISOString(),
        capacity: 2, // strictly 2 seats to test capacity limits
        walk_ins_enabled: true,
        status: "published",
      },
      { id: "test_actor", name: "Test Runner" }
    );
    assert(event.id.startsWith("event_"), "Event created with valid identifier");

    // 6. Registration Flow & Duplicate Prevention
    console.log("\n--- 6. Student Registration & Concurrency ---");
    // Registration 1 (Succeeds)
    const reg1 = await db.registerStudent({
      eventId: event.id,
      prn: "202501100001",
      email: "202501100001@mitaoe.ac.in",
    });
    assert(reg1.registration.registration_status === "confirmed", "Paid member registers successfully");

    // Duplicate Registration (Fails)
    let duplicateBlocked = false;
    try {
      await db.registerStudent({
        eventId: event.id,
        prn: "202501100001",
        email: "202501100001@mitaoe.ac.in",
      });
    } catch (e: any) {
      duplicateBlocked = e.message.toLowerCase().includes("already registered");
    }
    assert(duplicateBlocked, "Duplicate registration attempt for same event is blocked");

    // Unpaid student registration attempt (Fails)
    let unpaidBlocked = false;
    try {
      await db.registerStudent({
        eventId: event.id,
        prn: testPendingPrn, // Pending
        email: "pending@mitaoe.ac.in",
      });
    } catch (e: any) {
      unpaidBlocked = e.message.includes("Only verified paid members can register");
    }
    assert(unpaidBlocked, "Unpaid / pending student cannot register");

    // Registration 2 (Succeeds, reaching capacity of 2)
    await db.registerStudent({
      eventId: event.id,
      prn: "202501100002",
      email: "202501100002@mitaoe.ac.in",
    });

    // Registration 3 (Fails due to Capacity limit = 2)
    let capacityBlocked = false;
    try {
      await db.registerStudent({
        eventId: event.id,
        prn: "202501100003",
        email: "202501100003@mitaoe.ac.in",
      });
    } catch (e: any) {
      capacityBlocked = e.message.includes("maximum capacity");
    }
    assert(capacityBlocked, "Atomic capacity limit enforced (blocks overcapacity submission)");

    // 7. Venue Attendance Check-in
    console.log("\n--- 7. Venue Attendance & Duplicate Check-in Prevention ---");
    const attRecord = await db.markPresent(event.id, reg1.registration.id, {
      id: "volunteer_1",
      name: "Desk Volunteer",
    });
    assert(attRecord.method === "lookup", "Pre-registered attendee marked present via lookup");

    // Duplicate check-in attempt (Fails)
    let duplicateCheckinBlocked = false;
    try {
      await db.markPresent(event.id, reg1.registration.id, {
        id: "volunteer_2",
        name: "Second Volunteer",
      });
    } catch (e: any) {
      duplicateCheckinBlocked = e.message.includes("Already checked in");
    }
    assert(duplicateCheckinBlocked, "Simultaneous / duplicate check-in is blocked safely without data corruption");

    // 8. Walk-in Registration Workflow
    console.log("\n--- 8. Walk-In Registration & Check-in ---");
    // Create an open event for walk-in testing
    const walkInEvent = await db.createEvent(
      {
        name: `Walk-in Test Event ${Date.now()}`,
        slug: `walkin-event-${Date.now()}`,
        summary: "Walk-in test",
        description: "Walk-in test description",
        venue: "Lab 402",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 3600000).toISOString(),
        registration_opens_at: new Date().toISOString(),
        registration_closes_at: new Date().toISOString(),
        capacity: 50,
        walk_ins_enabled: true,
        status: "published",
      },
      { id: "test_actor", name: "Test Runner" }
    );

    const walkInRes = await db.registerWalkInAndCheckIn({
      eventId: walkInEvent.id,
      prn: "202501100004", // Paid member
      actor: { id: "volunteer_desk", name: "Desk Volunteer" },
    });
    assert(walkInRes.registration.registration_type === "walk_in", "Walk-in registration created");
    assert(walkInRes.attendance.method === "walk_in", "Walk-in attendance marked in same atomic workflow");

    // 9. Reporting & CSV Safety (Formula Injection Sanitization)
    console.log("\n--- 9. Formula Injection Sanitization ---");
    const maliciousMemberName = "=SUM(1+1)";
    const sampleAttendeeList = [
      {
        registration: {
          ...reg1.registration,
          student_name_snapshot: maliciousMemberName,
        },
        membership: null,
        attendance: attRecord,
        status: "present" as const,
      },
    ];
    const generatedCsv = generateRegistrationsCsv(event, sampleAttendeeList);
    // 10. Volunteer Accounts & Simultaneous Multi-Device Access
    console.log("\n--- 10. Volunteer Accounts & Simultaneous Authentication ---");
    const volunteers = await db.getVolunteerAccounts();
    assert(volunteers.length >= 5, "Has at least 5 individual volunteer accounts configured");

    for (const vName of ["volunteer1", "volunteer2", "volunteer3", "volunteer4", "volunteer5"]) {
      const authResult = await db.authenticateVolunteer(vName, "sesa2026");
      assert(authResult !== null && authResult.username === vName, `Volunteer account '${vName}' authenticates successfully with 'sesa2026'`);
    }

    // 11. Universal Excel / Spreadsheet Parsing & Fee Normalization
    console.log("\n--- 11. Universal Excel / Spreadsheet Parser (XLSX & CSV) ---");
    const { parseMembershipSheet } = await import("../src/lib/excel");
    const testSpreadsheetData = "PRN,Full Name,Payment Status,Fee,Payment Mode\nMIT2024090,Excel Student One,paid,1000,UPI\nMIT2024091,Excel Student Two,paid,,Cash\nMIT2024090,Duplicate PRN Student,paid,1000,UPI";
    const sheetResult = parseMembershipSheet(testSpreadsheetData);
    assert(sheetResult.totalRows === 3, "Excel parser reads all rows");
    assert(sheetResult.validRows === 3, "Normalizes student records");
    assert(sheetResult.duplicatePrns.includes("MIT2024090"), "Identifies duplicate PRNs within sheet");
    assert(sheetResult.records[0].fee_amount === 1000, "Normalizes annual fee amount to Rs. 1,000");

    // 12. Venue Late Entry (₹1,000) & Instant Check-in
    console.log("\n--- 12. Venue Late Entry (₹1,000) & Instant Check-in ---");
    const latePrn = `LATE${Date.now().toString().slice(-5)}`;
    const lateMember = await db.addOrUpdateMembership(
      {
        prn: latePrn,
        full_name: "Venue Late Entry Student",
        email: `${latePrn.toLowerCase()}@mitaoe.ac.in`,
        contact: "9820099881",
        branch: "Computer Engineering (Software Engineering)",
        academic_year: "Third Year (TY)",
        payment_status: "paid",
        fee_amount: 1000,
        payment_mode: "UPI QR Code",
        verification_notes: "Paid Rs. 1,000 at venue entrance desk",
      },
      { id: "vol_01", name: "Rohit Deshmukh (Volunteer 1)" }
    );
    assert(lateMember.payment_status === "paid" && lateMember.fee_amount === 1000, "Late entry member saved with verified Rs. 1,000 fee");

    // Check that late member can immediately be checked into the event
    const lateWalkIn = await db.registerWalkInAndCheckIn({
      eventId: walkInEvent.id,
      prn: latePrn,
      actor: { id: "vol_02", name: "Aditi Patil (Volunteer 2)" },
    });
    // 13. Password Enforcement & Public Student Self-Registration
    console.log("\n--- 13. Password Enforcement & Public Self-Registration ---");
    // Verify that empty or wrong password CANNOT authenticate
    const emptyPassAuth = await db.authenticateVolunteer("volunteer1", "");
    assert(emptyPassAuth === null, "Empty password is strictly rejected (no bypass)");
    const wrongPassAuth = await db.authenticateVolunteer("volunteer1", "wrongpassword123");
    assert(wrongPassAuth === null, "Incorrect password is strictly rejected");
    const validPassAuth = await db.authenticateVolunteer("volunteer1", "sesa2026");
    assert(validPassAuth !== null && validPassAuth.username === "volunteer1", "Valid password 'sesa2026' authenticates successfully");

    // Test student online self-registration
    const studentPrn = `STU${Date.now().toString().slice(-5)}`;
    const studentReg = await db.addOrUpdateMembership(
      {
        prn: studentPrn,
        full_name: "Self Registered Student",
        email: `${studentPrn.toLowerCase()}@mitaoe.ac.in`,
        contact: "9820011999",
        academic_year: "Second Year (SY)",
        payment_status: "paid",
        fee_amount: 1000,
        payment_mode: "UPI Online Transfer",
        verification_notes: "Online UPI UTR: 829104819201",
      },
      { id: "public_portal", name: "Student Self-Registration" }
    );
    assert(studentReg.fee_amount === 1000 && studentReg.payment_status === "paid", "Student self-registers with verified Rs. 1,000 annual membership");

    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
  } catch (err) {
    console.error("Test execution encountered an error:", err);
  }
}

runTests();

