import { NextRequest, NextResponse } from "next/server";
import { BOT_COOKIE, BOT_TTL, createBotSession, hasBotSession, verifyBotToken, clientIp } from "@/lib/bot-protection";
import { isTrustedMutation } from "@/lib/request-security";
import { boundedRequest } from "@/lib/bounded-request";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request)) return NextResponse.json({ ok: false }, { status: 403 });
  if (hasBotSession(request)) return NextResponse.json({ ok: true });
  if (!checkRateLimit(`bot:${clientIp(request)}`, 20)) return NextResponse.json({ ok: false }, { status: 429 });
  try {
    const { token } = await (await boundedRequest(request, 4096)).json();
    if (!await verifyBotToken(token, request)) return NextResponse.json({ ok: false }, { status: 403 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(BOT_COOKIE, createBotSession(request), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: BOT_TTL,
    });
    return response;
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
