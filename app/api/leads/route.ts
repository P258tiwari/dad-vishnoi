import { hasBotSession } from "@/lib/bot-protection";
import { boundedRequest } from "@/lib/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { leadInputSchema } from "@/lib/lead-schema";
import { isSupportedUpload } from "@/lib/upload-validation";
import { createLead } from "@/lib/lead-service";
import { saveLeadToNotion } from "@/lib/notion-leads";
import { verifyConsultationPayment } from "@/lib/razorpay";
import { checkRateLimit, isDuplicate, releaseDuplicate } from "@/lib/rate-limit";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

const safeError = "We couldn't submit your request right now. Please try again.";
const paidSaveError = "Your payment is received, but we couldn't send your details. Please try again. You won't be charged again.";
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;

const paymentSchema = z.object({
  orderId: z.string().regex(/^order_[A-Za-z0-9]{6,40}$/),
  paymentId: z.string().regex(/^pay_[A-Za-z0-9]{6,40}$/),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(request: NextRequest) {
  if (!hasBotSession(request)) return NextResponse.json({ ok: false, message: "Please complete the security check and try again." }, { status: 403 });
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ ok: false, message: safeError }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, message: safeError }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ ok: false, message: "Keep all files together under 30 MB." }, { status: 413 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  let body: unknown;
  let attachments: File[] = [];
  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await (await boundedRequest(request, 33554432)).formData();
      const payload = formData.get("payload");
      if (typeof payload !== "string") throw new Error("Missing payload.");
      body = JSON.parse(payload);
      attachments = formData.getAll("files").filter((value): value is File => value instanceof File);
    } else {
      body = await (await boundedRequest(request, 33554432)).json();
    }
  } catch {
    return NextResponse.json({ ok: false, message: safeError }, { status: 400 });
  }

  const totalAttachmentBytes = attachments.reduce((total, file) => total + file.size, 0);
  const invalidAttachment = attachments.some((file) =>
    file.size <= 0 ||
    file.size > 15 * 1024 * 1024 ||
    !(file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/") || file.type === "application/pdf"),
  );
  if (attachments.length > 8 || totalAttachmentBytes > 30 * 1024 * 1024 || invalidAttachment) {
    return NextResponse.json({ ok: false, message: "Add up to 8 supported files, maximum 15 MB each and 30 MB total." }, { status: 400 });
  }
  if ((await Promise.all(attachments.map(isSupportedUpload))).some((valid) => !valid)) {
    return NextResponse.json({ ok: false, message: "Use JPG, PNG, GIF, WebP, HEIC, PDF, MP4, MOV, WebM, Ogg, MP3 or WAV files with valid content." }, { status: 400 });
  }

  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Please check the highlighted information.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const paymentInput = paymentSchema.safeParse((body as { payment?: unknown }).payment);
  if (!paymentInput.success) {
    return NextResponse.json({ ok: false, message: "Please complete the ₹1,500 payment before sending your Ping." }, { status: 402 });
  }

  // One Ping per payment. The Notion lookup in saveLeadToNotion covers retries after this lock expires.
  const lockKey = `payment:${paymentInput.data.paymentId}`;
  if (isDuplicate(lockKey)) {
    return NextResponse.json({ ok: false, message: "Your Ping is already being sent. Please wait a moment." }, { status: 409 });
  }

  let payment;
  try {
    payment = await verifyConsultationPayment(paymentInput.data);
  } catch (error) {
    releaseDuplicate(lockKey);
    console.error("[Dentist At Door] Razorpay verification failed", error);
    return NextResponse.json({ ok: false, message: "We couldn't confirm your payment right now. Please try again. You won't be charged again." }, { status: 503 });
  }
  if (!payment) {
    releaseDuplicate(lockKey);
    return NextResponse.json({ ok: false, message: "We couldn't confirm this payment. If money was deducted, please call +91 99974 44678." }, { status: 402 });
  }

  // ponytail: no honeypot or per-phone limit here; a verified paid Ping must never be silently dropped.
  const lead = createLead(parsed.data, payment);
  try {
    const saved = await saveLeadToNotion(lead, attachments);
    console.info(`[Dentist At Door] Paid Notion enquiry saved: ${saved.leadId}`);
    return NextResponse.json({ ok: true, leadId: saved.leadId, duplicate: saved.duplicate }, { status: saved.duplicate ? 200 : 201 });
  } catch (error) {
    releaseDuplicate(lockKey);
    console.error(`[Dentist At Door] Notion save failed for paid ${payment.paymentId}: ${lead.leadId}`, error);
    return NextResponse.json({ ok: false, message: paidSaveError }, { status: 503 });
  }
}
