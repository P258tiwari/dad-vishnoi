import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Stethoscope, Phone, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicShell } from "@/components/PublicShell";
import { PingPageForm } from "@/components/PingExperience";
import { hasConsultationAccess } from "@/lib/consultation-access";

export const metadata: Metadata = {
  title: "Consult Dr Manish Vishnoi",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PingPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Temporary manual-review flow: this return flag is not proof of payment.
  const returning = params.status === "success";
  const canEnter = await hasConsultationAccess();
  if (returning && !canEnter) redirect("/api/consultation/return");
  const paymentPageUrl = process.env.RAZORPAY_PAYMENT_PAGE_URL || "https://pages.razorpay.com/pingfee";
  if (!returning && !canEnter) {
    const destination = new URL(paymentPageUrl);
    if (destination.protocol !== "https:" || destination.username || destination.password ||
        !(destination.hostname === "rzp.io" || destination.hostname === "razorpay.com" || destination.hostname.endsWith(".razorpay.com"))) {
      throw new Error("Configure a valid HTTPS Razorpay Payment Page URL.");
    }
    redirect(destination.toString());
  }
  return <PublicShell>
    <Header />
    <main id="main-content" className="container-shell ping-workspace">
      <Link href="/" className="ping-back"><ArrowLeft size={15} aria-hidden="true" /> Back to home</Link>
      <header className="ping-page-heading">
        <p>YOUR CONSULTATION</p>
        <h1>Tell us how we can help.</h1>
        <span>Share a few details so our team can coordinate your next step.</span>
      </header>
      <div className="ping-page-layout">
        <aside className="ping-consultation-sidebar" aria-label="Consultation information">
          <div className="ping-doctor-symbol"><Stethoscope size={27} aria-hidden="true" /></div>
          <p className="ping-sidebar-label">YOUR DENTIST</p>
          <h2>Dr Manish Vishnoi</h2>
          <p className="ping-hospital">Vishnoi Dental Hospital</p>
          <div className="ping-sidebar-fee"><span>Consultation fee</span><strong>&#8377;1,500</strong></div>
          <div className="ping-review-note"><ShieldCheck size={18} aria-hidden="true" /><div><h3>Manual payment check</h3><p>Our team will confirm your payment before arranging the consultation. Keep your Razorpay receipt handy.</p><p>Already paid? Please don&apos;t pay again.</p></div></div>
          <div className="ping-sidebar-help"><span>Need a hand with the form?</span><a href="tel:+919997444678"><Phone size={15} aria-hidden="true" /> +91 99974 44678</a></div>
        </aside>
        <section className="ping-form-section" aria-label="Your consultation details"><PingPageForm /></section>
      </div>
    </main>
    <Footer />
  </PublicShell>;
}
