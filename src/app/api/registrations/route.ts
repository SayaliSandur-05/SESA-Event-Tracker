
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePrn } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, prn, email, contact } = body;

    if (
      !eventId ||
      typeof prn !== "string" ||
      !prn.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return NextResponse.json(
        { error: "Event, College PRN, and Institutional Email are required" },
        { status: 400 }
      );
    }

    const normPrn = normalizePrn(prn);

    if (!normPrn) {
      return NextResponse.json(
        { error: "Please enter a valid College PRN" },
        { status: 400 }
      );
    }

    // 1. Check membership directly in Supabase
    const { data: membership, error: membershipError } =
      await supabaseAdmin
        .from("memberships")
        .select("*")
        .ilike("prn", normPrn)
        .maybeSingle();

    if (membershipError) {
      console.error("Membership lookup failed:", membershipError.message);
      return NextResponse.json(
        { error: "Could not verify membership. Please try again." },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "PRN not found in SESA membership records. Please contact the SESA membership desk.",
        },
        { status: 400 }
      );
    }

    if (membership.payment_status !== "paid") {
      return NextResponse.json(
        {
          error:
            "Only verified paid SESA members can register for events.",
        },
        { status: 400 }
      );
    }

    // 2. Find the event in Supabase
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      console.error("Event lookup failed:", eventError.message);
      return NextResponse.json(
        { error: "Could not load the event. Please try again." },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 }
      );
    }

    if (event.status !== "published") {
      return NextResponse.json(
        { error: `Event is currently ${String(event.status).replace("_", " ")}.` },
        { status: 400 }
      );
    }

    const now = new Date();

    if (new Date(event.registration_closes_at) < now) {
      return NextResponse.json(
        { error: "Registration for this event has closed." },
        { status: 400 }
      );
    }

    if (new Date(event.registration_opens_at) > now) {
      return NextResponse.json(
        { error: "Registration has not opened yet." },
        { status: 400 }
      );
    }

    // 3. Prevent duplicate active registrations
    const { data: existing, error: duplicateError } =
      await supabaseAdmin
        .from("event_registrations")
        .select("id")
        .eq("event_id", event.id)
        .ilike("prn", normPrn)
        .neq("registration_status", "cancelled")
        .maybeSingle();

    if (duplicateError) {
      console.error("Duplicate registration check failed:", duplicateError.message);
      return NextResponse.json(
        { error: "Could not check existing registrations." },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: `You are already registered for this event (${normPrn}).` },
        { status: 409 }
      );
    }

    // 4. Check event capacity
    if (event.capacity !== null && event.capacity !== undefined) {
      const { count, error: countError } = await supabaseAdmin
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .neq("registration_status", "cancelled");

      if (countError) {
        console.error("Capacity check failed:", countError.message);
        return NextResponse.json(
          { error: "Could not check event capacity." },
          { status: 500 }
        );
      }

      if ((count ?? 0) >= event.capacity) {
        return NextResponse.json(
          { error: "This event has reached maximum capacity." },
          { status: 400 }
        );
      }
    }

    // 5. Save the registration in Supabase
    const { data: registration, error: registrationError } =
      await supabaseAdmin
        .from("event_registrations")
        .insert({
          id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          event_id: event.id,
          membership_id: membership.id,
          prn: membership.prn,
          student_name_snapshot: membership.full_name,
          email: email.trim(),
          contact: contact
            ? String(contact).trim()
            : membership.contact || "",
          registration_type: "online",
          registered_at: now.toISOString(),
          registration_status: "confirmed",
        })
        .select("*")
        .single();

   
if (registrationError) {
  console.error("Registration insert failed:", registrationError);

  return NextResponse.json(
    {
      error: "Registration insert failed",
      details: registrationError.message,
      code: registrationError.code,
      hint: registrationError.hint,
    },
    { status: 500 }
  );
}


    return NextResponse.json({
      success: true,
      registration,
      event: {
        id: event.id,
        name: event.name,
        venue: event.venue,
        starts_at: event.starts_at,
      },
    });
  } catch (error: unknown) {
    console.error("Event registration failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
