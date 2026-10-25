import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE_NAME = "dad_admin_session";
const SESSION_SECONDS = 12 * 60 * 60;

function getAdminConfig() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!username || !password || !secret || secret.length < 32 || (process.env.NODE_ENV === "production" && password.length < 12)) {
    throw new Error("Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and a 32+ character ADMIN_SESSION_SECRET.");
  }
  return { username, password, secret };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminCredentials(username: string, password: string) {
  const config = getAdminConfig();
  return safeEqual(username.trim().toLowerCase(), config.username.trim().toLowerCase()) && safeEqual(password, config.password);
}

export function createAdminSessionToken() {
  const { username, secret } = getAdminConfig();
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string) {
  if (!token) return false;
  try {
    const { secret, username } = getAdminConfig();
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    if (!payload || !signature) return false;
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    if (!safeEqual(signature, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return data.sub === username && typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  return verifyAdminSessionToken((await cookies()).get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/login");
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
  priority: "high" as const,
};
