// State and union territory names: https://www.india.gov.in/directory/web-directory/state-uts
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

export type IndianState = typeof INDIAN_STATES[number];
export const OUTSIDE_SERVICE_MESSAGE = "Please enter an address in India. Enquiries are currently limited to India.";
export const MAPS_UNAVAILABLE_MESSAGE = "Smart address lookup is temporarily unavailable. You can still enter your Indian address below.";

export function isIndianPincode(value: string) {
  return /^[1-9]\d{5}$/.test(value.trim());
}

export function isIndianState(value: string): value is IndianState {
  return INDIAN_STATES.some((state) => state === value);
}

export function normalizeIndianState(value: string) {
  const key = value.trim().toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");
  const aliases: Record<string, IndianState> = {
    "nct of delhi": "Delhi", "national capital territory of delhi": "Delhi", "new delhi": "Delhi",
    "orissa": "Odisha", "uttaranchal": "Uttarakhand", "pondicherry": "Puducherry",
    "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "andaman and nicobar": "Andaman and Nicobar Islands",
  };
  return INDIAN_STATES.find((state) => state.toLowerCase() === key) || aliases[key] || "";
}

export function buildGoogleMapsLocationUrl({
  latitude,
  longitude,
  address,
  placeId,
}: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  placeId?: string;
}) {
  const coordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${latitude},${longitude}`
    : "";
  const query = coordinates || address?.trim() || "India";
  const parameters = new URLSearchParams({ api: "1", query });
  if (placeId) parameters.set("query_place_id", placeId);
  return `https://www.google.com/maps/search/?${parameters.toString()}`;
}
