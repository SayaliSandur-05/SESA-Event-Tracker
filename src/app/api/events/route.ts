import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";
    const user = await getCurrentUser();

    // Only staff (super_admin, organizer, volunteer) can request all non-published events
    const canSeeAll = Boolean(showAll && user && ["super_admin", "organizer", "volunteer"].includes(user.role));
    const events = await db.getEvents(canSeeAll);

    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !["super_admin", "organizer", "volunteer"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Authorized volunteers, organizers and administrators can create events" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      summary,
      description,
      venue,
      starts_at,
      ends_at,
      registration_opens_at,
      registration_closes_at,
      capacity,
      walk_ins_enabled,
      status,
      banner_url,
    } = body;

    if (!name || !summary || !description || !venue || !starts_at || !ends_at) {
      return NextResponse.json(
        { error: "Missing required event fields (name, summary, description, venue, starts_at, ends_at)" },
        { status: 400 }
      );
    }

    const newEvent = await db.createEvent(
      {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        summary,
        description,
        venue,
        starts_at,
        ends_at,
        registration_opens_at: registration_opens_at || new Date().toISOString(),
        registration_closes_at: registration_closes_at || starts_at,
        capacity: capacity ? Number(capacity) : null,
        walk_ins_enabled: walk_ins_enabled !== false,
        status: status || "draft",
        banner_url,
      },
      { id: user.id, name: user.full_name }
    );

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create event" }, { status: 500 });
  }
}
