import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stats = await db.getEventDetailedStats(id);
    if (!stats) {
      // Try by slug
      const event = await db.getEventById(id);
      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      const detailed = await db.getEventDetailedStats(event.id);
      return NextResponse.json({ stats: detailed });
    }
    return NextResponse.json({ stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch event" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized to edit events" }, { status: 403 });
    }

    const body = await req.json();
    const updated = await db.updateEvent(id, body, { id: user.id, name: user.full_name });

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Staff role required to delete events" }, { status: 403 });
    }

    await db.deleteEvent(id, { id: user.id, name: user.full_name });
    return NextResponse.json({ success: true, message: "Event archived/removed" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 });
  }
}
