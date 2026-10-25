import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateMembershipsCsv } from "@/lib/csv";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Organizer role required" }, { status: 403 });
    }

    const memberships = await db.getMemberships();
    const csvContent = generateMembershipsCsv(memberships);
    const filename = `sesa_membership_roster_${new Date().toISOString().split("T")[0]}.csv`;

    await db.logAudit(user.id, user.full_name, "MEMBERSHIP_CSV_EXPORTED", "memberships", "roster", {
      totalExported: memberships.length,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Export failed" }, { status: 500 });
  }
}
