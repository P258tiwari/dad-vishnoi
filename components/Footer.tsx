import { TranslatedText } from "./LanguageSwitcher";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-ink pb-24 text-white md:pb-0">
      <div className="container-shell py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-1">
            <span className="text-base font-extrabold tracking-[-.035em]">Doctors At Door</span>
            <span className="text-[.67rem] font-bold text-white/45">Dentist At Door &times; Vishnoi Dental Hospital</span>
          </div>

          <nav className="flex items-center gap-4 text-xs font-bold text-white/70" aria-label="Footer navigation">
            <Link href="/privacy-policy" className="hover:text-white"><TranslatedText en="Privacy" hi="गोपनीयता" /></Link>
            <Link href="/terms-of-use" className="hover:text-white"><TranslatedText en="Terms" hi="शर्तें" /></Link>
          </nav>

          <div className="flex items-center gap-3.5" aria-label="Follow Doctors At Door on social media">
            <a href="https://www.instagram.com/doctorsatdoor/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/55 transition hover:text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.5" y2="6.5" /></svg>
            </a>
            <a href="https://www.facebook.com/doctorsatdoor.offical/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-white/55 transition hover:text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
            </a>
            <a href="https://x.com/doctors_at_door" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-white/55 transition hover:text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" /></svg>
            </a>
          </div>

        </div>

        <div className="mt-4 flex flex-col items-start gap-2 border-t border-white/10 pt-3 text-[.62rem] leading-4 text-white/38 md:flex-row md:items-center md:justify-between">
          <p><TranslatedText en="For dental enquiries and next-step coordination. Not an emergency service." hi="दांतों से जुड़ी पूछताछ और अगले कदम के समन्वय के लिए। यह आपातकालीन सेवा नहीं है।" /></p>
          <p className="shrink-0 self-end text-right">&copy; {new Date().getFullYear()} Doctors At Door.</p>
        </div>
      </div>
    </footer>
  );
}
