import Link from "next/link";
import { DoctorsAtDoorMark } from "./BrandMarks";
import { PingButton } from "./PingExperience";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-[rgba(251,253,252,.88)] backdrop-blur-xl">
      <div className="container-shell header-inner relative flex min-h-[4.6rem] items-center justify-between gap-4">
        <div className="header-left">
          <Link href="/" aria-label="Dentist At Door home" prefetch={false}><DoctorsAtDoorMark /></Link>
        </div>
        <div className="header-collab-chip" aria-label="Dentist At Door in collaboration with Vishnoi Dental Hospital">
          <div className="header-collab-chip-row">
            <span className="header-chip-dot" aria-hidden="true" />
            <span>Dentist At Door</span>
            <b>&times;</b>
            <span>Vishnoi Dental Hospital</span>
          </div>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <PingButton source="header" className="min-h-10 px-4 py-2 text-[.7rem]">Ping</PingButton>
        </div>
      </div>
    </header>
  );
}
