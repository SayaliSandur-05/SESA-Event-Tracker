import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePrn } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prn = searchParams.get("prn");

    if (!prn || !prn.trim()) {
      return NextResponse.json({ error: "PRN is required" }, { status: 400 });
    }

    const norm = normalizePrn(prn);
    const membership = await db.getMembershipByPrn(norm);
    const records = await db.getRegistrationsByPrn(norm);

    return NextResponse.json({
      prn: norm,
      membership: membership
        ? {
            full_name: membership.full_name,
            payment_status: membership.payment_status,
            branch: membership.branch,
            academic_year: membership.academic_year,
          }
        : null,
      registrations: records.map((r) => ({
        id: r.registration.id,
        registered_at: r.registration.registered_at,
        registration_type: r.registration.registration_type,
        registration_status: r.registration.registration_status,
        event: {
          id: r.event.id,
          name: r.event.name,
          slug: r.event.slug,
          venue: r.event.venue,
          starts_at: r.event.starts_at,
          status: r.event.status,
        },
        attendance: r.attendance
          ? {
              checked_in_at: r.attendance.checked_in_at,
              method: r.attendance.method,
            }
          : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Lookup failed" }, { status: 500 });
  }
}
