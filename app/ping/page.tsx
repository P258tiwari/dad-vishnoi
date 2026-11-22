import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Stethoscope, Phone, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicShell } from "@/components/PublicShell";
import { PingPageForm } from "@/components/PingExperience";

export const metadata: Metadata = {
  title: "Consult Dr Manish Vishnoi",
  robots: { index: false, follow: false },
};

export default function PingPage() {
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
          <div className="ping-review-note"><ShieldCheck size={18} aria-hidden="true" /><div><h3>Secure payment</h3><p>Fill in your details, then pay the fee securely with Razorpay. Your Ping is sent to our team once the payment is confirmed.</p></div></div>
          <div className="ping-sidebar-help"><span>Need a hand with the form?</span><a href="tel:+919997444678"><Phone size={15} aria-hidden="true" /> +91 99974 44678</a></div>
        </aside>
        <section className="ping-form-section" aria-label="Your consultation details"><PingPageForm /></section>
      </div>
    </main>
    <Footer />
  </PublicShell>;
}
