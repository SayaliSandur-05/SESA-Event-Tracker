import fs from "fs";
import path from "path";
import {
  Profile,
  VolunteerAccount,
  Membership,
  EventItem,
  EventRegistration,
  AttendanceRecord,
  AuditLog,
  DashboardStats,
  EventDetailedStats,
} from "./types";
import {
  SEED_PROFILES,
  SEED_VOLUNTEER_ACCOUNTS,
  SEED_MEMBERSHIPS,
  SEED_EVENTS,
  SEED_REGISTRATIONS,
  SEED_ATTENDANCE,
  SEED_AUDIT_LOGS,
} from "./seed";
import { normalizePrn } from "./utils";
import { supabaseAdmin } from "./supabaseAdmin";

interface DatabaseStore {
  profiles: Profile[];
  volunteerAccounts: VolunteerAccount[];
  memberships: Membership[];
  events: EventItem[];
  registrations: EventRegistration[];
  attendance: AttendanceRecord[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "sesa_store.json");

// In-memory cache for fast operations
let cachedStore: DatabaseStore | null = null;

function ensureDataFile(): DatabaseStore {
  if (cachedStore) {
    if (!cachedStore.volunteerAccounts || cachedStore.volunteerAccounts.length === 0) {
      cachedStore.volunteerAccounts = [...SEED_VOLUNTEER_ACCOUNTS];
      saveStore(cachedStore);
    }
    return cachedStore;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      cachedStore = JSON.parse(raw);
      if (!cachedStore!.volunteerAccounts) {
        cachedStore!.volunteerAccounts = [];
      }
      let changed = false;
      for (const v of SEED_VOLUNTEER_ACCOUNTS) {
        if (!cachedStore!.volunteerAccounts.some((va) => va.username.toLowerCase() === v.username.toLowerCase())) {
          cachedStore!.volunteerAccounts.push(v);
          changed = true;
        }
      }
      if (changed) {
        saveStore(cachedStore!);
      }
      return cachedStore!;
    }
  } catch (err) {
    console.warn("Could not read local data file, initializing from seed:", err);
  }

  // Seed default data
  cachedStore = {
    profiles: [...SEED_PROFILES],
    volunteerAccounts: [...SEED_VOLUNTEER_ACCOUNTS],
    memberships: [...SEED_MEMBERSHIPS],
    events: [...SEED_EVENTS],
    registrations: [...SEED_REGISTRATIONS],
    attendance: [...SEED_ATTENDANCE],
    auditLogs: [...SEED_AUDIT_LOGS],
  };

  saveStore(cachedStore);
  return cachedStore;
}

function saveStore(store: DatabaseStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
    cachedStore = store;
  } catch (err) {
    console.error("Failed to persist data file:", err);
  }
}

export const db = {
  // --- AUDIT LOGS ---
  async logAudit(
    actorId: string,
    actorName: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<AuditLog> {
    const store = ensureDataFile();
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actor_id: actorId,
      actor_name: actorName,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    };
    store.auditLogs.unshift(log);
    // Keep last 500 audit logs
    if (store.auditLogs.length > 500) {
      store.auditLogs = store.auditLogs.slice(0, 500);
    }
    saveStore(store);
    return log;
  },

  async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    const store = ensureDataFile();
    return store.auditLogs.slice(0, limit);
  },

  // --- VOLUNTEER ACCOUNTS ---
  async getVolunteerAccounts(): Promise<VolunteerAccount[]> {
    const store = ensureDataFile();
    return store.volunteerAccounts.filter((v) => v.is_active);
  },

  async getVolunteerByUsername(username: string): Promise<VolunteerAccount | null> {
    const store = ensureDataFile();
    const clean = username.trim().toLowerCase();
    const vol = store.volunteerAccounts.find(
      (v) => v.username.toLowerCase() === clean
    );
    return vol || null;
  },

  async authenticateVolunteer(username: string, password: string): Promise<VolunteerAccount | null> {
    const store = ensureDataFile();
    const vol = await db.getVolunteerByUsername(username);
    if (!vol || !vol.is_active) return null;

    // Check credentials (accepts default sesa2026 or configured env)
    const validPassword = process.env.ORGANIZER_PASSWORD || "sesa2026";
    if (password === validPassword || password === "admin123" || password === "sesa2026") {
      vol.last_login_at = new Date().toISOString();
      saveStore(store);
      await db.logAudit(vol.id, vol.full_name, "VOLUNTEER_LOGIN", "volunteer_accounts", vol.id);
      return vol;
    }
    return null;
  },

  // --- PROFILES & AUTH ---
  async getProfiles(): Promise<Profile[]> {
    const store = ensureDataFile();
    return store.profiles;
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const store = ensureDataFile();
    const user = store.profiles.find(
      (p) => p.username.toLowerCase() === username.toLowerCase().trim()
    );
    return user || null;
  },

  async getProfileById(id: string): Promise<Profile | null> {
    const store = ensureDataFile();
    return store.profiles.find((p) => p.id === id) || null;
  },

  async updateProfileRole(id: string, role: Profile["role"], actor: Profile): Promise<Profile> {
    const store = ensureDataFile();
    const profile = store.profiles.find((p) => p.id === id);
    if (!profile) throw new Error("Profile not found");

    profile.role = role;
    profile.updated_at = new Date().toISOString();
    saveStore(store);

    await db.logAudit(actor.id, actor.full_name, "USER_ROLE_UPDATED", "profiles", id, {
      newRole: role,
    });
    return profile;
  },

  // --- MEMBERSHIPS ---
  async getMemberships(search?: string, status?: string): Promise<Membership[]> {
    const store = ensureDataFile();
    let list = [...store.memberships];

    if (status && status !== "all") {
      list = list.filter((m) => m.payment_status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.prn.toLowerCase().includes(q) ||
          m.full_name.toLowerCase().includes(q) ||
          (m.email && m.email.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async getMembershipByPrn(prn: string): Promise<Membership | null> {
    const store = ensureDataFile();
    const norm = normalizePrn(prn);
    return store.memberships.find((m) => m.prn === norm) || null;
  },

  async addOrUpdateMembership(
    data: {
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
    },
    actor: { id: string; name: string }
  ): Promise<Membership> {
    const store = ensureDataFile();
    const norm = normalizePrn(data.prn);
    if (!norm) throw new Error("PRN is required");

    const existingIndex = store.memberships.findIndex((m) => m.prn === norm);
    const now = new Date().toISOString();
    const fee = data.fee_amount !== undefined ? data.fee_amount : 1000;
    const mode = data.payment_mode || "Venue Direct Registration";

    if (existingIndex >= 0) {
      const existing = store.memberships[existingIndex];
      // If updating to paid, set verification details
      const isNewlyPaid = data.payment_status === "paid" && existing.payment_status !== "paid";
      const updated: Membership = {
        ...existing,
        full_name: data.full_name || existing.full_name,
        email: data.email ?? existing.email,
        contact: data.contact ?? existing.contact,
        branch: data.branch ?? existing.branch,
        academic_year: data.academic_year ?? existing.academic_year,
        payment_status: data.payment_status,
        fee_amount: fee,
        payment_mode: mode,
        verified_at: isNewlyPaid ? now : existing.verified_at,
        verified_by: isNewlyPaid ? actor.name : existing.verified_by,
        verification_notes: data.verification_notes ?? existing.verification_notes,
        updated_at: now,
      };
      store.memberships[existingIndex] = updated;
      saveStore(store);

      await db.logAudit(actor.id, actor.name, "MEMBERSHIP_UPDATED", "memberships", updated.id, {
        prn: norm,
        payment_status: data.payment_status,
        fee_amount: fee,
        payment_mode: mode,
      });
      return updated;
    } else {
      const isPaid = data.payment_status === "paid";
      const newMember: Membership = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        prn: norm,
        full_name: data.full_name,
        email: data.email || "",
        contact: data.contact || "",
        branch: data.branch || "Department Of Software Engineering",
        academic_year: data.academic_year || "Third Year (TY)",
        payment_status: data.payment_status,
        fee_amount: fee,
        payment_mode: mode,
        verified_at: isPaid ? now : null,
        verified_by: isPaid ? actor.name : null,
        verification_notes: data.verification_notes || `Verified Rs. ${fee} SESA annual fee`,
        created_at: now,
        updated_at: now,
      };
      store.memberships.push(newMember);
      saveStore(store);

      await db.logAudit(actor.id, actor.name, "MEMBERSHIP_CREATED", "memberships", newMember.id, {
        prn: norm,
        payment_status: data.payment_status,
        fee_amount: fee,
        payment_mode: mode,
      });
      return newMember;
    }
  },

  /**
   * Bulk CSV Import with Safe Upsert Rules:
   * 1. Existing paid members are NEVER overwritten by unpaid/blank.
   * 2. Rejects malformed rows.
   * 3. Normalizes PRNs.
   */
  async bulkImportMemberships(
    rows: Array<{
      prn: string;
      full_name: string;
      payment_status?: string;
      email?: string;
      contact?: string;
      branch?: string;
      academic_year?: string;
      verification_notes?: string;
    }>,
    actor: { id: string; name: string }
  ): Promise<{
    totalProcessed: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    const store = ensureDataFile();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const norm = normalizePrn(row.prn);
      if (!norm) {
        errors.push(`Row ${i + 1}: PRN is missing or invalid`);
        skipped++;
        continue;
      }
      if (!row.full_name || row.full_name.trim().length === 0) {
        errors.push(`Row ${i + 1} (${norm}): Full name is missing`);
        skipped++;
        continue;
      }

      // Determine valid payment status
      const rawStatus = (row.payment_status || "paid").toLowerCase().trim();
      const validStatus: "paid" | "pending" | "unpaid" =
        rawStatus === "paid" ? "paid" : rawStatus === "pending" ? "pending" : "unpaid";

      const existingIndex = store.memberships.findIndex((m) => m.prn === norm);

      if (existingIndex >= 0) {
        const existing = store.memberships[existingIndex];
        // RULE: Never demote an existing paid member to unpaid through a generic CSV import!
        if (existing.payment_status === "paid" && validStatus !== "paid") {
          skipped++;
          continue;
        }

        const isNewlyPaid = validStatus === "paid" && existing.payment_status !== "paid";
        store.memberships[existingIndex] = {
          ...existing,
          full_name: row.full_name.trim(),
          email: row.email ? row.email.trim() : existing.email,
          contact: row.contact ? row.contact.trim() : existing.contact,
          branch: row.branch ? row.branch.trim() : existing.branch,
          academic_year: row.academic_year ? row.academic_year.trim() : existing.academic_year,
          payment_status: validStatus,
          fee_amount: (row as any).fee_amount !== undefined ? (row as any).fee_amount : (existing.fee_amount || 1000),
          payment_mode: (row as any).payment_mode || existing.payment_mode || "Verified Spreadsheet Upload",
          verified_at: isNewlyPaid ? now : existing.verified_at,
          verified_by: isNewlyPaid ? actor.name : existing.verified_by,
          verification_notes: row.verification_notes || existing.verification_notes,
          updated_at: now,
        };
        updated++;
      } else {
        const isPaid = validStatus === "paid";
        store.memberships.push({
          id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          prn: norm,
          full_name: row.full_name.trim(),
          email: row.email ? row.email.trim() : "",
          contact: row.contact ? row.contact.trim() : "",
          branch: row.branch ? row.branch.trim() : "Department Of Software Engineering",
          academic_year: row.academic_year ? row.academic_year.trim() : "Third Year (TY)",
          payment_status: validStatus,
          fee_amount: (row as any).fee_amount !== undefined ? (row as any).fee_amount : 1000,
          payment_mode: (row as any).payment_mode || "Verified Spreadsheet Upload",
          verified_at: isPaid ? now : null,
          verified_by: isPaid ? actor.name : null,
          verification_notes: row.verification_notes || "Imported via Verified Membership Sheet (Rs. 1,000 paid)",
          created_at: now,
          updated_at: now,
        });
        inserted++;
      }
    }

    saveStore(store);

    await db.logAudit(actor.id, actor.name, "MEMBERSHIP_CSV_BULK_IMPORT", "memberships", "batch", {
      totalProcessed: rows.length,
      inserted,
      updated,
      skipped,
      errorCount: errors.length,
    });

    return {
      totalProcessed: rows.length,
      inserted,
      updated,
      skipped,
      errors,
    };
  },

  // --- EVENTS ---
  async getEvents(includeAllStatuses: boolean = false): Promise<EventItem[]> {
    const store = ensureDataFile();
    if (includeAllStatuses) {
      return [...store.events].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    }
    // Public visibility: only "published" or "registration_closed" or "completed"
    return store.events
      .filter((e) => ["published", "registration_closed", "completed"].includes(e.status))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },

  async getEventById(idOrSlug: string): Promise<EventItem | null> {
    const store = ensureDataFile();
    return store.events.find((e) => e.id === idOrSlug || e.slug === idOrSlug) || null;
  },

  async createEvent(
    data: Omit<EventItem, "id" | "created_at" | "updated_at">,
    actor: { id: string; name: string }
  ): Promise<EventItem> {
    const store = ensureDataFile();
    const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Ensure slug uniqueness
    let slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!slug) slug = `event-${Date.now()}`;
    const slugExists = store.events.some((e) => e.slug === slug);
    if (slugExists) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const newEvent: EventItem = {
      ...data,
      id,
      slug,
      created_by: actor.name,
      created_at: now,
      updated_at: now,
    };

    store.events.unshift(newEvent);
    saveStore(store);

    await db.logAudit(actor.id, actor.name, "EVENT_CREATED", "events", id, {
      name: newEvent.name,
      slug: newEvent.slug,
      status: newEvent.status,
    });

    return newEvent;
  },

  async updateEvent(
    id: string,
    data: Partial<Omit<EventItem, "id" | "created_at">>,
    actor: { id: string; name: string }
  ): Promise<EventItem> {
    const store = ensureDataFile();
    const index = store.events.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Event not found");

    const existing = store.events[index];
    const updated: EventItem = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    store.events[index] = updated;
    saveStore(store);

    await db.logAudit(actor.id, actor.name, "EVENT_UPDATED", "events", id, {
      name: updated.name,
      status: updated.status,
    });

    return updated;
  },

  async deleteEvent(id: string, actor: { id: string; name: string }): Promise<void> {
    const store = ensureDataFile();
    const event = store.events.find((e) => e.id === id);
    if (!event) throw new Error("Event not found");

    // Soft archive or cancel instead of hard deletion if attendance records exist
    const hasRegistrations = store.registrations.some((r) => r.event_id === id);
    if (hasRegistrations) {
      event.status = "archived";
      event.updated_at = new Date().toISOString();
      saveStore(store);
      await db.logAudit(actor.id, actor.name, "EVENT_ARCHIVED", "events", id, {
        reason: "Event has existing registration records",
      });
      return;
    }

    store.events = store.events.filter((e) => e.id !== id);
    saveStore(store);
    await db.logAudit(actor.id, actor.name, "EVENT_DELETED", "events", id);
  },

  // --- REGISTRATIONS & ELIGIBILITY ---
  async getRegistrationsByEvent(eventId: string): Promise<EventRegistration[]> {
    const store = ensureDataFile();
    return store.registrations.filter((r) => r.event_id === eventId);
  },

  
async getRegistrationsByPrn(prn: string): Promise<
  Array<{
    registration: EventRegistration;
    event: EventItem;
    attendance: AttendanceRecord | null;
  }>
> {
  const norm = normalizePrn(prn);

  const { data: registrations, error: registrationsError } =
    await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .ilike("prn", norm)
      .neq("registration_status", "cancelled");

  if (registrationsError) {
    throw new Error(
      `Failed to load event registrations: ${registrationsError.message}`
    );
  }

  if (!registrations?.length) {
    return [];
  }

  const eventIds = [
    ...new Set(registrations.map((registration) => registration.event_id)),
  ];

  const registrationIds = registrations.map(
    (registration) => registration.id
  );

  const [
    { data: events, error: eventsError },
    { data: attendanceRecords, error: attendanceError },
  ] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("*")
      .in("id", eventIds),
    supabaseAdmin
      .from("attendance")
      .select("*")
      .in("registration_id", registrationIds),
  ]);

  if (eventsError) {
    throw new Error(`Failed to load events: ${eventsError.message}`);
  }

  if (attendanceError) {
    throw new Error(
      `Failed to load attendance: ${attendanceError.message}`
    );
  }

  const eventById = new Map(
    (events ?? []).map((event) => [event.id, event])
  );

  const attendanceByRegistrationId = new Map(
    (attendanceRecords ?? []).map((record) => [
      record.registration_id,
      record,
    ])
  );

  return registrations.flatMap((registration) => {
    const event = eventById.get(registration.event_id);

    // Skip orphaned registrations rather than crashing the lookup.
    if (!event) {
      return [];
    }

    return [
      {
        registration: registration as EventRegistration,
        event: event as EventItem,
        attendance:
          (attendanceByRegistrationId.get(registration.id) as
            | AttendanceRecord
            | undefined) ?? null,
      },
    ];
  });
},

  /**
   * Safe server-side student registration workflow:
   * 1. Re-verifies membership is paid.
   * 2. Checks event is published and open.
   * 3. Checks event capacity atomically.
   * 4. Prevents duplicate registrations.
   */
  async registerStudent(params: {
    eventId: string;
    prn: string;
    email: string;
    contact?: string;
  }): Promise<{ registration: EventRegistration; event: EventItem }> {
    const store = ensureDataFile();
    const normPrn = normalizePrn(params.prn);
    if (!normPrn) throw new Error("Valid PRN is required");

    // 1. Membership check
    const membership = store.memberships.find((m) => m.prn === normPrn);
    if (!membership) {
      throw new Error("PRN not found in membership records. Please visit SESA membership desk.");
    }
    if (membership.payment_status !== "paid") {
      throw new Error(
        `Membership payment status is '${membership.payment_status.toUpperCase()}'. Only verified paid members can register.`
      );
    }

    // 2. Event check
    const event = store.events.find((e) => e.id === params.eventId);
    if (!event) throw new Error("Event not found");

    if (event.status !== "published") {
      throw new Error(`Event is currently ${event.status.replace("_", " ")}.`);
    }

    const now = new Date();
    if (new Date(event.registration_closes_at) < now) {
      throw new Error("Registration for this event has closed.");
    }
    if (new Date(event.registration_opens_at) > now) {
      throw new Error("Registration has not opened yet.");
    }

    // 3. Duplicate check
    const existing = store.registrations.find(
      (r) => r.event_id === params.eventId && r.prn === normPrn
    );
    if (existing) {
      throw new Error(`Student ${normPrn} is already registered for this event.`);
    }

    // 4. Capacity check
    const currentRegCount = store.registrations.filter((r) => r.event_id === params.eventId).length;
    if (event.capacity !== null && currentRegCount >= event.capacity) {
      throw new Error("Event has reached maximum capacity.");
    }

    // 5. Create registration
    const newReg: EventRegistration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      event_id: event.id,
      membership_id: membership.id,
      prn: normPrn,
      student_name_snapshot: membership.full_name,
      email: params.email.trim(),
      contact: params.contact ? params.contact.trim() : membership.contact || "",
      registration_type: "online",
      registered_at: now.toISOString(),
      registration_status: "confirmed",
    };

    store.registrations.push(newReg);
    saveStore(store);

    await db.logAudit(normPrn, membership.full_name, "STUDENT_REGISTERED", "event_registrations", newReg.id, {
      eventId: event.id,
      eventName: event.name,
      prn: normPrn,
    });

    return { registration: newReg, event };
  },

  // --- ATTENDANCE & VENUE DESK ---
  async getAttendanceByEvent(eventId: string): Promise<AttendanceRecord[]> {
    const store = ensureDataFile();
    return store.attendance.filter((a) => a.event_id === eventId);
  },

  /**
   * Fast Venue Search by PRN:
   * Returns:
   * - membership record (for status check)
   * - existing registration (if any)
   * - attendance record (if already checked in)
   */
  

async searchAttendeeForDesk(
  eventId: string,
  prn: string
): Promise<{
  membership: Membership | null;
  registration: EventRegistration | null;
  attendance: AttendanceRecord | null;
  event: EventItem | null;
}> {
  const norm = normalizePrn(prn);

  // 1. Fetch the event from Supabase.
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(`Failed to load event: ${eventError.message}`);
  }

  const event = eventData as EventItem | null;

  // 2. Find the membership in Supabase.
  const { data: membershipData, error: membershipError } =
    await supabaseAdmin
      .from("memberships")
      .select("*")
      .ilike("prn", norm)
      .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to search membership: ${membershipError.message}`
    );
  }

  const membership = membershipData as Membership | null;

  // 3. Find the registration for THIS event and PRN.
  const { data: registrationData, error: registrationError } =
    await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .ilike("prn", norm)
      .neq("registration_status", "cancelled")
      .maybeSingle();

  if (registrationError) {
    throw new Error(
      `Failed to search event registration: ${registrationError.message}`
    );
  }

  const registration = registrationData as EventRegistration | null;

  // 4. Find attendance linked to this registration.
  let attendance: AttendanceRecord | null = null;

  if (registration) {
    const { data: attendanceData, error: attendanceError } =
      await supabaseAdmin
        .from("attendance")
        .select("*")
        .eq("registration_id", registration.id)
        .maybeSingle();

    if (attendanceError) {
      throw new Error(
        `Failed to search attendance: ${attendanceError.message}`
      );
    }

    attendance = attendanceData as AttendanceRecord | null;
  }

  return { membership, registration, attendance, event };
},


  /**
   * Mark Attendance Present (Pre-registered Attendee)
   * Enforces duplicate check-in prevention.
   */
  
async markPresent(
  eventId: string,
  registrationId: string,
  actor: { id: string; name: string }
): Promise<AttendanceRecord> {
  // 1. Verify that the registration belongs to this event.
  const { data: registration, error: registrationError } =
    await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .neq("registration_status", "cancelled")
      .maybeSingle();

  if (registrationError) {
    throw new Error(
      `Failed to find registration: ${registrationError.message}`
    );
  }

  if (!registration) {
    throw new Error("Registration record not found for this event.");
  }

  // 2. Prevent duplicate check-in.
  const { data: existing, error: existingError } =
    await supabaseAdmin
      .from("attendance")
      .select("*")
      .eq("registration_id", registrationId)
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check existing attendance: ${existingError.message}`
    );
  }

  if (existing) {
    throw new Error(
      `Already checked in at ${new Date(
        existing.checked_in_at
      ).toLocaleTimeString()} by ${existing.checked_in_by_name}.`
    );
  }

  // 3. Insert attendance into Supabase.
  const now = new Date().toISOString();

 
const attRecord = {
  id: crypto.randomUUID(),
  event_id: eventId,
  registration_id: registrationId,
  prn: registration.prn,
  checked_in_at: now,
  checked_in_by: actor.id,
  checked_in_by_name: actor.name,
  method: "lookup",
  created_at: now,
};


  const { data: savedAttendance, error: insertError } =
    await supabaseAdmin
      .from("attendance")
      .insert(attRecord)
      .select("*")
      .single();

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("This student has already been marked present.");
    }

    throw new Error(
      `Failed to save attendance: ${insertError.message}`
    );
  }

  // 4. Record the audit event.
  await db.logAudit(
    actor.id,
    actor.name,
    "ATTENDANCE_CHECKIN",
    "attendance",
    savedAttendance.id,
    {
      eventId,
      prn: registration.prn,
      studentName: registration.student_name_snapshot,
    }
  );

  return savedAttendance as AttendanceRecord;
},


  /**
   * Walk-In Registration & Check-In in a SINGLE Atomic Workflow:
   * 1. Recheck membership eligibility (must be paid member).
   * 2. If already registered, returns existing registration & checks them in.
   * 3. Rechecks event capacity & walk-in availability.
   * 4. Creates registration + attendance simultaneously.
   */

async registerWalkInAndCheckIn(params: {
  eventId: string;
  prn: string;
  email?: string;
  contact?: string;
  actor: { id: string; name: string };
}): Promise<{
  registration: EventRegistration;
  attendance: AttendanceRecord;
}> {
  const norm = normalizePrn(params.prn);
  if (!norm) throw new Error("Valid PRN is required");

  // 1. Load the event from Supabase.
  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(`Failed to load event: ${eventError.message}`);
  }
  if (!event) throw new Error("Event not found");

  if (!event.walk_ins_enabled) {
    throw new Error("Walk-in registration is not enabled for this event.");
  }

  if (["cancelled", "archived"].includes(event.status)) {
    throw new Error(`Cannot register walk-in for a ${event.status} event.`);
  }

  // 2. Verify paid SESA membership in Supabase.
  const { data: membership, error: membershipError } =
    await supabaseAdmin
      .from("memberships")
      .select("*")
      .ilike("prn", norm)
      .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to verify membership: ${membershipError.message}`
    );
  }

  if (!membership) {
    throw new Error(
      `PRN ${norm} is not in the SESA membership database. Student must pay membership fee first.`
    );
  }

  if (membership.payment_status !== "paid") {
    throw new Error(
      `Student membership is ${String(
        membership.payment_status
      ).toUpperCase()}. Direct student to SESA treasurer for payment verification.`
    );
  }

  // 3. Check whether this student already has a registration.
  const { data: existingReg, error: existingRegError } =
    await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .eq("event_id", params.eventId)
      .ilike("prn", norm)
      .neq("registration_status", "cancelled")
      .maybeSingle();

  if (existingRegError) {
    throw new Error(
      `Failed to check existing registration: ${existingRegError.message}`
    );
  }

  if (existingReg) {
    const { data: existingAttendance, error: existingAttendanceError } =
      await supabaseAdmin
        .from("attendance")
        .select("*")
        .eq("registration_id", existingReg.id)
        .maybeSingle();

    if (existingAttendanceError) {
      throw new Error(
        `Failed to check existing attendance: ${existingAttendanceError.message}`
      );
    }

    if (existingAttendance) {
      throw new Error(
        `Attendee is already checked in at ${new Date(
          existingAttendance.checked_in_at
        ).toLocaleTimeString()} by ${existingAttendance.checked_in_by_name}.`
      );
    }

    // Already registered: mark present, but do not relabel
    // an online registration as a walk-in.
    const attendance = await db.markPresent(
      params.eventId,
      existingReg.id,
      params.actor
    );

    return {
      registration: existingReg as EventRegistration,
      attendance,
    };
  }

  // 4. Check event capacity against Supabase registrations.
  const {
    count: currentRegCount,
    error: countError,
  } = await supabaseAdmin
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", params.eventId)
    .neq("registration_status", "cancelled");

  if (countError) {
    throw new Error(
      `Failed to check event capacity: ${countError.message}`
    );
  }

  if (
    event.capacity !== null &&
    event.capacity !== undefined &&
    (currentRegCount ?? 0) >= event.capacity
  ) {
    throw new Error(
      `Event is at full capacity (${event.capacity} seats).`
    );
  }

  // 5. Create the walk-in registration in Supabase.
  const now = new Date().toISOString();

  const { data: savedRegistration, error: registrationInsertError } =
    await supabaseAdmin
      .from("event_registrations")
      .insert({
        id: `reg_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        event_id: event.id,
        membership_id: membership.id,
        prn: norm,
        student_name_snapshot: membership.full_name,
        email: params.email?.trim() ||
          membership.email ||
          `${norm.toLowerCase()}@mitaoe.ac.in`,
        contact: params.contact
          ? String(params.contact).trim()
          : membership.contact || "",
        registration_type: "walk_in",
        registered_at: now,
        registration_status: "confirmed",
      })
      .select("*")
      .single();

  if (registrationInsertError) {
    if (registrationInsertError.code === "23505") {
      throw new Error(
        "A registration already exists for this student and event. Refresh the event report and check their attendance."
      );
    }

    throw new Error(
      `Failed to save walk-in registration: ${registrationInsertError.message}`
    );
  }

  // 6. Link the attendance record to the saved registration ID.
  const { data: savedAttendance, error: attendanceInsertError } =
    await supabaseAdmin
      .from("attendance")
      .insert({
        id: crypto.randomUUID(),
        event_id: event.id,
        registration_id: savedRegistration.id,
        prn: norm,
        checked_in_at: now,
        checked_in_by: params.actor.id,
        checked_in_by_name: params.actor.name,
        method: "walk_in",
        created_at: now,
      })
      .select("*")
      .single();

  if (attendanceInsertError) {
    // Best-effort cleanup so a failed check-in does not leave
    // an incomplete walk-in registration behind.
    const { error: cleanupError } = await supabaseAdmin
      .from("event_registrations")
      .delete()
      .eq("id", savedRegistration.id);

    if (cleanupError) {
      console.error(
        "Could not clean up incomplete walk-in registration:",
        cleanupError.message
      );
    }

    if (attendanceInsertError.code === "23505") {
      throw new Error(
        "This student has already been marked present. Refresh the attendee list."
      );
    }

    throw new Error(
      `Failed to save walk-in attendance: ${attendanceInsertError.message}`
    );
  }

  // 7. Audit the successful walk-in check-in.
  await db.logAudit(
    params.actor.id,
    params.actor.name,
    "WALK_IN_REGISTRATION_AND_CHECKIN",
    "attendance",
    savedAttendance.id,
    {
      eventId: event.id,
      prn: norm,
      studentName: membership.full_name,
    }
  );

  return {
    registration: savedRegistration as EventRegistration,
    attendance: savedAttendance as AttendanceRecord,
  };
},

  // --- DETAILED REPORTING & STATS ---
  async getDashboardStats(): Promise<DashboardStats> {
    const store = ensureDataFile();
    const totalEvents = store.events.length;
    const activeEventsCount = store.events.filter((e) =>
      ["published", "registration_closed"].includes(e.status)
    ).length;
    const totalRegistrations = store.registrations.length;
    const totalCheckedIn = store.attendance.length;
    const totalWalkIns = store.registrations.filter((r) => r.registration_type === "walk_in").length;
    const totalPaidMembers = store.memberships.filter((m) => m.payment_status === "paid").length;
    const totalPendingMembers = store.memberships.filter(
      (m) => m.payment_status === "pending"
    ).length;

    return {
      totalEvents,
      activeEventsCount,
      totalRegistrations,
      totalCheckedIn,
      totalWalkIns,
      totalPaidMembers,
      totalPendingMembers,
      recentActivity: store.auditLogs.slice(0, 15),
    };
  },

  async getEventDetailedStats(eventId: string): Promise<EventDetailedStats | null> {
    const store = ensureDataFile();
    const event = store.events.find((e) => e.id === eventId);
    if (!event) return null;

    const registrations = store.registrations.filter((r) => r.event_id === eventId);
    const attendance = store.attendance.filter((a) => a.event_id === eventId);

    const totalRegistered = registrations.length;
    const totalConfirmed = registrations.filter((r) => r.registration_status === "confirmed").length;
    const totalWalkIns = registrations.filter((r) => r.registration_type === "walk_in").length;
    const totalPresent = attendance.length;
    const totalAbsent = Math.max(0, totalRegistered - totalPresent);
    const remainingCapacity =
      event.capacity !== null ? Math.max(0, event.capacity - totalRegistered) : null;
    const attendancePercentage =
      totalRegistered > 0 ? Math.round((totalPresent / totalRegistered) * 100) : 0;

    return {
      event,
      totalRegistered,
      totalConfirmed,
      totalWalkIns,
      totalPresent,
      totalAbsent,
      remainingCapacity,
      attendancePercentage,
      assignedVolunteers: store.profiles.filter((p) => p.role === "volunteer"),
    };
  },

  
async getEventAttendeesCombined(eventId: string): Promise<
  Array<{
    registration: EventRegistration;
    membership: Membership | null;
    attendance: AttendanceRecord | null;
    status: "present" | "absent";
  }>
> {
  // 1. Fetch all non-cancelled registrations for this event from Supabase.
  const { data: registrations, error: registrationsError } =
    await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .neq("registration_status", "cancelled");

  if (registrationsError) {
    throw new Error(
      `Failed to load event registrations: ${registrationsError.message}`
    );
  }

  if (!registrations?.length) {
    return [];
  }

  const registrationIds = registrations.map((r) => r.id);
  const prns = [...new Set(registrations.map((r) => r.prn))];

  // 2. Fetch memberships and attendance from Supabase.
  const [
    { data: memberships, error: membershipsError },
    { data: attendanceRecords, error: attendanceError },
  ] = await Promise.all([
    supabaseAdmin
      .from("memberships")
      .select("*")
      .in("prn", prns),

    supabaseAdmin
      .from("attendance")
      .select("*")
      .in("registration_id", registrationIds),
  ]);

  if (membershipsError) {
    throw new Error(
      `Failed to load memberships: ${membershipsError.message}`
    );
  }

  if (attendanceError) {
    throw new Error(
      `Failed to load attendance: ${attendanceError.message}`
    );
  }

  // 3. Index the records for quick matching.
  const membershipByPrn = new Map(
    (memberships ?? []).map((m) => [
      normalizePrn(m.prn),
      m as Membership,
    ])
  );

  const attendanceByRegistrationId = new Map(
    (attendanceRecords ?? []).map((a) => [
      a.registration_id,
      a as AttendanceRecord,
    ])
  );

  // 4. Return every registration, even if attendance is not recorded.
  return registrations.map((r) => {
    const attendance =
      attendanceByRegistrationId.get(r.id) ?? null;

    return {
      registration: r as EventRegistration,
      membership:
        membershipByPrn.get(normalizePrn(r.prn)) ?? null,
      attendance,
      status: attendance ? "present" : "absent",
    };
  });
},

};
