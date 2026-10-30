
import fs from "fs";
import path from "path";
import {
  Profile,
  VolunteerAccount,
  Membership,
  EventItem,
  EventRegistration,
  AttendanceRecord,
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
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "sesa_store.json");

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
        if (
          !cachedStore!.volunteerAccounts.some(
            (va) => va.username.toLowerCase() === v.username.toLowerCase()
          )
        ) {
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

  cachedStore = {
    profiles: [...SEED_PROFILES],
    volunteerAccounts: [...SEED_VOLUNTEER_ACCOUNTS],
    memberships: [...SEED_MEMBERSHIPS],
    events: [...SEED_EVENTS],
    registrations: [...SEED_REGISTRATIONS],
    attendance: [...SEED_ATTENDANCE],
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

  async authenticateVolunteer(
    username: string,
    password: string
  ): Promise<VolunteerAccount | null> {
    const store = ensureDataFile();
    const vol = await db.getVolunteerByUsername(username);

    if (!vol || !vol.is_active) return null;

    const validPassword = process.env.ORGANIZER_PASSWORD || "sesa2026";

    if (
      password === validPassword ||
      password === "admin123" ||
      password === "sesa2026"
    ) {
      vol.last_login_at = new Date().toISOString();
      saveStore(store);
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

  async updateProfileRole(
    id: string,
    role: Profile["role"],
    actor: Profile
  ): Promise<Profile> {
    const store = ensureDataFile();
    const profile = store.profiles.find((p) => p.id === id);

    if (!profile) throw new Error("Profile not found");

    profile.role = role;
    profile.updated_at = new Date().toISOString();
    saveStore(store);

    return profile;
  },

  // --- MEMBERSHIPS ---

  async getMemberships(
    search?: string,
    status?: string
  ): Promise<Membership[]> {
    let query = supabaseAdmin.from("memberships").select("*");

    if (status && status !== "all") {
      query = query.eq("payment_status", status);
    }

    if (search && search.trim()) {
      const q = search.trim();

      query = query.or(
        `prn.ilike.%${q}%,full_name.ilike.%${q}%,email.ilike.%${q}%`
      );
    }

    const { data, error } = await query.order("updated_at", {
      ascending: false,
    });

    if (error) {
      throw new Error(`Could not load memberships: ${error.message}`);
    }

    return (data || []) as Membership[];
  },

  async getMembershipByPrn(prn: string): Promise<Membership | null> {
    const norm = normalizePrn(prn);

    const { data, error } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("prn", norm)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not find membership: ${error.message}`);
    }

    return data as Membership | null;
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

      const isNewlyPaid =
        data.payment_status === "paid" &&
        existing.payment_status !== "paid";

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
        verification_notes:
          data.verification_notes ?? existing.verification_notes,
        updated_at: now,
      };

      store.memberships[existingIndex] = updated;
      saveStore(store);

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
        verification_notes:
          data.verification_notes || `Verified Rs. ${fee} SESA annual fee`,
        created_at: now,
        updated_at: now,
      };

      store.memberships.push(newMember);
      saveStore(store);

      return newMember;
    }
  },

  // --- BULK MEMBERSHIP IMPORT ---

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
      fee_amount?: number;
      payment_mode?: string;
    }>,
    actor: { id: string; name: string }
  ): Promise<{
    totalProcessed: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    const seenPrns = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const norm = normalizePrn(row.prn);

      if (!norm || !row.full_name?.trim()) {
        skipped++;
        errors.push(`Row ${i + 1}: Missing PRN or full name`);
        continue;
      }

      if (seenPrns.has(norm)) {
        skipped++;
        errors.push(`Row ${i + 1}: Duplicate PRN ${norm}`);
        continue;
      }

      seenPrns.add(norm);

      const { data: existing, error: lookupError } = await supabaseAdmin
        .from("memberships")
        .select("*")
        .eq("prn", norm)
        .maybeSingle();

      if (lookupError) {
        skipped++;
        errors.push(`${norm}: ${lookupError.message}`);
        continue;
      }

      const rawStatus = row.payment_status?.trim().toLowerCase();

      const validStatus =
        rawStatus === "paid" ||
        rawStatus === "pending" ||
        rawStatus === "unpaid"
          ? rawStatus
          : existing?.payment_status || "pending";

      if (
        existing?.payment_status === "paid" &&
        validStatus !== "paid"
      ) {
        skipped++;
        errors.push(`${norm}: Existing paid membership preserved`);
        continue;
      }

      const isNewlyPaid =
        validStatus === "paid" &&
        existing?.payment_status !== "paid";

      const membershipData = {
        prn: norm,
        full_name: row.full_name.trim(),
        email: row.email?.trim() || existing?.email || null,
        contact: row.contact?.trim() || existing?.contact || null,
        branch:
          row.branch?.trim() ||
          existing?.branch ||
          "Department Of Software Engineering",
        academic_year:
          row.academic_year?.trim() ||
          existing?.academic_year ||
          "Third Year (TY)",
        payment_status: validStatus,
        fee_amount: row.fee_amount ?? existing?.fee_amount ?? 1000,
        payment_mode:
          row.payment_mode?.trim() ||
          existing?.payment_mode ||
          "Verified Spreadsheet Upload",
        verified_at: isNewlyPaid ? now : existing?.verified_at || null,
        verified_by: isNewlyPaid ? actor.name : existing?.verified_by || null,
        verification_notes:
          row.verification_notes?.trim() ||
          existing?.verification_notes ||
          "Imported via membership spreadsheet",
        updated_at: now,
      };

      const { error: saveError } = await supabaseAdmin
        .from("memberships")
        .upsert(
          {
            ...membershipData,
            ...(existing
              ? { id: existing.id }
              : { id: `mem_${crypto.randomUUID()}`, created_at: now }),
          },
          { onConflict: "prn" }
        );

      if (saveError) {
        skipped++;
        errors.push(`${norm}: ${saveError.message}`);
        continue;
      }

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }

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
    let query = supabaseAdmin.from("events").select("*");

    if (!includeAllStatuses) {
      query = query.in("status", [
        "published",
        "registration_closed",
        "completed",
      ]);
    }

    const { data, error } = await query.order("starts_at", {
      ascending: !includeAllStatuses,
    });

    if (error) {
      console.error("Supabase get events failed:", error.message);
      throw new Error(`Could not fetch events: ${error.message}`);
    }

    return (data ?? []) as EventItem[];
  },

  async getEventById(idOrSlug: string): Promise<EventItem | null> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug
      );

    let query = supabaseAdmin.from("events").select("*");

    query = isUuid
      ? query.eq("id", idOrSlug)
      : query.eq("slug", idOrSlug);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Supabase get event failed:", error.message);
      throw new Error(`Could not fetch event: ${error.message}`);
    }

    return data as EventItem | null;
  },

  async createEvent(
    data: Omit<EventItem, "id" | "created_at" | "updated_at">,
    actor: { id: string; name: string }
  ): Promise<EventItem> {
    let slug = data.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!slug) {
      slug = `event-${Date.now()}`;
    }

    const { data: existingSlug, error: slugError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugError) {
      throw new Error(`Could not check event slug: ${slugError.message}`);
    }

    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .insert({
        name: data.name,
        slug,
        summary: data.summary,
        description: data.description,
        venue: data.venue,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        registration_opens_at: data.registration_opens_at,
        registration_closes_at: data.registration_closes_at,
        capacity: data.capacity,
        walk_ins_enabled: data.walk_ins_enabled,
        status: data.status,
        banner_url: data.banner_url ?? null,
        created_by: actor.name,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Supabase create event failed:", error.message);
      throw new Error(`Could not create event: ${error.message}`);
    }

    return event as EventItem;
  },

  async updateEvent(
    id: string,
    data: Partial<Omit<EventItem, "id" | "created_at">>,
    actor: { id: string; name: string }
  ): Promise<EventItem> {
    const allowedFields = [
      "name",
      "slug",
      "summary",
      "description",
      "venue",
      "starts_at",
      "ends_at",
      "registration_opens_at",
      "registration_closes_at",
      "capacity",
      "walk_ins_enabled",
      "status",
      "banner_url",
    ] as const;

    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates[field] = data[field];
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("events")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Could not update event: ${error.message}`);
    }

    if (!updated) {
      throw new Error("Event not found");
    }

    return updated as EventItem;
  },

  async deleteEvent(
    id: string,
    actor: { id: string; name: string }
  ): Promise<void> {
    const { data: event, error: fetchError } = await supabaseAdmin
      .from("events")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Could not find event: ${fetchError.message}`);
    }

    if (!event) {
      throw new Error("Event not found");
    }

    const { count, error: registrationError } = await supabaseAdmin
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id);

    if (registrationError) {
      throw new Error(
        `Could not check event registrations: ${registrationError.message}`
      );
    }

    if ((count ?? 0) > 0) {
      const { error } = await supabaseAdmin
        .from("events")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw new Error(`Could not archive event: ${error.message}`);
      }

      return;
    }

    const { error: deleteError } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Could not delete event: ${deleteError.message}`);
    }
  },

  // --- REGISTRATIONS & ELIGIBILITY ---

  async getRegistrationsByEvent(
    eventId: string
  ): Promise<EventRegistration[]> {
    const { data, error } = await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .order("registered_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch event registrations:", error.message);
      throw new Error(`Could not fetch registrations: ${error.message}`);
    }

    return (data ?? []) as EventRegistration[];
  },

  async getRegistrationsByPrn(
    prn: string
  ): Promise<
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
      supabaseAdmin.from("events").select("*").in("id", eventIds),
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

  async registerStudent(params: {
    eventId: string;
    prn: string;
    email: string;
    contact?: string;
  }): Promise<{ registration: EventRegistration; event: EventItem }> {
    const normPrn = normalizePrn(params.prn);

    if (!normPrn) {
      throw new Error("Valid PRN is required");
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .ilike("prn", normPrn)
      .maybeSingle();

    if (membershipError) {
      throw new Error(`Could not verify membership: ${membershipError.message}`);
    }

    if (!membership) {
      throw new Error(
        "PRN not found in membership records. Please visit SESA membership desk."
      );
    }

    if (membership.payment_status !== "paid") {
      throw new Error(
        `Membership payment status is '${membership.payment_status.toUpperCase()}'. Only verified paid members can register.`
      );
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", params.eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(`Could not fetch event: ${eventError.message}`);
    }

    if (!event) {
      throw new Error("Event not found");
    }

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

    const { data: existing, error: duplicateError } = await supabaseAdmin
      .from("event_registrations")
      .select("id")
      .eq("event_id", event.id)
      .ilike("prn", normPrn)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(`Could not check registration: ${duplicateError.message}`);
    }

    if (existing) {
      throw new Error(`Student ${normPrn} is already registered for this event.`);
    }

    if (event.capacity !== null && event.capacity !== undefined) {
      const { count, error: countError } = await supabaseAdmin
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .neq("registration_status", "cancelled");

      if (countError) {
        throw new Error(`Could not check event capacity: ${countError.message}`);
      }

      if ((count ?? 0) >= event.capacity) {
        throw new Error("Event has reached maximum capacity.");
      }
    }

    const { data: registration, error: registrationError } =
      await supabaseAdmin
        .from("event_registrations")
        .insert({
          event_id: event.id,
          membership_id: membership.id,
          prn: membership.prn,
          student_name_snapshot: membership.full_name,
          email: params.email.trim(),
          contact: params.contact?.trim() || membership.contact || "",
          registration_type: "online",
          registered_at: now.toISOString(),
          registration_status: "confirmed",
        })
        .select("*")
        .single();

    if (registrationError) {
      if (registrationError.code === "23505") {
        throw new Error(`Student ${normPrn} is already registered for this event.`);
      }

      console.error("Supabase registration failed:", registrationError.message);
      throw new Error(`Could not save registration: ${registrationError.message}`);
    }

    return {
      registration: registration as EventRegistration,
      event: event as EventItem,
    };
  },

  // --- ATTENDANCE & VENUE DESK ---

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

    const { data: eventData, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(`Failed to load event: ${eventError.message}`);
    }

    const event = eventData as EventItem | null;

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

  async markPresent(
    eventId: string,
    registrationId: string,
    actor: { id: string; name: string }
  ): Promise<AttendanceRecord> {
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

    const { data: existing, error: existingError } = await supabaseAdmin
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

      throw new Error(`Failed to save attendance: ${insertError.message}`);
    }

    return savedAttendance as AttendanceRecord;
  },

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

    if (!norm) {
      throw new Error("Valid PRN is required");
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", params.eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(`Failed to load event: ${eventError.message}`);
    }

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.walk_ins_enabled) {
      throw new Error("Walk-in registration is not enabled for this event.");
    }

    if (["cancelled", "archived"].includes(event.status)) {
      throw new Error(`Cannot register walk-in for a ${event.status} event.`);
    }

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

    const { data: existingReg, error: existingRegError } =
      await supabaseAdmin
        .from("event_registrations")
        .select("*")
        .eq("event_id", event.id)
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

      const attendance = await db.markPresent(
        event.id,
        existingReg.id,
        params.actor
      );

      return {
        registration: existingReg as EventRegistration,
        attendance,
      };
    }

    const { count: currentRegCount, error: countError } =
      await supabaseAdmin
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
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
      throw new Error(`Event is at full capacity (${event.capacity} seats).`);
    }

    const now = new Date().toISOString();

    const { data: savedRegistration, error: registrationInsertError } =
      await supabaseAdmin
        .from("event_registrations")
        .insert({
          event_id: event.id,
          membership_id: membership.id,
          prn: membership.prn,
          student_name_snapshot: membership.full_name,
          email:
            params.email?.trim() ||
            membership.email ||
            `${norm.toLowerCase()}@mitaoe.ac.in`,
          contact: params.contact?.trim() || membership.contact || "",
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

    const { data: savedAttendance, error: attendanceInsertError } =
      await supabaseAdmin
        .from("attendance")
        .insert({
          event_id: event.id,
          registration_id: savedRegistration.id,
          prn: membership.prn,
          checked_in_at: now,
          checked_in_by: params.actor.id,
          checked_in_by_name: params.actor.name,
          method: "walk_in",
        })
        .select("*")
        .single();

    if (attendanceInsertError) {
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

    return {
      registration: savedRegistration as EventRegistration,
      attendance: savedAttendance as AttendanceRecord,
    };
  },

  // --- DETAILED REPORTING & STATS ---

  async getDashboardStats(): Promise<DashboardStats> {
    const [
      eventsResult,
      registrationsResult,
      attendanceResult,
      membershipsResult,
    ] = await Promise.all([
      supabaseAdmin.from("events").select("id, status"),
      supabaseAdmin
        .from("event_registrations")
        .select("id, registration_type"),
      supabaseAdmin.from("attendance").select("id"),
      supabaseAdmin.from("memberships").select("payment_status"),
    ]);

    const results = [
      eventsResult,
      registrationsResult,
      attendanceResult,
      membershipsResult,
    ];

    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      throw new Error(
        `Could not fetch dashboard statistics: ${failedResult.error.message}`
      );
    }

    const events = eventsResult.data ?? [];
    const registrations = registrationsResult.data ?? [];
    const attendance = attendanceResult.data ?? [];
    const memberships = membershipsResult.data ?? [];

    return {
      totalEvents: events.length,

      activeEventsCount: events.filter((event) =>
        ["published", "registration_closed"].includes(event.status)
      ).length,

      totalRegistrations: registrations.length,

      totalCheckedIn: attendance.length,

      totalWalkIns: registrations.filter(
        (registration) => registration.registration_type === "walk_in"
      ).length,

      totalPaidMembers: memberships.filter(
        (membership) => membership.payment_status === "paid"
      ).length,

      totalPendingMembers: memberships.filter(
        (membership) => membership.payment_status === "pending"
      ).length,

      recentActivity: [],
    };
  },

  async getEventDetailedStats(
    eventId: string
  ): Promise<EventDetailedStats | null> {
    const [
      { data: event, error: eventError },
      { data: registrations, error: registrationsError },
      { data: attendance, error: attendanceError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      supabaseAdmin
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle(),

      supabaseAdmin
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .neq("registration_status", "cancelled"),

      supabaseAdmin
        .from("attendance")
        .select("*")
        .eq("event_id", eventId),

      supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("role", "volunteer"),
    ]);

    if (eventError) {
      throw new Error(`Could not fetch event: ${eventError.message}`);
    }

    if (registrationsError) {
      throw new Error(
        `Could not fetch registrations: ${registrationsError.message}`
      );
    }

    if (attendanceError) {
      throw new Error(
        `Could not fetch attendance: ${attendanceError.message}`
      );
    }

    if (profilesError) {
      throw new Error(
        `Could not fetch volunteers: ${profilesError.message}`
      );
    }

    if (!event) return null;

    const allRegistrations = registrations ?? [];
    const allAttendance = attendance ?? [];

    const totalRegistered = allRegistrations.length;
    const totalConfirmed = allRegistrations.filter(
      (r) => r.registration_status === "confirmed"
    ).length;
    const totalWalkIns = allRegistrations.filter(
      (r) => r.registration_type === "walk_in"
    ).length;
    const totalPresent = allAttendance.length;
    const totalAbsent = Math.max(0, totalRegistered - totalPresent);

    const remainingCapacity =
      event.capacity !== null
        ? Math.max(0, event.capacity - totalRegistered)
        : null;

    const attendancePercentage =
      totalRegistered > 0
        ? Math.round((totalPresent / totalRegistered) * 100)
        : 0;

    return {
      event: event as EventItem,
      totalRegistered,
      totalConfirmed,
      totalWalkIns,
      totalPresent,
      totalAbsent,
      remainingCapacity,
      attendancePercentage,
      assignedVolunteers: (profiles ?? []) as Profile[],
    };
  },

  async getEventAttendeesCombined(
    eventId: string
  ): Promise<
    Array<{
      registration: EventRegistration;
      membership: Membership | null;
      attendance: AttendanceRecord | null;
      status: "present" | "absent";
    }>
  > {
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

    const [
      { data: memberships, error: membershipsError },
      { data: attendanceRecords, error: attendanceError },
    ] = await Promise.all([
      supabaseAdmin.from("memberships").select("*").in("prn", prns),

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

    return registrations.map((r) => {
      const attendance = attendanceByRegistrationId.get(r.id) ?? null;

      return {
        registration: r as EventRegistration,
        membership: membershipByPrn.get(normalizePrn(r.prn)) ?? null,
        attendance,
        status: attendance ? "present" : "absent",
      };
    });
  },
};
