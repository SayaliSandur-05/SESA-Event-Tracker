
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (
      !user ||
      !["super_admin", "organizer", "volunteer"].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden: Staff role required" },
        { status: 403 }
      );
    }

    // Keep the existing dashboard statistics.
    const stats = await db.getDashboardStats();

    // Fetch membership counts from Supabase, not the old JSON file.
    const [paidResult, pendingResult] = await Promise.all([
      supabaseAdmin
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "paid"),

      supabaseAdmin
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "pending"),
    ]);

    if (paidResult.error) {
      throw paidResult.error;
    }

    if (pendingResult.error) {
      throw pendingResult.error;
    }

    // Override only the membership totals.
    const correctedStats = {
      ...stats,
      totalPaidMembers: paidResult.count ?? 0,
      totalPendingMembers: pendingResult.count ?? 0,
    };

    return NextResponse.json({ stats: correctedStats });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
