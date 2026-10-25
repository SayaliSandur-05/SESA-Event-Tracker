
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Supabase test failed:", error.message);

    return NextResponse.json(
      { success: false, message: "Database connection failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Supabase connection successful.",
    table: "memberships",
    accessible: true,
  });
}
