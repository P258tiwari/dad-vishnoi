import { hasConsultationAccess } from "@/lib/consultation-access";
import { hasBotSession } from "@/lib/bot-protection";
import { boundedRequest } from "@/lib/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { leadInputSchema, normalizeIndianPhone } from "@/lib/lead-schema";
import { isSupportedUpload } from "@/lib/upload-validation";
import { createHash } from "node:crypto";
import { createLead, submissionFingerprint } from "@/lib/lead-service";
import { saveLeadToNotion } from "@/lib/notion-leads";
import { checkRateLimit, isDuplicate, releaseDuplicate } from "@/lib/rate-limit";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

const safeError = "We couldn't submit your request right now. Please try again.";
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!(await hasConsultationAccess(request))) return NextResponse.json({ ok: false, message: "Please return from the payment page to open the details form." }, { status: 402 });
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

  if (parsed.data.website || Date.now() - parsed.data.startedAt < 1500) {
    return NextResponse.json({ ok: true });
  }

  const fingerprint = submissionFingerprint(ip, parsed.data);
  if (isDuplicate(fingerprint)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  const phoneKey = createHash("sha256").update(normalizeIndianPhone(parsed.data.phone)!).digest("hex");
  if (!checkRateLimit(`lead-phone:${phoneKey}`, 3, 60 * 60_000)) {
    releaseDuplicate(fingerprint);
    return NextResponse.json({ ok: false, message: "You have already sent several enquiries. Please wait before sending another." }, { status: 429 });
  }

  const lead = createLead(parsed.data);
  lead.summaryEnglish = "PAYMENT UNVERIFIED - Check the INR 1,500 Razorpay receipt manually before arranging consultation.\n\n" + (lead.summaryEnglish || "");
  try {
    await saveLeadToNotion(lead, attachments);
    console.info(`[Dentist At Door] Notion enquiry saved: ${lead.leadId}`);
  } catch (error) {
    releaseDuplicate(fingerprint);
    console.error(`[Dentist At Door] Notion save failed: ${lead.leadId}`, error);
    return NextResponse.json({ ok: false, message: safeError }, { status: 503 });
  }

  return NextResponse.json({ ok: true, leadId: lead.leadId }, { status: 201 });
}
