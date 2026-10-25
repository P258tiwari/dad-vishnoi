import { hasConsultationAccess } from "@/lib/consultation-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasBotSession } from "@/lib/bot-protection";
import { boundedRequest } from "@/lib/bounded-request";
import { NextRequest, NextResponse } from "next/server";
import { isTrustedMutation } from "@/lib/request-security";
import { siteConfig } from "@/lib/site";
import {
  buildGoogleMapsLocationUrl,
  normalizeIndianState,
  MAPS_UNAVAILABLE_MESSAGE,
  OUTSIDE_SERVICE_MESSAGE,
} from "@/lib/service-area";

export const runtime = "nodejs";

type AddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
};

type GooglePlace = {
  id?: string;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: AddressComponent[];
};

type OpenStreetMapAddress = {
  city?: string;
  town?: string;
  municipality?: string;
  village?: string;
  city_district?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
};

type OpenStreetMapPlace = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: OpenStreetMapAddress;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_LOCATION_REQUESTS = 80;
const reverseLocationCache = new Map<string, { expiresAt: number; result: ReturnType<typeof openStreetMapLocationResponse> }>();
const REVERSE_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_REVERSE_CACHE_ENTRIES = 500;
let nextOpenStreetMapRequestAt = 0;

function allowLocationRequest(ip: string) {
  return checkRateLimit(`location:${ip}`, MAX_LOCATION_REQUESTS, WINDOW_MS);
}

function componentValue(components: AddressComponent[] | undefined, type: string) {
  const component = components?.find((item) => item.types.includes(type));
  return component?.longText || component?.shortText || "";
}

function locationResponse(place: GooglePlace) {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const pincode = componentValue(place.addressComponents, "postal_code");
  const countryCode = place.addressComponents?.find((item) => item.types.includes("country"))?.shortText?.toUpperCase() || "";
  const eligible = countryCode === "IN";
  const address = place.formattedAddress?.trim() || "";
  const mapUrl = buildGoogleMapsLocationUrl({ latitude, longitude, address, placeId: place.id });

  return {
    ok: true,
    address,
    city: componentValue(place.addressComponents, "locality") || componentValue(place.addressComponents, "postal_town") || componentValue(place.addressComponents, "administrative_area_level_3"),
    state: normalizeIndianState(componentValue(place.addressComponents, "administrative_area_level_1")),
    countryCode,
    pincode,
    latitude,
    longitude,
    placeId: place.id || "",
    mapUrl,
    provider: "google" as const,
    eligible,
    message: eligible ? "Address found in India. Review the details below." : OUTSIDE_SERVICE_MESSAGE,
  };
}

function openStreetMapLocationResponse(place: OpenStreetMapPlace, latitude: number, longitude: number) {
  const pincode = place.address?.postcode?.trim() || "";
  const countryCode = place.address?.country_code?.toUpperCase() || "";
  const eligible = countryCode === "IN";
  const address = place.display_name?.trim() || "";
  const city = place.address?.city
    || place.address?.town
    || place.address?.municipality
    || place.address?.village
    || place.address?.city_district
    || place.address?.suburb
    || "";

  return {
    ok: true,
    address,
    city,
    state: normalizeIndianState(place.address?.state || ""),
    countryCode,
    pincode,
    latitude: Number(place.lat) || latitude,
    longitude: Number(place.lon) || longitude,
    placeId: "",
    mapUrl: buildGoogleMapsLocationUrl({ latitude, longitude, address }),
    provider: "openstreetmap" as const,
    eligible,
    message: eligible ? "Address found from your current location. Review the details below." : OUTSIDE_SERVICE_MESSAGE,
  };
}

async function openStreetMapReverse(latitude: number, longitude: number) {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = reverseLocationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const scheduledAt = Math.max(Date.now(), nextOpenStreetMapRequestAt);
  const waitMs = scheduledAt - Date.now();
  nextOpenStreetMapRequestAt = scheduledAt + 1_100;
  if (waitMs > 3_000) throw new Error("Reverse geocoder is busy.");
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

  const endpoint = new URL(process.env.REVERSE_GEOCODER_URL || "https://nominatim.openstreetmap.org/reverse");
  endpoint.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
    addressdetails: "1",
    layer: "address",
    "accept-language": "en",
  }).toString();
  const contact = process.env.PRIVACY_CONTACT_EMAIL || "dadclinik@gmail.com";
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      Referer: siteConfig.url,
      "User-Agent": `DentistAtDoor/1.0 (${siteConfig.url}; ${contact})`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Reverse geocoder request failed.");
  const place = await response.json() as OpenStreetMapPlace;
  if (!place.display_name) throw new Error("Reverse geocoder returned no address.");
  const result = openStreetMapLocationResponse(place, latitude, longitude);
  if (reverseLocationCache.size >= MAX_REVERSE_CACHE_ENTRIES) {
    const oldestKey = reverseLocationCache.keys().next().value;
    if (oldestKey) reverseLocationCache.delete(oldestKey);
  }
  reverseLocationCache.set(cacheKey, { expiresAt: Date.now() + REVERSE_CACHE_MS, result });
  return result;
}

async function googleRequest(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const detail = await response.text().then((value) => value.slice(0, 300)).catch(() => "Unavailable");
    console.error(`[Dentist At Door] Google Maps request failed (${response.status}): ${detail}`);
    throw new Error("Google Maps request failed.");
  }
  return response;
}

export async function POST(request: NextRequest) {
  if (!(await hasConsultationAccess(request))) return NextResponse.json({ ok: false, message: "Please return from the payment page to open the details form." }, { status: 402 });
  if (!hasBotSession(request)) return NextResponse.json({ ok: false, message: "Please complete the security check and try again." }, { status: 403 });
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ ok: false, message: MAPS_UNAVAILABLE_MESSAGE }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowLocationRequest(ip)) {
    return NextResponse.json(
      { ok: false, message: "Too many address searches. Please wait a few minutes or enter the address manually." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await (await boundedRequest(request, 8192)).json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: MAPS_UNAVAILABLE_MESSAGE }, { status: 400 });
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    if (body.action === "autocomplete") {
      if (!apiKey) return NextResponse.json({ ok: false, code: "MAPS_NOT_CONFIGURED", message: MAPS_UNAVAILABLE_MESSAGE }, { status: 503 });
      const input = typeof body.input === "string" ? body.input.replace(/[<>]/g, "").trim().slice(0, 140) : "";
      const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken.slice(0, 100) : undefined;
      if (input.length < 3) return NextResponse.json({ ok: true, suggestions: [] });

      const response = await googleRequest("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["in"],
          languageCode: "en",
          regionCode: "in",
          ...(sessionToken ? { sessionToken } : {}),
        }),
      });
      const data = await response.json() as {
        suggestions?: Array<{
          placePrediction?: {
            placeId?: string;
            text?: { text?: string };
            structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
          };
        }>;
      };
      const suggestions = (data.suggestions || []).flatMap((item) => {
        const prediction = item.placePrediction;
        if (!prediction?.placeId || !prediction.text?.text) return [];
        return [{
          placeId: prediction.placeId,
          text: prediction.text.text,
          mainText: prediction.structuredFormat?.mainText?.text || prediction.text.text,
          secondaryText: prediction.structuredFormat?.secondaryText?.text || "India",
        }];
      }).slice(0, 5);
      return NextResponse.json({ ok: true, suggestions });
    }

    if (body.action === "details") {
      if (!apiKey) return NextResponse.json({ ok: false, code: "MAPS_NOT_CONFIGURED", message: MAPS_UNAVAILABLE_MESSAGE }, { status: 503 });
      const placeId = typeof body.placeId === "string" && /^[A-Za-z0-9_-]{8,300}$/.test(body.placeId) ? body.placeId : "";
      const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken.slice(0, 100) : "";
      if (!placeId) return NextResponse.json({ ok: false, message: "Choose an address from the suggestions." }, { status: 400 });
      const parameters = new URLSearchParams({ languageCode: "en", regionCode: "in" });
      if (sessionToken) parameters.set("sessionToken", sessionToken);
      const response = await googleRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${parameters}`, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location",
        },
      });
      return NextResponse.json(locationResponse(await response.json() as GooglePlace));
    }

    if (body.action === "reverse") {
      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return NextResponse.json({ ok: false, message: "We couldn’t read that location. Please try again." }, { status: 400 });
      }
      if (apiKey) {
        try {
          const parameters = new URLSearchParams({
            latlng: `${latitude},${longitude}`,
            language: "en",
            region: "in",
            key: apiKey,
          });
          const response = await googleRequest(`https://maps.googleapis.com/maps/api/geocode/json?${parameters}`, { method: "GET" });
          const data = await response.json() as {
            results?: Array<{
              place_id?: string;
              formatted_address?: string;
              address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
              geometry?: { location?: { lat?: number; lng?: number } };
            }>;
          };
          const result = data.results?.find((item) => item.address_components?.some((component) => component.types.includes("postal_code"))) || data.results?.[0];
          if (result) {
            const place: GooglePlace = {
              id: result.place_id,
              formattedAddress: result.formatted_address,
              location: {
                latitude: result.geometry?.location?.lat ?? latitude,
                longitude: result.geometry?.location?.lng ?? longitude,
              },
              addressComponents: result.address_components?.map((component) => ({
                longText: component.long_name,
                shortText: component.short_name,
                types: component.types,
              })),
            };
            return NextResponse.json(locationResponse(place));
          }
        } catch {
          // The current-location button can still autofill through the fallback below.
        }
      }
      return NextResponse.json(await openStreetMapReverse(latitude, longitude));
    }

    return NextResponse.json({ ok: false, message: MAPS_UNAVAILABLE_MESSAGE }, { status: 400 });
  } catch {
    const message = body.action === "reverse"
      ? "We couldn’t fill the address from your current location. Please try again or enter it below."
      : MAPS_UNAVAILABLE_MESSAGE;
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
