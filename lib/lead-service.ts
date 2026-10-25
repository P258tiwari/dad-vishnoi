import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { DentalLead, LeadInput } from "./lead-schema";
import { normalizeIndianPhone } from "./lead-schema";
import { siteConfig } from "./site";
import { buildGoogleMapsLocationUrl } from "./service-area";

const TIMEZONE = "Asia/Kolkata";

function indiaDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const time = `${value("hour")}:${value("minute")}:${value("second")}`;
  return { date, time, compactDate: date.replaceAll("-", "") };
}

export function createLead(input: LeadInput): DentalLead {
  const now = new Date();
  const { date, time, compactDate } = indiaDateParts(now);
  const suffix = randomBytes(3).toString("hex").toUpperCase();

  return {
    leadId: `DAD-DENT-${compactDate}-${suffix}`,
    createdAt: now.toISOString(),
    date,
    time,
    name: input.fullName,
    phone: normalizeIndianPhone(input.phone)!,
    whatsapp: normalizeIndianPhone(input.whatsapp)!,
    address: input.address,
    city: input.city,
    state: input.state,
    country: "India",
    consent: input.consent,
    landmark: input.landmark || undefined,
    pincode: input.pincode,
    latitude: input.latitude ?? undefined,
    longitude: input.longitude ?? undefined,
    placeId: input.placeId || undefined,
    addressSource: input.addressSource,
    mapUrl: buildGoogleMapsLocationUrl({
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      placeId: input.placeId,
    }),
    concern: input.concern || undefined,
    transcript: input.transcript || undefined,
    summaryEnglish: input.summaryEnglish || undefined,
    summaryHindi: input.summaryHindi || undefined,
    source: "Website - Dentist At Door",
    pageUrl: input.pageUrl || siteConfig.url,
    status: "Active",
  };
}

export function submissionFingerprint(ip: string, input: LeadInput) {
  return createHash("sha256")
    .update(`${ip}:${normalizeIndianPhone(input.phone)}:${input.address.toLowerCase()}`)
    .digest("hex");
}
