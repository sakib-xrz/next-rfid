import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ message: "Signed out" });
  clearAdminSessionCookie(response);
  return response;
}
