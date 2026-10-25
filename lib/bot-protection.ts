import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const BOT_COOKIE = "dad_ping_verified";
export const BOT_TTL = 15 * 60;
export function botProtectionRequired() {
  return process.env.NODE_ENV === "production" || process.env.BOT_PROTECTION_ENABLED === "true";
}
export function clientIp(request: NextRequest) {
  // The deployment proxy MUST overwrite this header; Node listens on loopback only.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
function signature(payload: string, request: NextRequest) {
  const secret = process.env.BOT_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Bot protection is not configured");
  return createHmac("sha256", secret).update(`${payload}:${clientIp(request)}`).digest("base64url");
}
export function createBotSession(request: NextRequest) {
  const expiry = String(Math.floor(Date.now() / 1000) + BOT_TTL);
  return `${expiry}.${signature(expiry, request)}`;
}
export function hasBotSession(request: NextRequest) {
  if (!botProtectionRequired()) return true;
  try {
    const parts = request.cookies.get(BOT_COOKIE)?.value.split(".");
    if (!parts || parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
    const expiry = Number(parts[0]);
    const now = Math.floor(Date.now() / 1000);
    if (expiry <= now || expiry > now + BOT_TTL) return false;
    const expected = Buffer.from(signature(parts[0], request));
    const supplied = Buffer.from(parts[1]);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  } catch { return false; }
}
export async function verifyBotToken(token: unknown, request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || token.length < 1 || token.length > 2048) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(request) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).hostname;
    return result.success === true && result.hostname === expected && result.action === "ping";
  } catch { return false; }
}
