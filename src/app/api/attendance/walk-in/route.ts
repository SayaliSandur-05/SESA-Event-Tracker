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
    const { eventId, prn, email, contact } = body;

    if (!eventId || !prn) {
      return NextResponse.json({ error: "Event ID and College PRN are required" }, { status: 400 });
    }

    // Atomic walk-in registration + mark present
    const result = await db.registerWalkInAndCheckIn({
      eventId,
      prn,
      email,
      contact,
      actor: { id: user.id, name: user.full_name },
    });

    return NextResponse.json({
      success: true,
      registration: result.registration,
      attendance: result.attendance,
      message: `Walk-in student ${result.registration.student_name_snapshot} (${result.registration.prn}) registered and checked in successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Walk-in registration failed" },
      { status: 400 }
    );
  }
}
