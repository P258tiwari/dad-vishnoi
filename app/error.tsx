"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Dentist At Door] Page render failed", error);
  }, [error]);

  return (
    <main id="main-content" className="grid min-h-dvh place-items-center bg-mist px-4 py-20 text-center">
      <div>
        <p className="text-sm font-extrabold uppercase tracking-[.16em] text-aqua">Something went wrong</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em] text-ink">We couldn&apos;t load this page.</h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-ink-soft">Please try again. Your browser can safely reload the page if the problem continues.</p>
        <button type="button" className="ping-button mt-7" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
