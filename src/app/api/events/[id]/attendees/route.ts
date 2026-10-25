import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Staff role required" }, { status: 403 });
    }

    const attendees = await db.getEventAttendeesCombined(id);
    return NextResponse.json({ attendees });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch attendees" }, { status: 500 });
  }
}
