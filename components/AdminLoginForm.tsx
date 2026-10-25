"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export function AdminLoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
      }, 20_000);
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || "Login failed.");
      router.replace("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(
        !navigator.onLine
          ? "You appear to be offline. Check your connection and try again."
          : loginError instanceof DOMException && loginError.name === "TimeoutError"
            ? "Login is taking longer than expected. Please try again."
            : loginError instanceof Error ? loginError.message : "Login failed.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5" noValidate>
      <label className="grid gap-2 text-sm font-bold text-[#292057]">
        Username
        <input
          className="min-h-13 rounded-2xl border border-[#ded8ef] bg-white px-4 text-base font-medium outline-none transition focus:border-[#8b7ec8] focus:ring-4 focus:ring-[#8b7ec8]/10"
          name="username"
          autoComplete="username"
          required
          autoFocus
          placeholder="Admin username"
        />
      </label>

      <label className="grid gap-2 text-sm font-bold text-[#292057]">
        Password
        <span className="relative block">
          <input
            className="min-h-13 w-full rounded-2xl border border-[#ded8ef] bg-white px-4 pr-12 text-base font-medium outline-none transition focus:border-[#8b7ec8] focus:ring-4 focus:ring-[#8b7ec8]/10"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Your password"
          />
          <button
            className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-xl text-[#7164b1] hover:bg-[#f0eef9]"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}

      <button
        className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#ff0000] px-5 font-extrabold text-white shadow-[0_14px_30px_rgba(255,0,0,.18)] transition hover:bg-[#d90000] disabled:cursor-wait disabled:opacity-65"
        type="submit"
        disabled={submitting}
      >
        {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
        {submitting ? "Signing in…" : "Sign in to dashboard"}
      </button>
    </form>
  );
}
