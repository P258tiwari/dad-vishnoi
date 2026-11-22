import type { Metadata } from "next";
import Link from "next/link";
import { Check, Phone } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicShell } from "@/components/PublicShell";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function ThankYouPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Only show references in their known formats; anything else in the URL is ignored.
  const requestId = /^DAD-DENT-\d{8}-[A-F0-9]{6}$/.test(single(params.ref)) ? single(params.ref) : "";
  const paymentId = /^pay_[A-Za-z0-9]{6,40}$/.test(single(params.payment)) ? single(params.payment) : "";
  const duplicate = single(params.duplicate) === "1";

  return <PublicShell>
    <Header />
    <main id="main-content" className="container-shell ping-workspace">
      <div className="success-wrap" aria-live="polite">
        <div>
          <span className="success-icon"><Check size={30} aria-hidden="true" /></span>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Thank you! Payment received <span aria-hidden="true">✓</span></h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-ink-soft">
            Your ₹1,500 consultation fee is paid and your Ping has been shared with the Vishnoi Dental Hospital coordination team. They will contact you to confirm your video consultation time slot.
          </p>
          {requestId ? <p className="success-request-id"><span>Request reference</span><strong>{requestId}</strong></p> : null}
          {paymentId ? <p className="success-request-id"><span>Payment ID</span><strong>{paymentId}</strong></p> : null}
          {duplicate ? <p className="success-duplicate-note">The Ping for this payment was already received, so we did not create a second request.</p> : null}
          <div className="success-next" aria-label="What happens next">
            <b>What happens next?</b>
            <ol>
              <li>Payment confirmed</li>
              <li>Hospital team contacts you</li>
              <li>Consultation slot confirmed</li>
            </ol>
          </div>
          <p className="success-download-note">Need help? <a href="tel:+919997444678"><Phone size={13} aria-hidden="true" className="inline" /> +91 99974 44678</a></p>
          <Link href="/" className="ping-button mt-7 inline-flex min-w-32 justify-center">Back to home</Link>
        </div>
      </div>
    </main>
    <Footer />
  </PublicShell>;
}
