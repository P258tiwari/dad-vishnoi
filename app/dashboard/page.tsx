import type { Metadata } from "next";
import Image from "next/image";
import { LogOut, RefreshCw } from "lucide-react";
import { EnquiryDashboard } from "@/components/EnquiryDashboard";
import { requireAdmin } from "@/lib/admin-auth";
import { listEnquiries } from "@/lib/notion-leads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Enquiry Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  await requireAdmin();
  let enquiries = [] as Awaited<ReturnType<typeof listEnquiries>>;
  let loadError = "";
  try {
    enquiries = await listEnquiries();
  } catch (error) {
    console.error("[Dentist At Door] Dashboard load failed", error);
    loadError = error instanceof Error && error.message.startsWith("Notion integration is not configured")
      ? "Connect the website to Notion by setting NOTION_API_KEY and NOTION_DATA_SOURCE_ID."
      : "Enquiries could not be loaded from Notion. Check the integration connection and try again.";
  }

  return (
    <main id="main-content" className="dashboard-page min-h-dvh">
      <header className="dashboard-topbar">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center overflow-hidden rounded-xl border border-[#e4e0ef] bg-white p-1"><Image src="/brand/doctors-at-door.png" alt="Doctors At Door" width={72} height={72} /></span>
            <div><p className="text-[.65rem] font-extrabold uppercase tracking-[.15em] text-[#8a8393]">Dentist At Door</p><h1 className="text-lg font-black tracking-[-.03em] text-[#1f184c]">Ping workspace</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <a className="hidden min-h-10 items-center gap-2 rounded-xl border border-[#ded8ef] px-3 text-xs font-extrabold text-[#655a8f] hover:bg-[#f7f5fb] sm:inline-flex" href="/dashboard"><RefreshCw size={15} /> Refresh</a>
            <form action="/api/auth/logout" method="post"><button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1f184c] px-3 text-xs font-extrabold text-white hover:bg-[#292057]" type="submit"><LogOut size={15} /> Sign out</button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 sm:py-10">
        <section className="dashboard-welcome" aria-label="Workspace overview">
          <div className="dashboard-welcome-copy"><span className="dashboard-eyebrow"><span /> Vishnoi Dental Hospital</span><h2>Every Ping.<br /><span>A connection to care.</span></h2><p>Review enquiries, connect with patients, and coordinate the next step.</p></div>
          <div className="dashboard-welcome-mark" aria-hidden="true"><span /><span /><b>Ping<span className="dashboard-mark-dot">.</span></b></div>
          <span className="dashboard-welcome-caption">DENTIST AT DOOR / ENQUIRIES</span>
        </section>
        <EnquiryDashboard initialEnquiries={enquiries} loadError={loadError} />
      </div>
    </main>
  );
}
