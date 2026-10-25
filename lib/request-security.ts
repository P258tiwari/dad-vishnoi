import "server-only";
import type { NextRequest } from "next/server";

export function isTrustedMutation(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const expectedOrigin = process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_SITE_URL
      : request.nextUrl.origin;
    return Boolean(expectedOrigin) && new URL(origin).origin === new URL(expectedOrigin!).origin;
  } catch {
    return false;
  }
}
