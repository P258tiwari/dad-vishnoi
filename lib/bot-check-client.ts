"use client";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
let scriptPromise: Promise<void> | undefined;
let pending: Promise<void> | undefined;
let verifiedUntil = 0;

function loadWidget() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timeout = setTimeout(() => { script.remove(); scriptPromise = undefined; reject(new Error("Verification could not load. Please try again.")); }, 15_000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); scriptPromise = undefined; reject(new Error("Verification could not load. Please try again.")); };
    document.head.append(script);
  });
  return scriptPromise;
}

export function resetBotCheck() { verifiedUntil = 0; }
export async function ensureBotCheck() {
  if (Date.now() < verifiedUntil) return;
  if (pending) return pending;
  pending = (async () => {
    const check = (token = "") => fetch("/api/bot-check", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), signal: AbortSignal.timeout(15_000),
    });
    if ((await check()).ok) { verifiedUntil = Date.now() + 10 * 60_000; return; }
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey) throw new Error("Verification is temporarily unavailable. Please try again later.");
    await loadWidget();
    await new Promise<void>((resolve, reject) => {
      const previousFocus = document.activeElement as HTMLElement | null;
      const dialog = document.createElement("dialog");
      dialog.className = "bot-check-dialog";
      dialog.setAttribute("aria-labelledby", "bot-check-title");
      const title = document.createElement("h2");
      title.id = "bot-check-title";
      title.textContent = "A quick security check";
      const message = document.createElement("p");
      message.textContent = "Please complete this check to continue your enquiry.";
      const widget = document.createElement("div");
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      dialog.append(title, message, widget, cancel);
      document.body.append(dialog);
      dialog.showModal();
      let widgetId: string | undefined;
      let finished = false;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (widgetId) window.turnstile?.remove(widgetId);
        dialog.close(); dialog.remove(); previousFocus?.focus();
        if (error) reject(error); else resolve();
      };
      const timeout = setTimeout(() => finish(new Error("Verification timed out. Please try again.")), 120_000);
      cancel.onclick = () => finish(new Error("Verification cancelled. Please try again when ready."));
      dialog.oncancel = (event) => { event.preventDefault(); cancel.click(); };
      dialog.addEventListener("keydown", (event) => event.stopPropagation());
      try {
        widgetId = window.turnstile!.render(widget, {
          sitekey, action: "ping", theme: "light", retry: "never",
          callback: async (token: string) => {
            try {
              if (!(await check(token)).ok) throw new Error("Verification failed. Please try again.");
              verifiedUntil = Date.now() + 10 * 60_000;
              finish();
            } catch { finish(new Error("Verification failed. Please try again.")); }
          },
          "error-callback": (code: string) => {
            // Let Turnstile finish its callback before removing the widget.
            // Automatic retries must not target a container we have removed.
            const reference = /^\d{6}$/.test(code) ? ` (code ${code})` : "";
            setTimeout(() => finish(new Error(`Security check could not verify this browser${reference}. Please refresh or try another browser.`)), 0);
            return true;
          },
          "expired-callback": () => finish(new Error("Verification expired. Please try again.")),
        });
      } catch { finish(new Error("Verification could not start. Please try again.")); }
    });
  })();
  try { await pending; } finally { pending = undefined; }
}
