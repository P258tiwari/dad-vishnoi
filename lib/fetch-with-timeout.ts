import { ensureBotCheck, resetBotCheck } from "./bot-check-client";

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30_000) {
  const protectedRequest = typeof input === "string" && ["/api/leads", "/api/summary", "/api/transcribe", "/api/location"].includes(input);
  if (protectedRequest) await ensureBotCheck();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (protectedRequest && response.status === 403) resetBotCheck();
    return response;
  } catch (error) {
    if (timedOut) throw new DOMException("Request timed out", "TimeoutError");
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
