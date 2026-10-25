import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Dentist At Door handles enquiry information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  const email = process.env.PRIVACY_CONTACT_EMAIL || "dadclinik@gmail.com";
  return (
    <LegalLayout eyebrow="Your information" title="Privacy Policy" intro="A short explanation of how we handle information submitted through Dentist At Door.">
      <h2>Information we collect</h2>
      <p>We collect the details you submit: your name, phone and WhatsApp numbers, visit address, city, state, pincode and dental concern. If you choose “Use current location,” we also collect your device coordinates and save a Google Maps location link with the enquiry. If you choose to add them, we also collect voice recordings, transcripts, AI-generated summaries and reference images, PDFs or videos. We may also receive basic browser, device, page and security information.</p>

      <h2>How we use it</h2>
      <p>We use your information to receive your enquiry, clarify an optional voice explanation in English and Hindi, confirm service availability, contact you, coordinate your video consultation or an in-person visit in Kanpur, recommend next steps, prevent misuse and maintain necessary service records. AI summaries help organise what you said; they do not provide a diagnosis.</p>

      <h2>Who receives it</h2>
      <p><strong>Your enquiry may be shared between Doctors At Door and Vishnoi Dental Hospital only as needed to coordinate the requested dental service.</strong> Approved hosting, Notion, Google Maps, OpenStreetMap, OpenAI and analytics providers may process limited information on our behalf. Google processes an address search or coordinates when you use address assistance. If Google reverse geocoding is unavailable, OpenStreetMap may process the coordinates from an explicit current-location request to return the address. OpenAI processes an optional voice recording and its text only when you use the AI transcription feature.</p>

      <h2>Calls, WhatsApp and analytics</h2>
      <p>Cloudflare Turnstile checks browser and network signals to help prevent automated enquiries. A short-lived security cookie remembers a successful check. The security check does not send your dental concern, recordings or contact form contents to Cloudflare.</p>
      <p>By submitting the form with consent, you agree that Doctors At Door and/or Vishnoi Dental Hospital may call or message you about your enquiry. Optional analytics scripts load only when configured and may use cookies or similar technologies.</p>

      <h2>Retention and security</h2>
      <p>We retain information only as long as reasonably needed for coordination, operational records, security and applicable legal requirements. We use access controls and server-side processing, but no online system can guarantee absolute security.</p>

      <h2>Your choices</h2>
      <p>Subject to applicable law, you may request access, correction or deletion of your information, or withdraw consent for future optional contact. A parent or guardian should submit enquiries for children.</p>

      <h2>Contact and updates</h2>
      <p>Email <strong>{email}</strong> with the subject “Dentist At Door Privacy Request”. We may update this policy when the service, technology or legal requirements change.</p>
    </LegalLayout>
  );
}
