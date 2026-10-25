import { NextRequest, NextResponse } from "next/server";
import { CONSULTATION_COOKIE } from "@/lib/consultation-access";

// This intentionally accepts an unverified return for the temporary manual flow.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/ping?status=success", request.url), 303);
  response.cookies.set(CONSULTATION_COOKIE, "manual-review", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
