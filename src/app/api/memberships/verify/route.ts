
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePrn } from "@/lib/utils";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prn, eventId } = body;

    if (typeof prn !== "string" || !prn.trim()) {
      return NextResponse.json(
        { error: "Please enter a valid College PRN" },
        { status: 400 }
      );
    }

    const norm = normalizePrn(prn);

    // Look up the student in Supabase, not the old local JSON file.
    const { data: membership, error } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .ilike("prn", norm)
      .maybeSingle();

    if (error) {
      console.error("Supabase membership verification failed:", error.message);
      return NextResponse.json(
        { error: "Membership verification failed. Please try again." },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json({
        exists: false,
        isPaid: false,
        message: `PRN '${norm}' is not registered in the SESA membership records. Please ensure you have enrolled and completed payment with the SESA membership desk.`,
      });
    }

    if (membership.payment_status !== "paid") {
      return NextResponse.json({
        exists: true,
        isPaid: false,
        status: membership.payment_status,
        message: `Your SESA membership is currently marked as '${String(
          membership.payment_status
        ).toUpperCase()}'. Payment verification by the departmental treasurer is required prior to event registration.`,
      });
    }

    // Existing registration lookup remains local for now.
    let alreadyRegistered = false;

    if (eventId) {
      const registrations = await db.getRegistrationsByEvent(eventId);
      alreadyRegistered = registrations.some(
        (registration) =>
          normalizePrn(registration.prn) === norm &&
          registration.registration_status !== "cancelled"
      );
    }

    return NextResponse.json({
      exists: true,
      isPaid: true,
      alreadyRegistered,
      student: {
        prn: membership.prn,
        full_name: membership.full_name,
        email: membership.email || "",
        branch:
          membership.branch || "Department Of Software Engineering",
        academic_year: membership.academic_year || "Third Year (TY)",
      },
    });
  } catch (error: unknown) {
    console.error("Membership verification error:", error);

    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
