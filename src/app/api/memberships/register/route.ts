import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePrn } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      prn,
      full_name,
      email,
      contact,
      branch,
      academic_year,
      payment_mode,
      transaction_ref,
      notes,
    } = body;

    if (
      typeof prn !== "string" ||
      typeof full_name !== "string" ||
      !prn.trim() ||
      !full_name.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "College PRN and Full Name are required for membership registration.",
        },
        { status: 400 }
      );
    }

    const normPrn = normalizePrn(prn);

    if (!normPrn || normPrn.length < 5) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid College PRN (e.g., MIT2024001).",
        },
        { status: 400 }
      );
    }

    // Check Supabase for an existing membership.
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("prn", normPrn)
      .maybeSingle();

    if (lookupError) {
      console.error("Membership lookup failed:", lookupError.message);
      return NextResponse.json(
        { error: "Unable to check membership. Please try again." },
        { status: 500 }
      );
    }

    if (existing?.payment_status === "paid") {
      return NextResponse.json(
        {
          error: `Student ${existing.full_name} (${normPrn}) is already a verified SESA member. You are eligible to register for events.`,
          alreadyRegistered: true,
          membership: existing,
        },
        { status: 409 }
      );
    }

    // Do not let a public form mark a membership as paid based only
    // on a transaction reference. Payment must be verified by staff.
    const studentEmail =
      typeof email === "string" && email.trim()
        ? email.trim()
        : `${normPrn.toLowerCase()}@mitaoe.ac.in`;

    const membershipData = {

  id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      prn: normPrn,
      full_name: full_name.trim(),
      email: studentEmail,
      contact: typeof contact === "string" ? contact.trim() : "",
      branch:
        typeof branch === "string" && branch.trim()
          ? branch.trim()
          : "Department Of Software Engineering",
      academic_year:
        typeof academic_year === "string" && academic_year.trim()
          ? academic_year.trim()
          : "Third Year (TY)",
      payment_status: "pending",
      fee_amount: 1000,
      payment_mode:
        typeof payment_mode === "string" && payment_mode.trim()
          ? payment_mode.trim()
          : "UPI QR Code",
      verification_notes: transaction_ref
        ? `Self-registered online. Payment reference submitted: ${String(
            transaction_ref
          ).trim()}. Awaiting staff verification.`
        : `Self-registered online. ${
            typeof notes === "string" && notes.trim()
              ? notes.trim()
              : "Awaiting desk verification."
          }`,
      verified_at: null,
      verified_by: null,
      updated_at: new Date().toISOString(),
    };

    let membership;

    if (existing) {
      // Update only an existing unpaid/pending membership.
      const { data, error } = await supabaseAdmin
        .from("memberships")
        .update(membershipData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Membership update failed:", error.message);
        return NextResponse.json(
          { error: "Unable to update membership. Please try again." },
          { status: 500 }
        );
      }

      membership = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("memberships")
        .insert(membershipData)
        .select()
        .single();

      if (error) {
        console.error("Membership creation failed:", error.message);
        return NextResponse.json(
          { error: "Unable to create membership. Please try again." },
          { status: 500 }
        );
      }

      membership = data;
    }

    return NextResponse.json({
      success: true,
      message: `Your membership request for PRN ${normPrn} has been received. Payment verification by SESA staff is pending.`,
      membership,
    });
  } catch (error: unknown) {
    console.error("Membership registration error:", error);
    return NextResponse.json(
      { error: "Membership registration failed. Please try again." },
      { status: 500 }
    );
  }
}