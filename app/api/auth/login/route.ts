import { boundedRequest } from "@/lib/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE_NAME, adminSessionCookieOptions, createAdminSessionToken, verifyAdminCredentials } from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedMutation } from "@/lib/request-security";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(300),
});

export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ ok: false, message: "Login request was blocked." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ ok: false, message: "Login request must use JSON." }, { status: 415 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`admin-login:${ip}`, 8, 15 * 60_000)) {
    return NextResponse.json(
      { ok: false, message: "Too many login attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  let parsed;
  try {
    parsed = loginSchema.safeParse(await (await boundedRequest(request, 4096)).json());
  } catch {
    return NextResponse.json({ ok: false, message: "Enter your login details." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter your login details." }, { status: 400 });

  try {
    if (!verifyAdminCredentials(parsed.data.username, parsed.data.password)) {
      return NextResponse.json({ ok: false, message: "Incorrect username or password." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), adminSessionCookieOptions);
    return response;
  } catch (error) {
    console.error("[Dentist At Door] Admin login configuration error", error);
    return NextResponse.json({ ok: false, message: "Admin login is not configured yet." }, { status: 503 });
  }
}
