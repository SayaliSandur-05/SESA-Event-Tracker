
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (
      !user ||
      !["super_admin", "organizer", "volunteer"].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden: Authorized volunteer or staff role required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const status = searchParams.get("status") || "";

    // Read membership records from Supabase instead of the local JSON file.
    const { data, error } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Supabase membership fetch failed:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch memberships from the database" },
        { status: 500 }
      );
    }

    let memberships = data ?? [];

    // Apply the status filter.
    if (status && status !== "all") {
      memberships = memberships.filter(
        (membership) => membership.payment_status === status
      );
    }

    // Apply the search filter.
    if (search) {
      memberships = memberships.filter((membership) =>
        [
          membership.prn,
          membership.full_name,
          membership.email,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(search)
        )
      );
    }

    return NextResponse.json({ memberships });
  } catch (error: unknown) {
    console.error("Membership API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch memberships" },
      { status: 500 }
    );
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (
      !user ||
      !["super_admin", "organizer", "volunteer"].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden: Authorized volunteer or staff role required" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      prn,
      full_name,
      email,
      contact,
      branch,
      academic_year,
      payment_status,
      fee_amount,
      payment_mode,
      verification_notes,
    } = body;

    if (!prn || !full_name) {
      return NextResponse.json(
        { error: "PRN and Full Name are required" },
        { status: 400 }
      );
    }

    const normPrn = String(prn).trim();
    const now = new Date().toISOString();

    // Find the existing membership in Supabase by PRN.
    const { data: existing, error: findError } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("prn", normPrn)
      .maybeSingle();

    if (findError) {
      console.error("Membership lookup failed:", findError.message);
      return NextResponse.json(
        { error: "Failed to find membership" },
        { status: 500 }
      );
    }

    const nextStatus = payment_status || "paid";
    const isPaid = nextStatus === "paid";

    const membershipData = {
      prn: normPrn,
      full_name: String(full_name).trim(),
      email: email ?? existing?.email ?? `${normPrn}@mitaoe.ac.in`,
      contact: contact ?? existing?.contact ?? "",
      branch: branch ?? existing?.branch ?? "Department Of Software Engineering",
      academic_year:
        academic_year ?? existing?.academic_year ?? "Second Year (SY)",
      payment_status: nextStatus,
      fee_amount:
        fee_amount !== undefined
          ? Number(fee_amount)
          : (existing?.fee_amount ?? 1000),
      payment_mode:
        payment_mode ?? existing?.payment_mode ?? "Desk Verified",
      verification_notes:
        verification_notes ??
        existing?.verification_notes ??
        "Verified by authorized staff",
      verified_at: isPaid ? now : (existing?.verified_at ?? null),
      verified_by: isPaid
        ? (user.full_name || user.id)
        : (existing?.verified_by ?? null),
      updated_at: now,
    };

    let membership;

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("memberships")
        .update(membershipData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        console.error("Membership update failed:", error.message);
        return NextResponse.json(
          { error: "Failed to update membership" },
          { status: 500 }
        );
      }

      membership = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("memberships")
        .insert({
          id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          ...membershipData,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error("Membership creation failed:", error.message);
        return NextResponse.json(
          { error: "Failed to create membership" },
          { status: 500 }
        );
      }

      membership = data;
    }

    return NextResponse.json({
      success: true,
      membership,
    });
  } catch (error: unknown) {
    console.error("Membership API error:", error);

    return NextResponse.json(
      { error: "Membership operation failed" },
      { status: 500 }
    );
  }
}

