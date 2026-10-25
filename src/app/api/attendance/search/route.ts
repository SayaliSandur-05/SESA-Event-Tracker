import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Staff role required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const prn = searchParams.get("prn");

    if (!eventId || !prn) {
      return NextResponse.json({ error: "Event ID and PRN are required" }, { status: 400 });
    }

    const result = await db.searchAttendeeForDesk(eventId, prn);

    return NextResponse.json({
      exists: !!result.registration,
      membership: result.membership
        ? {
            id: result.membership.id,
            prn: result.membership.prn,
            full_name: result.membership.full_name,
            payment_status: result.membership.payment_status,
            branch: result.membership.branch,
            academic_year: result.membership.academic_year,
          }
        : null,
      registration: result.registration,
      attendance: result.attendance,
      event: result.event
        ? {
            id: result.event.id,
            name: result.event.name,
            walk_ins_enabled: result.event.walk_ins_enabled,
            capacity: result.event.capacity,
            status: result.event.status,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Search failed" }, { status: 500 });
  }
}
