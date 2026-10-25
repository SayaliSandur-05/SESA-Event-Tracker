import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateRegistrationsCsv, generateAttendanceCsv } from "@/lib/csv";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Only organizers and volunteers can export reports" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") || "registrations"; // 'registrations' or 'attendance'

    const event = await db.getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const attendees = await db.getEventAttendeesCombined(event.id);

    let csvContent = "";
    let filename = "";

    if (exportType === "attendance") {
      csvContent = generateAttendanceCsv(event, attendees);
      filename = `${event.slug}_attendance_turnout_${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      csvContent = generateRegistrationsCsv(event, attendees);
      filename = `${event.slug}_registrations_${new Date().toISOString().split("T")[0]}.csv`;
    }

    await db.logAudit(user.id, user.full_name, "EVENT_REPORT_EXPORTED", "events", event.id, {
      exportType,
      rowCount: attendees.length,
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
