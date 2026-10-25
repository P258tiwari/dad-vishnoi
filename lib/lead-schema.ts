import { z } from "zod";
import { isIndianPincode, isIndianState, OUTSIDE_SERVICE_MESSAGE, type IndianState } from "./service-area";

const stripUnsafe = (value: string) =>
  value.replace(/[<>]/g, "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

export const normalizeIndianPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
};

const phoneSchema = z.string().trim().refine((value) => normalizeIndianPhone(value) !== null, {
  message: "Enter a valid 10-digit Indian mobile number.",
});

export const leadInputSchema = z.object({
  fullName: z.string().transform(stripUnsafe).pipe(z.string().min(2, "Enter your full name.").max(100)),
  phone: phoneSchema,
  whatsapp: phoneSchema,
  address: z.string().transform(stripUnsafe).pipe(z.string().min(8, "Please enter a complete address.").max(500)),
  city: z.string().transform(stripUnsafe).pipe(z.string().min(2, "Enter your city.").max(80)),
  state: z.string().transform(stripUnsafe).refine(isIndianState, "Select a state or union territory in India."),
  country: z.literal("IN", { error: OUTSIDE_SERVICE_MESSAGE }),
  landmark: z.string().transform(stripUnsafe).pipe(z.string().max(120)).optional().default(""),
  pincode: z.string()
    .transform(stripUnsafe)
    .pipe(z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode."))
    .refine(isIndianPincode, "Enter a valid 6-digit Indian pincode."),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  placeId: z.string().regex(/^[A-Za-z0-9_-]{8,300}$/).optional().or(z.literal("")),
  addressSource: z.enum(["manual", "current_location", "google_search"]).optional().default("manual"),
  concern: z.string().transform(stripUnsafe).pipe(z.string().max(1200, "Keep the concern under 1200 characters.")).optional().default(""),
  transcript: z.string().transform(stripUnsafe).pipe(z.string().max(5000, "Keep the transcript under 5000 characters.")).optional().default(""),
  summaryEnglish: z.string().transform(stripUnsafe).pipe(z.string().max(1200)).optional().default(""),
  summaryHindi: z.string().transform(stripUnsafe).pipe(z.string().max(1200)).optional().default(""),
  consent: z.boolean().refine(Boolean, "Consent is required so the team can contact you."),
  website: z.string().max(200).optional().default(""),
  startedAt: z.number().int().positive(),
  pageUrl: z.string().url().max(500).optional(),
}).superRefine((value, context) => {
  const hasLatitude = typeof value.latitude === "number";
  const hasLongitude = typeof value.longitude === "number";
  if (hasLatitude !== hasLongitude) {
    context.addIssue({ code: "custom", path: ["address"], message: "Please capture the location again or enter the address manually." });
  }
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export type DentalLead = {
  leadId: string;
  createdAt: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: IndianState;
  country: "India";
  consent: boolean;
  landmark?: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  addressSource: "manual" | "current_location" | "google_search";
  mapUrl: string;
  concern?: string;
  transcript?: string;
  summaryEnglish?: string;
  summaryHindi?: string;
  source: "Website - Dentist At Door";
  pageUrl: string;
  status: "Active";
};
