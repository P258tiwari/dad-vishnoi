const fallbackSiteUrl = "https://vishnoi.doctorsatdoor.com";

function resolveSiteUrl() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl);
    if (!["http:", "https:"].includes(url.protocol)) return fallbackSiteUrl;
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallbackSiteUrl;
  }
}

export const siteConfig = {
  name: "Dentist At Door",
  parentBrand: "Doctors At Door",
  partner: "Vishnoi Dental Hospital",
  title: "Dentist At Door | Dental Enquiry at Ease",
  description:
    "Dental enquiry at ease. Send a Ping and the Vishnoi Dental Hospital coordination team will contact you to understand your dental concern and help with the next step.",
  url: resolveSiteUrl(),
};

export const faqs = [
  {
    question: "Is my Ping a confirmed appointment?",
    answer:
      "No. A Ping sends your request to the Provider's team. They confirm availability, suitability, timing and applicable charges with you.",
  },
  {
    question: "What happens after I Ping?",
    answer:
      "Your request is reviewed and the coordination team contacts you to understand your requirement and coordinate the next step.",
  },
  {
    question: "Can every dental treatment be done at home?",
    answer:
      "Not necessarily. The appropriate next step depends on your dental concern, clinical assessment and the facilities required.",
  },
  {
    question: "Do I need DAD Reports to use Dentist At Door?",
    answer:
      "No. DAD Reports is not required to send a Ping or receive Dentist At Door services.",
  },
  {
    question: "When would I need DAD Reports?",
    answer:
      "If prescriptions, tests, reports or other eligible health documents become part of your care, DAD Reports can help keep them organised for future reference.",
  },
  {
    question: "How do reports reach DAD Reports?",
    answer:
      "There is no automatic transfer in the current journey. After you receive an eligible digital report or document, you can upload it to DAD Reports and organise it in your health timeline.",
  },
];
