import { NextResponse } from "next/server";
import { AUTH_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set({
    name: AUTH_COOKIE_OPTIONS.name,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}
