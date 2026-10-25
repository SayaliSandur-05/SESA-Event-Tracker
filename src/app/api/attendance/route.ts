import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Staff role required" }, { status: 403 });
    }

    const body = await req.json();
    const { eventId, registrationId } = body;

    if (!eventId || !registrationId) {
      return NextResponse.json(
        { error: "Event ID and Registration ID are required" },
        { status: 400 }
      );
    }

    const attendanceRecord = await db.markPresent(eventId, registrationId, {
      id: user.id,
      name: user.full_name,
    });

    return NextResponse.json({
      success: true,
      attendance: attendanceRecord,
      message: "Attendee marked present successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to mark attendance" },
      { status: 400 }
    );
  }
}
