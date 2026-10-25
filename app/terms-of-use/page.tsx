import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using Dentist At Door and submitting an enquiry.",
  alternates: { canonical: "/terms-of-use" },
};

export default function TermsPage() {
  return (
    <LegalLayout eyebrow="Service terms" title="Terms of Use" intro="The essentials for requesting an online dental consultation with Dr. Manish Vishnoi.">
      <h2>Service request</h2>
      <p>Dentist At Door is an enquiry and coordination service by Doctors At Door in collaboration with Vishnoi Dental Hospital. <strong>Submitting an enquiry does not guarantee or confirm an appointment.</strong> A visit is confirmed only by the coordination team.</p>

      <h2>Your responsibilities</h2>
      <p>Provide accurate contact, location and concern information. A parent or guardian should submit requests for a child. By consenting, you agree to receive calls or WhatsApp messages about the enquiry.</p>

      <h2>Availability and scheduling</h2>
      <p>Services depend on location, staffing, scheduling and the nature of the request. Confirmed visits may need to be changed for operational, safety or clinical reasons.</p>

      <h2>Clinical limits</h2>
      <p>The initial consultation takes place online by video. If a dental procedure, physical examination, diagnostic test, scan or treatment is recommended, you will need to visit the designated facility in Kanpur. Online consultation does not guarantee remote treatment.</p>

      <h2>Not an emergency service</h2>
      <p><strong>Do not use Dentist At Door for medical or dental emergencies.</strong> Seek immediate help from an appropriate healthcare facility. Website content is general information, not a diagnosis or treatment plan.</p>

      <h2>Pricing and changes</h2>
      <p>The online video consultation fee is ₹1,500. Tests, investigations, medicines, dental procedures and other treatments are not included. If you proceed with the recommended treatment with Dr. Manish Vishnoi, the consultation fee will be adjusted against treatment charges, as applicable.</p>
      <p>After payment, the team checks the receipt and confirms your consultation time slot. Payment does not provide immediate or anytime access to the doctor. Consultation advice is valid for 15 days from the consultation date; a fresh consultation may be required after that depending on your condition. Contact the team for cancellation or rescheduling requests.</p>

      <h2>Technology and privacy</h2>
      <p>The service may use hosting, Notion, OpenAI and analytics providers. Their systems may occasionally be unavailable. Personal information is handled under our Privacy Policy.</p>

      <h2>Liability and governing law</h2>
      <p>To the extent permitted by law, the service partners are not responsible for indirect losses caused solely by unavailable services, scheduling changes or third-party failures. These terms are governed by Indian law and are subject to the jurisdiction of the courts in <strong>Kanpur, Uttar Pradesh</strong>.</p>

      <h2>Contact</h2>
      <p>Questions may be sent to <strong>dadclinik@gmail.com</strong> or to <strong>DAD Clinic Pvt Ltd, Kanpur, Uttar Pradesh</strong>.</p>
    </LegalLayout>
  );
}
