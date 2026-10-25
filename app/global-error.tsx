"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ display: "grid", minHeight: "100dvh", placeItems: "center", padding: "2rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
          <div>
            <h1>We couldn&apos;t load Dentist At Door.</h1>
            <p>Please try again.</p>
            <button type="button" onClick={reset}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
