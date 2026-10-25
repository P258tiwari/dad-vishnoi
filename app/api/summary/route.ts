import { hasConsultationAccess } from "@/lib/consultation-access";
import { hasBotSession } from "@/lib/bot-protection";
import { boundedRequest } from "@/lib/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";

const safeError = "We couldn't create the summary right now. Please try again.";
const MAX_BODY_BYTES = 32 * 1024;

const summaryInputSchema = z.object({
  concern: z.string().trim().max(1200).optional().default(""),
  transcript: z.string().trim().max(5000).optional().default(""),
});

type SummaryResult = {
  summaryEnglish: string;
  summaryHindi: string;
};

export async function POST(request: NextRequest) {
  if (!(await hasConsultationAccess(request))) return NextResponse.json({ ok: false, message: "Please return from the payment page to open the details form." }, { status: 402 });
  if (!hasBotSession(request)) return NextResponse.json({ ok: false, message: "Please complete the security check and try again." }, { status: 403 });
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ ok: false, message: safeError }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ ok: false, message: safeError }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: "Keep the dental concern brief and try again." }, { status: 413 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`summary:${ip}`, 8, 15 * 60_000)) {
    return NextResponse.json(
      { ok: false, message: "Too many summary requests. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  try {
    const parsed = summaryInputSchema.safeParse(await (await boundedRequest(request, 32768)).json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Keep the dental concern brief and try again." }, { status: 400 });
    }

    const sections = [
      parsed.data.concern ? `Written concern:\n${parsed.data.concern}` : "",
      parsed.data.transcript ? `Voice transcript:\n${parsed.data.transcript}` : "",
    ].filter(Boolean);
    if (!sections.length) {
      return NextResponse.json({
        ok: true,
        summaryEnglish: "I did not provide a dental concern.",
        summaryHindi: "मैंने दाँतों से जुड़ी कोई समस्या नहीं बताई।",
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, message: "AI summary is not configured yet." }, { status: 503 });
    }

    const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SUMMARY_MODEL || "gpt-5.6-luna",
        store: false,
        messages: [
          {
            role: "system",
            content:
              "Create two short, plain-language summaries of a patient's dental concern: one in English and one in natural Hindi. Write both summaries in the patient's own first-person voice. English must use I/my/me and must never say 'the patient' or use the patient's name. Hindi must use मैं/मेरे/मुझे and must never say मरीज, रोगी, or use third-person phrasing. The input may be English, Hindi, or Hinglish. Preserve only details the patient stated, including symptoms, location, duration, severity, medicines, allergies, and requested help. Do not diagnose, recommend treatment, infer facts, or add medical claims. Keep each summary under 450 characters.",
          },
          { role: "user", content: sections.join("\n\n") },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "bilingual_dental_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summaryEnglish: { type: "string" },
                summaryHindi: { type: "string" },
              },
              required: ["summaryEnglish", "summaryHindi"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!summaryResponse.ok) throw new Error(`Summary failed: ${summaryResponse.status}`);
    const payload = (await summaryResponse.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Summary was empty.");

    const summary = JSON.parse(content) as SummaryResult;
    const summaryEnglish = summary.summaryEnglish?.trim();
    const summaryHindi = summary.summaryHindi?.trim();
    if (!summaryEnglish || !summaryHindi || summaryEnglish.length > 500 || summaryHindi.length > 500) {
      throw new Error("Summary response was invalid.");
    }

    return NextResponse.json({ ok: true, summaryEnglish, summaryHindi });
  } catch (error) {
    console.error("[Dentist At Door] Summary generation failed", error);
    return NextResponse.json({ ok: false, message: safeError }, { status: 502 });
  }
}
