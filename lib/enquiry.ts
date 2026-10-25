export const enquiryStatuses = ["Active", "Contacted", "Scheduled", "Served", "Closed"] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

export type EnquiryFile = {
  name: string;
  url: string;
  type: string;
};

export type DashboardEnquiry = {
  pageId: string;
  notionUrl: string;
  leadId: string;
  status: EnquiryStatus;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  country: string;
  addressSource: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
  consent: boolean;
  landmark: string;
  pincode: string;
  mapUrl: string;
  concern: string;
  transcript: string;
  summaryEnglish: string;
  summaryHindi: string;
  source: string;
  pageUrl: string;
  submittedAt: string;
  attachmentCount: number;
  attachments: EnquiryFile[];
};
