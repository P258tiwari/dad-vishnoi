import { hasConsultationAccess } from "@/lib/consultation-access";
import { hasBotSession } from "@/lib/bot-protection";
import { boundedRequest } from "@/lib/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedMutation } from "@/lib/request-security";
import { isSupportedUpload } from "@/lib/upload-validation";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const safeError = "We couldn't process the recording right now. The audio can still be attached to your ping.";

type SummaryResult = {
  transcript: string;
  summaryEnglish: string;
  summaryHindi: string;
};

const urduScriptPattern = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;

export async function POST(request: NextRequest) {
  if (!(await hasConsultationAccess(request))) return NextResponse.json({ ok: false, message: "Please return from the payment page to open the details form." }, { status: 402 });
  if (!hasBotSession(request)) return NextResponse.json({ ok: false, message: "Please complete the security check and try again." }, { status: 403 });
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ ok: false, message: safeError }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, message: safeError }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "Record a voice note under 15 MB and try again." }, { status: 413 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`transcribe:${ip}`, 4, 15 * 60_000)) {
    return NextResponse.json(
      { ok: false, message: "Too many recordings. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "AI transcription is not configured yet. Your recording can still be attached." },
      { status: 503 },
    );
  }

  try {
    const formData = await (await boundedRequest(request, 16777216)).formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File) || !audio.type.startsWith("audio/") || audio.size <= 0 || audio.size > MAX_AUDIO_BYTES || !await isSupportedUpload(audio)) {
      return NextResponse.json({ ok: false, message: "Record a voice note under 15 MB and try again." }, { status: 400 });
    }

    const transcriptionBody = new FormData();
    transcriptionBody.append("file", audio, audio.name || "voice-note.webm");
    transcriptionBody.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    transcriptionBody.append("response_format", "json");
    transcriptionBody.append(
      "prompt",
      "The speaker may use English, Hindi, or Hinglish to explain a dental concern. Transcribe Hindi only in Devanagari script and English only in Latin script. Never use Urdu, Arabic, or Perso-Arabic script. Preserve symptoms, duration, medicines, allergies, and requested help accurately.",
    );

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: transcriptionBody,
      signal: AbortSignal.timeout(45_000),
    });
    if (!transcriptionResponse.ok) throw new Error(`Transcription failed: ${transcriptionResponse.status}`);
    const transcription = (await transcriptionResponse.json()) as { text?: string };
    const transcript = transcription.text?.trim();
    if (!transcript) throw new Error("Transcription was empty.");

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
              "Return a display transcript plus two short summaries of the patient's voice note. The transcript must preserve the speaker's meaning and every stated detail without summarizing, diagnosing, or adding information. Write spoken Hindi only in Devanagari script and spoken English only in Latin script. If the source transcript contains Urdu, Arabic, or Perso-Arabic characters, transliterate that text into natural Devanagari Hindi; never return those scripts. Write both summaries in the patient's own first-person voice. English must use I/my/me and must never say 'the patient' or use the patient's name. Hindi must use मैं/मेरे/मुझे and must never say मरीज, रोगी, or use third-person phrasing. Preserve symptoms, location, duration, severity, medicines, allergies, and requested help. Do not diagnose, recommend treatment, infer facts, or add medical claims. Keep each summary under 450 characters.",
          },
          { role: "user", content: transcript },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "bilingual_dental_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                transcript: { type: "string" },
                summaryEnglish: { type: "string" },
                summaryHindi: { type: "string" },
              },
              required: ["transcript", "summaryEnglish", "summaryHindi"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!summaryResponse.ok) throw new Error(`Summary failed: ${summaryResponse.status}`);
    const summaryPayload = (await summaryResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = summaryPayload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Summary was empty.");
    const summary = JSON.parse(content) as SummaryResult;
    const displayTranscript = summary.transcript?.trim();
    if (!displayTranscript || displayTranscript.length > 5000 || urduScriptPattern.test(displayTranscript)) {
      throw new Error("Transcript script normalization failed.");
    }

    return NextResponse.json({
      ok: true,
      transcript: displayTranscript,
      summaryEnglish: summary.summaryEnglish.trim(),
      summaryHindi: summary.summaryHindi.trim(),
    });
  } catch (error) {
    console.error("[Dentist At Door] Voice processing failed", error);
    return NextResponse.json({ ok: false, message: safeError }, { status: 502 });
  }
}
