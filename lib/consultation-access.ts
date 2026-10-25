import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const CONSULTATION_COOKIE = "dad_manual_payment_return";

/**
 * Temporary navigation gate only, NOT proof of payment. The team must check
 * the Razorpay receipt manually before arranging any consultation.
 */
export async function hasConsultationAccess(request?: NextRequest): Promise<boolean> {
  const jar = request ? request.cookies : await cookies();
  return jar.get(CONSULTATION_COOKIE)?.value === "manual-review";
}
