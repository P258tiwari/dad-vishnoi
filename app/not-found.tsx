import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PublicShell } from "@/components/PublicShell";

export default function NotFound() {
  return (
    <PublicShell>
      <Header />
      <main id="main-content" className="grid min-h-[70dvh] place-items-center bg-mist px-4 py-20 text-center">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[.16em] text-aqua">404</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em] text-ink sm:text-5xl">This page could not be found.</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-ink-soft">The address may be incorrect or the page may have moved.</p>
          <Link className="ping-button mt-7" href="/">Return home</Link>
        </div>
      </main>
      <Footer />
    </PublicShell>
  );
}
