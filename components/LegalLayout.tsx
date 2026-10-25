import Link from "next/link";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PublicShell } from "./PublicShell";

export function LegalLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <PublicShell>
      <Header />
      <main id="main-content" className="legal-shell">
        <article className="container-shell legal-content">
          <Link href="/" className="mb-8 inline-flex text-sm font-extrabold text-aqua-dark hover:underline">← Back to Dentist At Door</Link>
          <span className="eyebrow block">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="text-lg">{intro}</p>
          <div className="legal-note text-sm">
            <b>Document details</b><br />
            Legal Entity Name: <span className="font-semibold text-aqua-dark">DAD Clinic Pvt Ltd</span><br />
            Registered Address: <span className="font-semibold text-aqua-dark">Kanpur, Uttar Pradesh</span><br />
            Effective Date: <span className="font-semibold text-aqua-dark">15 August 2026</span>
          </div>
          {children}
        </article>
      </main>
      <Footer />
    </PublicShell>
  );
}
