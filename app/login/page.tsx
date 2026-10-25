import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await isAdminAuthenticated()) redirect("/dashboard");

  return (
    <main id="main-content" className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top_left,#e9e4f4_0,transparent_35%),linear-gradient(145deg,#f8f7fb,#efecf6)] p-4">
      <section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_30px_90px_rgba(31,24,76,.15)] backdrop-blur-xl">
        <div className="bg-[#1f184c] px-7 py-8 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-13 place-items-center overflow-hidden rounded-2xl bg-white p-1.5"><Image src="/brand/doctors-at-door.png" alt="Doctors At Door" width={80} height={80} /></span>
            <div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-white/55">Dentist At Door</p><h1 className="mt-1 text-2xl font-black tracking-[-.04em]">Admin login</h1></div>
          </div>
          <p className="mt-5 text-sm leading-6 text-white/65">Private access for the enquiry coordination team.</p>
        </div>
        <div className="p-7">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#7164b1]"><ShieldCheck size={16} /> Secure admin area</div>
          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}
