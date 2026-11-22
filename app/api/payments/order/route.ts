import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, hasBotSession } from "@/lib/bot-protection";
import { normalizeIndianPhone } from "@/lib/lead-schema";
import { createConsultationOrder } from "@/lib/razorpay";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

const customerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().refine((value) => normalizeIndianPhone(value) !== null),
});

export async function POST(request: NextRequest) {
  if (!hasBotSession(request)) return NextResponse.json({ ok: false, message: "Please complete the security check and try again." }, { status: 403 });
  if (!isTrustedMutation(request)) return NextResponse.json({ ok: false, message: "We couldn't start the payment. Please try again." }, { status: 403 });
  if (!checkRateLimit(`payment-order:${clientIp(request)}`, 10)) {
    return NextResponse.json({ ok: false, message: "Too many payment attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": "900" } });
  }

  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Please check your name and mobile number." }, { status: 400 });

  try {
    const order = await createConsultationOrder({ name: parsed.data.fullName, phone: normalizeIndianPhone(parsed.data.phone)! });
    return NextResponse.json({ ok: true, ...order });
  } catch (error) {
    console.error("[Dentist At Door] Razorpay order failed", error);
    return NextResponse.json({ ok: false, message: "Payment is unavailable right now. Please try again shortly." }, { status: 503 });
  }
}
