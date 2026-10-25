"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, ChevronDown, Crosshair, ExternalLink, FileImage, FileText, FileVideo, Languages, LoaderCircle, MapPin, Mic, Paperclip, Search, Sparkles, Square, Trash2, Upload, UserRound, X } from "lucide-react";
import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { leadInputSchema, normalizeIndianPhone } from "@/lib/lead-schema";
import {
  buildGoogleMapsLocationUrl,
  isIndianPincode,
  isIndianState,
  INDIAN_STATES,
  normalizeIndianState,
  MAPS_UNAVAILABLE_MESSAGE,
  OUTSIDE_SERVICE_MESSAGE,
} from "@/lib/service-area";

type PingContextValue = { openPing: (source?: string) => void };
const PingContext = createContext<PingContextValue | null>(null);
const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
const campaignStorageKey = "dad_ping_campaign";

function rememberCampaignParameters() {
  try {
    const current = new URLSearchParams(window.location.search);
    const campaign = new URLSearchParams();
    campaignKeys.forEach((key) => {
      const value = current.get(key);
      if (value) campaign.set(key, value.slice(0, 200));
    });
    if (campaign.size) sessionStorage.setItem(campaignStorageKey, campaign.toString());
  } catch {
    // Attribution is best-effort; the form remains fully usable without storage access.
  }
}

function pageUrlWithCampaignAttribution() {
  const url = new URL(window.location.href);
  try {
    const saved = new URLSearchParams(sessionStorage.getItem(campaignStorageKey) || "");
    saved.forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
  } catch {
    // Keep the current URL when browser storage is unavailable.
  }
  for (const key of [...campaignKeys].reverse()) {
    if (url.toString().length <= 500) break;
    url.searchParams.delete(key);
  }
  return url.toString().length <= 500 ? url.toString() : `${url.origin}${url.pathname}`;
}

export function usePing() {
  const value = useContext(PingContext);
  if (!value) throw new Error("usePing must be used inside PingProvider");
  return value;
}

export function PingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    rememberCampaignParameters();
  }, []);

  const openPing = useCallback((triggerSource = "unknown") => {
    trackEvent("ping_cta_click", { source: triggerSource });
    router.push("/ping");
  }, [router]);

  return (
    <PingContext.Provider value={{ openPing }}>
      {children}
    </PingContext.Provider>
  );
}

export function PingButton({
  children = "Ping",
  source = "unknown",
  className = "",
}: {
  children?: ReactNode;
  source?: string;
  className?: string;
}) {
  const { openPing } = usePing();
  return (
    <button type="button" className={`ping-button ${className}`} onClick={() => openPing(source)}>
      <span className="ping-dot" aria-hidden="true" />
      {children}
    </button>
  );
}

type FormValues = {
  fullName: string;
  phone: string;
  whatsapp: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  country: "IN";
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
  addressSource: "manual" | "current_location" | "google_search";
  concern: string;
  transcript: string;
  consent: boolean;
  website: string;
};

const initialValues: FormValues = {
  fullName: "",
  phone: "",
  whatsapp: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "IN",
  pincode: "",
  latitude: null,
  longitude: null,
  placeId: "",
  addressSource: "manual",
  concern: "",
  transcript: "",
  consent: false,
  website: "",
};

type AddressSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

type LocationResult = {
  ok?: boolean;
  address?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  mapUrl?: string;
  provider?: "google" | "openstreetmap";
  eligible?: boolean;
  message?: string;
  suggestions?: AddressSuggestion[];
};

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCompleteAddress(values: FormValues) {
  const addressLower = values.address.toLowerCase();
  return [
    values.address,
    values.addressLine2,
    values.city.trim() && addressLower.includes(values.city.trim().toLowerCase()) ? "" : values.city,
    addressLower.includes(values.state.toLowerCase()) ? "" : values.state,
    values.address.includes(values.pincode) ? "" : values.pincode,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function fileTypeIcon(file: File) {
  if (file.type.startsWith("image/")) return <FileImage size={16} />;
  if (file.type.startsWith("video/")) return <FileVideo size={16} />;
  if (file.type.startsWith("audio/")) return <Mic size={16} />;
  return <FileText size={16} />;
}

export function PingPageForm() {
  const titleId = useId();
  const router = useRouter();
  return <div className="ping-page-panel"><LeadForm titleId={titleId} source="manual_payment_review" onDone={() => router.push("/")} onSubmittingChange={() => {}} /></div>;
}

function LeadForm({
  titleId,
  source,
  onDone,
  onSubmittingChange,
}: {
  titleId: string;
  source: string;
  onDone: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [sameNumber, setSameNumber] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [serverError, setServerError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [duplicateSubmission, setDuplicateSubmission] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showAddressLine2, setShowAddressLine2] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "searching" | "selected" | "partial" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [locationProvider, setLocationProvider] = useState<"google" | "openstreetmap" | "">("");
  const [selectingPlaceId, setSelectingPlaceId] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "recording" | "processing" | "ready" | "error">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);
  const [summaryEnglish, setSummaryEnglish] = useState("");
  const [summaryHindi, setSummaryHindi] = useState("");
  const [summaryLanguage, setSummaryLanguage] = useState<"en" | "hi">("en");
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [summaryError, setSummaryError] = useState("");
  const [startedAt] = useState(() => Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const startedTracking = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSearchSequence = useRef(0);
  const mapsSessionToken = useRef("");

  useEffect(() => () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const panel = formRef.current?.closest<HTMLElement>(".modal-panel");
    if (panel) panel.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    if (step !== 2 || addressQuery.trim().length < 3) {
      return;
    }
    const sequence = ++locationSearchSequence.current;
    const timer = window.setTimeout(async () => {
      setLocationStatus("searching");
      setLocationMessage("Finding addresses in India…");
      try {
        if (!mapsSessionToken.current) {
          mapsSessionToken.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        const response = await fetchWithTimeout("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "autocomplete", input: addressQuery, sessionToken: mapsSessionToken.current }),
        }, 15_000);
        const result = await response.json() as LocationResult;
        if (sequence !== locationSearchSequence.current) return;
        if (!response.ok || !result.ok) throw new Error(result.message || MAPS_UNAVAILABLE_MESSAGE);
        setAddressSuggestions(result.suggestions || []);
        setLocationStatus("idle");
        setLocationMessage(result.suggestions?.length ? "Choose the closest match." : "No match yet. Try your area, street or landmark.");
      } catch (error) {
        if (sequence !== locationSearchSequence.current) return;
        setAddressSuggestions([]);
        setLocationStatus("error");
        setLocationMessage(error instanceof Error ? error.message : MAPS_UNAVAILABLE_MESSAGE);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [addressQuery, step]);

  const update = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => {
      const next = { ...current, [field]: value } as FormValues;
      if (field === "phone" && sameNumber) next.whatsapp = String(value);
      if (["address", "city", "state"].includes(field)) {
        next.latitude = null; next.longitude = null; next.placeId = ""; next.addressSource = "manual";
      }
      return next;
    });
    setErrors((current) => field === "phone" && sameNumber
      ? { ...current, phone: "", whatsapp: "" }
      : { ...current, [field]: "" });
  };

  const applyLocationResult = (result: LocationResult, addressSource: FormValues["addressSource"]) => {
    setLocationProvider(result.provider || "google");
    if (!result.eligible || result.countryCode !== "IN") {
      const message = result.message || OUTSIDE_SERVICE_MESSAGE;
      setLocationStatus("error");
      setLocationMessage(message);
      setErrors((current) => ({ ...current, address: message }));
      setValues((current) => ({ ...current, address: "", city: "", state: "", pincode: "", latitude: null, longitude: null, placeId: "", addressSource: "manual" }));
      trackEvent("ping_location_outside_service_area", { source, pincode: result.pincode || "unknown" });
      return;
    }

    setValues((current) => ({
      ...current,
      address: result.address || current.address,
      city: result.city || "",
      state: normalizeIndianState(result.state || ""),
      pincode: result.pincode || "",
      latitude: typeof result.latitude === "number" ? result.latitude : current.latitude,
      longitude: typeof result.longitude === "number" ? result.longitude : current.longitude,
      placeId: result.placeId || "",
      addressSource,
    }));
    setErrors((current) => ({ ...current, address: "", city: "", state: "", pincode: "" }));
    setAddressSuggestions([]);
    setShowAddressLine2(true);
    setLocationStatus("selected");
    setLocationMessage("Location pinned. Add a house or flat detail only if needed.");
  };

  const useCurrentLocation = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationMessage("Current location is not supported by this browser. Search or enter your address below.");
      return;
    }
    setLocationStatus("locating");
    setLocationMessage("Getting your current location…");
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      try {
        const response = await fetchWithTimeout("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reverse", latitude, longitude }),
        }, 15_000);
        const result = await response.json() as LocationResult;
        if (!response.ok || !result.ok) throw new Error(result.message || MAPS_UNAVAILABLE_MESSAGE);
        applyLocationResult(result, "current_location");
        if (result.eligible) trackEvent("ping_location_current_success", { source });
      } catch (error) {
        setLocationStatus("partial");
        setLocationMessage("We couldn?t confirm your location. Enter your Indian address, state and pincode below.");
        trackEvent("ping_location_reverse_lookup_error", { source, reason: error instanceof Error ? "lookup_failed" : "unknown" });
      }
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was not allowed. Search or enter your Indian address below."
        : "We couldn’t get your current location. Search or enter your Indian address below.";
      setLocationStatus("error");
      setLocationMessage(message);
      trackEvent("ping_location_current_error", { source, reason: error.code });
    }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 });
  };

  const selectAddressSuggestion = async (suggestion: AddressSuggestion) => {
    setSelectingPlaceId(suggestion.placeId);
    setLocationStatus("searching");
    setLocationMessage("Pinning that address…");
    try {
      const response = await fetchWithTimeout("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "details", placeId: suggestion.placeId, sessionToken: mapsSessionToken.current }),
      }, 15_000);
      const result = await response.json() as LocationResult;
      if (!response.ok || !result.ok) throw new Error(result.message || MAPS_UNAVAILABLE_MESSAGE);
      applyLocationResult(result, "google_search");
      if (result.eligible) {
        setAddressQuery(result.address || suggestion.text);
        mapsSessionToken.current = "";
        trackEvent("ping_location_search_success", { source });
      }
    } catch (error) {
      setLocationStatus("error");
      setLocationMessage(error instanceof Error ? error.message : MAPS_UNAVAILABLE_MESSAGE);
    } finally {
      setSelectingPlaceId("");
    }
  };

  const updatePincode = (value: string) => {
    const pincode = value.replace(/\D/g, "").slice(0, 6);
    setValues((current) => ({ ...current, pincode, latitude: null, longitude: null, placeId: "", addressSource: "manual" }));
    setErrors((current) => ({
      ...current,
      pincode: pincode.length === 6 && !isIndianPincode(pincode) ? "Enter a valid 6-digit Indian pincode." : "",
    }));
  };

  const markStarted = () => {
    if (!startedTracking.current) {
      startedTracking.current = true;
      trackEvent("ping_form_start", { source });
    }
  };

  const focusField = (field: string) => {
    window.setTimeout(() => document.getElementById(`field-${field}`)?.focus(), 25);
  };

  const focusFirstError = (nextErrors: Record<string, string>) => {
    const firstError = Object.keys(nextErrors)[0];
    if (!firstError) return;
    if (["fullName", "phone", "whatsapp"].includes(firstError)) setStep(1);
    else if (["address", "city", "state", "pincode"].includes(firstError)) setStep(2);
    else setStep(3);
    focusField(firstError);
  };

  const validateCurrentStep = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 1) {
      if (values.fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
      if (!normalizeIndianPhone(values.phone)) nextErrors.phone = "Enter a valid 10-digit Indian mobile number.";
      if (!normalizeIndianPhone(values.whatsapp)) nextErrors.whatsapp = "Enter a valid 10-digit Indian mobile number.";
    }
    if (step === 2) {
      if (values.address.trim().length < 5) nextErrors.address = "Enter address line 1.";
      if (values.city.trim().length < 2) nextErrors.city = "Enter your city.";
      if (!/^\d{6}$/.test(values.pincode)) nextErrors.pincode = "Enter a valid 6-digit pincode.";
      else if (!isIndianPincode(values.pincode)) nextErrors.pincode = "Enter a valid 6-digit Indian pincode.";
      if (!isIndianState(values.state)) nextErrors.state = "Select your state or union territory.";
    }
    if (step === 3 && !values.consent) nextErrors.consent = "Consent is required so the team can contact you.";

    setErrors((current) => ({ ...current, ...nextErrors }));
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      focusField(firstError);
      return false;
    }
    return true;
  };

  const continueToNextStep = () => {
    setServerError("");
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(3, current + 1) as 1 | 2 | 3);
  };

  const addFiles = (incoming: File[], replaceVoiceNote = false) => {
    setAttachmentError("");
    setAttachments((current) => {
      const supported = incoming.filter((file) =>
        file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/") || file.type === "application/pdf",
      );
      if (supported.length !== incoming.length) {
        setAttachmentError("Use images, PDF or video files only.");
        return current;
      }
      const existing = replaceVoiceNote ? current.filter((file) => !file.type.startsWith("audio/")) : current;
      const next = [...existing, ...supported];
      if (next.length > 8) {
        setAttachmentError("You can add up to 8 files.");
        return current;
      }
      if (supported.some((file) => file.size <= 0 || file.size > 15 * 1024 * 1024)) {
        setAttachmentError("Each file must be under 15 MB.");
        return current;
      }
      if (next.reduce((total, file) => total + file.size, 0) > 30 * 1024 * 1024) {
        setAttachmentError("Keep all files together under 30 MB.");
        return current;
      }
      return next;
    });
  };

  const transcribeRecording = async (audio: File) => {
    setRecordingStatus("processing");
    const formData = new FormData();
    formData.append("audio", audio, audio.name);
    try {
      const response = await fetchWithTimeout("/api/transcribe", { method: "POST", body: formData }, 75_000);
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        transcript?: string;
        summaryEnglish?: string;
        summaryHindi?: string;
      };
      if (!response.ok || !result.ok || !result.transcript || !result.summaryEnglish || !result.summaryHindi) {
        throw new Error(result.message || "AI summary is unavailable right now.");
      }
      setValues((current) => ({
        ...current,
        transcript: result.transcript!.slice(0, 5000),
      }));
      setTranscriptPreview(result.transcript);
      setTranscriptExpanded(true);
      setSummaryEnglish(result.summaryEnglish);
      setSummaryHindi(result.summaryHindi);
      setSummaryStatus("ready");
      setSummaryError("");
      setRecordingStatus("ready");
      trackEvent("voice_transcription_success", { source });
    } catch {
      setRecordingStatus("error");
      setSummaryStatus("idle");
      trackEvent("voice_transcription_error", { source });
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const startRecording = async () => {
    setAttachmentError("");
    if (attachments.length >= 8) {
      setAttachmentError("Remove one reference file before adding a voice note.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingStatus("error");
      setAttachmentError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      setValues((current) => ({ ...current, transcript: "" }));
      setTranscriptPreview("");
      setSummaryEnglish("");
      setSummaryHindi("");
      setSummaryStatus("idle");
      setSummaryError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      setRecordingStatus("recording");
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        const type = recorder.mimeType || preferredMime || "audio/webm";
        const extension = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(audioChunksRef.current, { type });
        if (!blob.size) {
          setRecordingStatus("error");
          setAttachmentError("No audio was captured. Please try again.");
          return;
        }
        const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type });
        addFiles([file], true);
        void transcribeRecording(file);
      };
      recorder.start(500);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) => {
          if (seconds >= 179) {
            stopRecording();
            return 180;
          }
          return seconds + 1;
        });
      }, 1000);
      trackEvent("voice_recording_start", { source });
    } catch {
      setRecordingStatus("error");
      setAttachmentError("Microphone access is needed to record your explanation.");
    }
  };

  const prepareSummary = async () => {
    setServerError("");
    setSummaryError("");
    if (!validateCurrentStep()) return;
    if (recordingStatus === "recording" || recordingStatus === "processing") {
      setSummaryError(recordingStatus === "recording" ? "Stop the recording before creating the summary." : "Please wait while your recording is transcribed.");
      return;
    }

    const concern = values.concern.trim();
    const transcript = values.transcript.trim();
    const hasUntranscribedAudio = attachments.some((file) => file.type.startsWith("audio/")) && !transcript;
    if (!concern && hasUntranscribedAudio) {
      setSummaryError("We couldn't transcribe that recording. Type a brief concern or record it again to create a summary.");
      return;
    }

    if (!concern && transcript && summaryEnglish && summaryHindi) {
      setSummaryLanguage("en");
      setSummaryStatus("ready");
      setStep(4);
      trackEvent("ping_summary_view", { source, input: "voice" });
      return;
    }

    if (!concern && !transcript) {
      setSummaryEnglish("I did not provide a dental concern.");
      setSummaryHindi("मैंने दाँतों से जुड़ी कोई समस्या नहीं बताई।");
      setSummaryLanguage("en");
      setSummaryStatus("ready");
      setStep(4);
      trackEvent("ping_summary_view", { source, input: "empty" });
      return;
    }

    setSummaryStatus("processing");
    try {
      const response = await fetchWithTimeout("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concern, transcript }),
      }, 60_000);
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        summaryEnglish?: string;
        summaryHindi?: string;
      };
      if (!response.ok || !result.ok || !result.summaryEnglish || !result.summaryHindi) {
        throw new Error(result.message || "We couldn't create the summary right now. Please try again.");
      }
      setSummaryEnglish(result.summaryEnglish);
      setSummaryHindi(result.summaryHindi);
      setSummaryLanguage("en");
      setSummaryStatus("ready");
      setStep(4);
      trackEvent("ping_summary_view", { source, input: concern && transcript ? "text_and_voice" : concern ? "text" : "voice" });
    } catch (error) {
      setSummaryStatus("error");
      setSummaryError(error instanceof Error ? error.message : "We couldn't create the summary right now. Please try again.");
      trackEvent("ping_summary_error", { source });
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    setServerError("");

    const completeAddress = formatCompleteAddress(values);
    const payload = { ...values, address: completeAddress, landmark: values.addressLine2, summaryEnglish, summaryHindi, startedAt, pageUrl: pageUrlWithCampaignAttribution() };
    const parsed = leadInputSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] || "form");
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }

    setStatus("submitting");
    onSubmittingChange(true);
    try {
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      attachments.forEach((file) => formData.append("files", file, file.name));
      const response = await fetchWithTimeout("/api/leads", { method: "POST", body: formData }, 90_000);
      const result = (await response.json()) as { ok?: boolean; message?: string; fields?: Record<string, string[]>; leadId?: string; duplicate?: boolean };
      if (!response.ok || !result.ok) {
        if (result.fields) {
          const nextErrors = Object.fromEntries(Object.entries(result.fields).map(([key, value]) => [key, value?.[0] || "Invalid value"]));
          setErrors(nextErrors);
          focusFirstError(nextErrors);
        }
        throw new Error(result.message || "We couldn't submit your request right now. Please try again.");
      }
      setRequestId(result.leadId || "");
      setDuplicateSubmission(Boolean(result.duplicate));
      setStatus("success");
      onSubmittingChange(false);
      trackEvent(result.duplicate ? "ping_submit_duplicate" : "ping_submit_success", { source });
    } catch (error) {
      setStatus("idle");
      onSubmittingChange(false);
      const message = !navigator.onLine
        ? "You appear to be offline. Check your connection and send your Ping again. Your details are still here."
        : error instanceof DOMException && error.name === "TimeoutError"
          ? "The request is taking longer than expected. Please try again; your details are still here."
          : error instanceof Error
            ? error.message
            : "We couldn't submit your request right now. Please try again.";
      setServerError(message);
      trackEvent("ping_submit_error", { source, reason: !navigator.onLine ? "offline" : "request_failed" });
    }
  }

  const selectedMapUrl = buildGoogleMapsLocationUrl({
    latitude: values.latitude,
    longitude: values.longitude,
    address: values.address,
    placeId: values.placeId,
  });
  const reviewAddress = formatCompleteAddress(values);
  const pincodeIsEligible = isIndianPincode(values.pincode);
  const canContinue = step === 1
    ? values.fullName.trim().length >= 2 && Boolean(normalizeIndianPhone(values.phone)) && Boolean(normalizeIndianPhone(values.whatsapp))
    : step === 2
      ? values.address.trim().length >= 5 && values.city.trim().length >= 2 && /^\d{6}$/.test(values.pincode) && pincodeIsEligible && isIndianState(values.state)
      : true;

  if (status === "success") {
    return (
      <div className="success-wrap" aria-live="polite">
        <div>
          <span className="success-icon"><Check size={30} aria-hidden="true" /></span>
          <h2 id={titleId} className="text-3xl font-extrabold tracking-[-0.04em]">Thank you! Ping received <span aria-hidden="true">✓</span></h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-ink-soft">
            Your request has been shared with the Vishnoi Dental Hospital coordination team. They will contact you to understand your requirement and coordinate the next step.
          </p>
          <p className="success-download-note">You don&apos;t need to download anything right now.</p>
          {requestId ? <p className="success-request-id"><span>Request reference</span><strong>{requestId}</strong></p> : null}
          {duplicateSubmission ? <p className="success-duplicate-note">A matching Ping was already received recently, so we did not create a second request.</p> : null}
          <div className="success-next" aria-label="What happens next">
            <b>What happens next?</b>
            <ol>
              <li>Request reviewed</li>
              <li>Hospital team contacts you</li>
              <li>Next step confirmed</li>
            </ol>
          </div>
          <button type="button" className="ping-button mt-7 min-w-32" onClick={onDone}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        aria-label="Consultation details"
        ref={formRef}
        className="form-grid step-form"
        onSubmit={(event) => {
          if (step < 4) {
            event.preventDefault();
            if (step < 3) continueToNextStep();
            else void prepareSummary();
            return;
          }
          submit(event);
        }}
        onFocus={markStarted}
        noValidate
      >
        <ol className="ping-stepper" aria-label={`Consultation progress: step ${step} of 4`}>
          {[
            { label: "Details", hint: "About you" },
            { label: "Address", hint: "Your location" },
            { label: "Concern", hint: "How we can help" },
            { label: "Review", hint: "Check & submit" },
          ].map(({ label, hint }, index) => {
            const itemStep = (index + 1) as 1 | 2 | 3 | 4;
            return (
              <li key={label} className={step === itemStep ? "is-current" : step > itemStep ? "is-complete" : "is-upcoming"} aria-current={step === itemStep ? "step" : undefined}>
                <span className="ping-step-number" aria-hidden="true">{step > itemStep ? <Check size={16} strokeWidth={3} /> : `0${itemStep}`}</span>
                <div className="ping-step-copy"><strong>{label}</strong><span>{hint}</span></div>
                <span className="sr-only">{step > itemStep ? "Completed" : step === itemStep ? "Current step" : "Upcoming"}</span>
              </li>
            );
          })}
        </ol>

        <div className="step-heading" aria-live="polite">
          <span>Step {step} of 4</span>
          <h3>{step === 1 ? "Your details" : step === 2 ? "Your address in India" : step === 3 ? "How can we help?" : "Review your concern"}</h3>
        </div>

        {step === 1 ? (
          <div className="step-fields">
            <Field label="Full name" name="fullName" value={values.fullName} error={errors.fullName} onChange={(value) => update("fullName", value)} autoComplete="name" placeholder="Your name" />
            <div className="contact-number-grid">
              <Field label="Phone number" name="phone" value={values.phone} error={errors.phone} onChange={(value) => update("phone", value)} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" />
              <Field
                label="WhatsApp number"
                labelExtra={(
                  <label className="field-label-check">
                    <input
                      type="checkbox"
                      checked={sameNumber}
                      onChange={(event) => {
                        setSameNumber(event.target.checked);
                        if (event.target.checked) update("whatsapp", values.phone);
                      }}
                    />
                    <span>Same as phone</span>
                  </label>
                )}
                name="whatsapp"
                value={values.whatsapp}
                error={errors.whatsapp}
                onChange={(value) => update("whatsapp", value)}
                inputMode="tel"
                autoComplete="tel"
                disabled={sameNumber}
                placeholder="10-digit WhatsApp number"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="step-fields">
            <div className="location-capture-card">
              <div className="address-search-wrap">
                <label htmlFor="field-address-search">Find your address</label>
                <div className="address-search-input">
                  <Search size={17} aria-hidden="true" />
                  <input
                    id="field-address-search"
                    type="search"
                    value={addressQuery}
                    onChange={(event) => {
                      const query = event.target.value;
                      setAddressQuery(query);
                      if (query.trim().length < 3) {
                        setAddressSuggestions([]);
                        setLocationMessage("");
                        if (locationStatus === "searching" || locationStatus === "error") setLocationStatus("idle");
                      }
                    }}
                    autoComplete="off"
                    placeholder="Search area, street or landmark"
                  />
                  {locationStatus === "searching" ? <LoaderCircle className="animate-spin" size={17} aria-label="Searching" /> : null}
                  <button type="button" className="use-location-inline" onClick={useCurrentLocation} disabled={locationStatus === "locating"}>
                    {locationStatus === "locating" ? <LoaderCircle className="animate-spin" size={16} /> : <Crosshair size={16} />}
                    <span>{locationStatus === "locating" ? "Locating…" : "Current location"}</span>
                  </button>
                </div>
                {addressSuggestions.length ? (
                  <div className="address-suggestions" role="listbox" aria-label="Suggested addresses in India">
                    {addressSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        key={suggestion.placeId}
                        onClick={() => void selectAddressSuggestion(suggestion)}
                        disabled={Boolean(selectingPlaceId)}
                      >
                        <MapPin size={16} aria-hidden="true" />
                        <span><b>{suggestion.mainText}</b><small>{suggestion.secondaryText}</small></span>
                        {selectingPlaceId === suggestion.placeId ? <LoaderCircle className="animate-spin" size={16} /> : null}
                      </button>
                    ))}
                    <small className="google-attribution">Powered by Google</small>
                  </div>
                ) : null}
              </div>

              {locationMessage ? (
                <div className={`location-feedback is-${locationStatus}`} role={locationStatus === "error" ? "alert" : "status"} aria-live="polite">
                  {locationStatus === "selected" ? <CheckCircle2 size={17} /> : locationStatus === "locating" || locationStatus === "searching" ? <LoaderCircle className="animate-spin" size={17} /> : <MapPin size={17} />}
                  <span>{locationMessage}</span>
                </div>
              ) : null}

              {values.addressSource !== "manual" && (values.latitude !== null || values.address) ? (
                <a className="location-map-link" href={selectedMapUrl} target="_blank" rel="noreferrer">
                  <span><MapPin size={15} /> Location saved</span>
                  <b>View map <ExternalLink size={13} /></b>
                </a>
              ) : null}
              {locationProvider === "openstreetmap" ? (
                <a className="location-data-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Address data © OpenStreetMap contributors</a>
              ) : null}
            </div>

            <p className="address-country-note">Country: India</p>
            <Field label="Complete address" name="address" value={values.address} error={errors.address} onChange={(value) => update("address", value)} autoComplete="street-address" placeholder="House / flat, building, street or area" />
            {showAddressLine2 ? (
              <div className="optional-address-row">
                <Field label="Landmark or extra directions (optional)" name="addressLine2" value={values.addressLine2} error={errors.addressLine2} onChange={(value) => update("addressLine2", value)} autoComplete="address-line2" placeholder="Floor, gate, nearby landmark" />
                <button
                  type="button"
                  className="remove-address-line"
                  onClick={() => {
                    update("addressLine2", "");
                    setShowAddressLine2(false);
                  }}
                  aria-label="Remove address line 2"
                >
                  <X size={14} aria-hidden="true" /> Remove
                </button>
              </div>
            ) : (
              <button type="button" className="add-address-line" onClick={() => setShowAddressLine2(true)}>
                <span aria-hidden="true">+</span> Add landmark or directions
              </button>
            )}
            <div className="service-location-grid">
              <Field label="City" name="city" value={values.city} error={errors.city} onChange={(value) => update("city", value)} autoComplete="address-level2" placeholder="Your city" />
              <div className="field">
                <div className="field-label-row"><label htmlFor="field-state">State / Union territory</label></div>
                <select id="field-state" name="state" value={values.state} onChange={(event) => update("state", event.target.value)} autoComplete="address-level1" aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "error-state" : undefined} required>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
                {errors.state ? <p id="error-state" className="field-error" role="alert">{errors.state}</p> : null}
              </div>
              <Field label="Pincode" name="pincode" value={values.pincode} error={errors.pincode} showError={false} onChange={updatePincode} inputMode="numeric" autoComplete="postal-code" placeholder="6-digit pincode" />
            </div>
            {errors.pincode ? (
              <p id="error-pincode" className="service-location-message is-error" role="alert"><MapPin size={16} /> <span>{errors.pincode}</span></p>
            ) : pincodeIsEligible ? (
              <p className="service-location-message is-success"><CheckCircle2 size={16} /> <span>Indian pincode format accepted.</span></p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="step-fields">
            <Field
              label="Brief dental concern (optional)"
              labelExtra={(
                <button
                  type="button"
                  className={`brief-audio-button ${recordingStatus === "recording" ? "is-recording" : ""}`}
                  onClick={recordingStatus === "recording" ? stopRecording : startRecording}
                  disabled={recordingStatus === "processing"}
                  aria-label={recordingStatus === "recording" ? "Stop voice recording" : "Record a voice explanation"}
                >
                  {recordingStatus === "recording" ? <Square size={12} fill="currentColor" /> : recordingStatus === "processing" ? <LoaderCircle className="animate-spin" size={14} /> : <Mic size={14} />}
                  {recordingStatus === "recording" ? `Stop ${formatDuration(recordingSeconds)}` : recordingStatus === "processing" ? "Transcribing" : "Record audio"}
                </button>
              )}
              name="concern"
              value={values.concern}
              error={errors.concern}
              onChange={(value) => {
                update("concern", value);
                setSummaryEnglish("");
                setSummaryHindi("");
                setSummaryStatus("idle");
                setSummaryError("");
              }}
              textarea
              placeholder="Type briefly, or record in English, Hindi or Hinglish"
              maxLength={1200}
            />
            {recordingStatus === "ready" ? (
              <details
                className="transcript-card"
                open={transcriptExpanded}
                onToggle={(event) => setTranscriptExpanded(event.currentTarget.open)}
              >
                <summary>
                  <span className="transcript-card-icon" aria-hidden="true"><CheckCircle2 size={18} /></span>
                  <span className="transcript-card-title">
                    <b>Voice note understood</b>
                    <small>Transcript ready in Hindi and English</small>
                  </span>
                  <span className="transcript-card-toggle">Review <ChevronDown size={16} aria-hidden="true" /></span>
                </summary>
                <div className="transcript-card-body">
                  <div className="transcript-card-label">
                    <span>What we heard</span>
                    <span>हिंदी + English</span>
                  </div>
                  <p lang="hi" dir="ltr">{transcriptPreview}</p>
                  <div className="transcript-card-footer">
                    <span>Doesn&apos;t sound right?</span>
                    <button type="button" onClick={() => void startRecording()}><Mic size={15} aria-hidden="true" /> Record again</button>
                  </div>
                </div>
              </details>
            ) : recordingStatus === "error" ? (
              <p className="brief-ai-status">Audio is attached, but its transcript could not be created. Type a brief concern or record again.</p>
            ) : null}
            {summaryError ? <div className="form-error" role="alert">{summaryError}</div> : null}

            <details className="attachment-gallery">
              <summary>
                <span><Paperclip size={16} /> Reference files</span>
                <span className="attachment-count">{attachments.length ? `${attachments.length} added` : "Optional"} <ChevronDown size={15} /></span>
              </summary>
              <div className="attachment-gallery-body">
                <label className="attachment-upload">
                  <Upload size={17} />
                  <span>Add images, PDF or video</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm,video/quicktime"
                    onChange={(event) => {
                      addFiles(Array.from(event.target.files || []));
                      event.target.value = "";
                    }}
                  />
                </label>
                <p className="attachment-help">Up to 8 files, 15 MB each. Your voice note is included here automatically.</p>
                {attachmentError ? <p className="field-error" role="alert">{attachmentError}</p> : null}
                {attachments.length ? (
                  <div className="attachment-list">
                    {attachments.map((file, index) => (
                      <div className="attachment-item" key={`${file.name}-${file.lastModified}-${index}`}>
                        <span className="attachment-kind" aria-hidden="true">{fileTypeIcon(file)}</span>
                        <span className="attachment-name"><b>{file.type.startsWith("audio/") ? "Voice explanation" : file.name}</b><small>{formatBytes(file.size)}</small></span>
                        <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
            <label className="check-row consent-card">
              <input id="field-consent" type="checkbox" checked={values.consent} onChange={(event) => update("consent", event.target.checked)} aria-invalid={Boolean(errors.consent)} />
              <span>
                I agree to be contacted about my Dentist At Door enquiry. Read our <Link className="font-bold text-aqua-dark underline underline-offset-2" href="/privacy-policy">Privacy Policy</Link>.
                {errors.consent ? <span className="field-error mt-1 block">{errors.consent}</span> : null}
              </span>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="step-fields summary-step" aria-live="polite">
            <div className="summary-review-card">
              <div className="summary-review-intro">
                <span aria-hidden="true"><Sparkles size={19} /></span>
                <div>
                  <b>Your dental concern is summarized</b>
                  <p>Review the summary and switch languages before sending your Ping.</p>
                </div>
              </div>

              <div className="summary-language-row">
                <span><Languages size={16} aria-hidden="true" /> View language</span>
                <div className="summary-language-switch" role="group" aria-label="Summary language">
                  <button type="button" className={summaryLanguage === "en" ? "active" : ""} aria-pressed={summaryLanguage === "en"} onClick={() => setSummaryLanguage("en")}>English</button>
                  <button type="button" className={summaryLanguage === "hi" ? "active" : ""} aria-pressed={summaryLanguage === "hi"} onClick={() => setSummaryLanguage("hi")}>हिंदी</button>
                </div>
              </div>

              <article className="summary-content" lang={summaryLanguage === "hi" ? "hi" : "en"}>
                <span>{summaryLanguage === "hi" ? "दाँतों की समस्या का सारांश" : "Brief dental concern"}</span>
                <p>{summaryLanguage === "hi" ? summaryHindi : summaryEnglish}</p>
              </article>

              <p className="summary-disclaimer">AI-generated from the information you provided. It is a summary, not a diagnosis or treatment recommendation.</p>
            </div>

            <div className="summary-review-details" aria-label="Your enquiry details">
              <section className="summary-detail-section" aria-labelledby="review-contact-heading">
                <div className="summary-detail-heading">
                  <span><UserRound size={17} aria-hidden="true" /><b id="review-contact-heading">Your details</b></span>
                  <button type="button" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="summary-detail-grid">
                  <div><span>Full name</span><strong>{values.fullName}</strong></div>
                  <div><span>Phone</span><strong>{values.phone}</strong></div>
                  <div><span>WhatsApp</span><strong>{values.whatsapp}</strong></div>
                </div>
              </section>

              <section className="summary-detail-section" aria-labelledby="review-address-heading">
                <div className="summary-detail-heading">
                  <span><MapPin size={17} aria-hidden="true" /><b id="review-address-heading">Visit address</b></span>
                  <button type="button" onClick={() => setStep(2)}>Edit</button>
                </div>
                <p className="summary-review-address">{reviewAddress}</p>
              </section>

              <section className="summary-detail-section" aria-labelledby="review-files-heading">
                <div className="summary-detail-heading">
                  <span><Paperclip size={17} aria-hidden="true" /><b id="review-files-heading">Attached files</b></span>
                  <button type="button" onClick={() => setStep(3)}>Edit</button>
                </div>
                {attachments.length ? (
                  <div className="summary-review-files">
                    {attachments.map((file, index) => (
                      <div key={`${file.name}-${file.lastModified}-${index}`}>
                        <span className="attachment-kind" aria-hidden="true">{fileTypeIcon(file)}</span>
                        <span className="attachment-name">
                          <b>{file.type.startsWith("audio/") ? "Voice explanation" : file.name}</b>
                          <small>{formatBytes(file.size)}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="summary-review-empty">No reference files attached.</p>}
              </section>
            </div>
          </div>
        ) : null}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="field-website">Website</label>
          <input id="field-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(event) => update("website", event.target.value)} />
        </div>
        {serverError ? <div className="form-error" role="alert">{serverError}</div> : null}
        <div className="step-actions">
          {step > 1 ? <button type="button" className="step-back" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>Back</button> : null}
          {step < 3 ? (
            <button className="ping-button submit-button step-next continue-button" type="submit" disabled={!canContinue}>Continue</button>
          ) : step === 3 ? (
            <button
              className="ping-button submit-button step-next"
              type="submit"
              disabled={summaryStatus === "processing" || recordingStatus === "recording" || recordingStatus === "processing"}
            >
              {summaryStatus === "processing" ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={17} />}
              {summaryStatus === "processing" ? "Creating your summary…" : "Get the summary"}
            </button>
          ) : (
            <button className="ping-button submit-button step-next" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? <LoaderCircle className="animate-spin" size={18} /> : <MapPin size={17} />}
              {status === "submitting" ? "Sending your ping…" : "Send my ping"}
            </button>
          )}
        </div>
        {step >= 3 ? <p className="text-center text-[.72rem] leading-5 text-ink-soft">This is a coordination request, not a confirmed appointment.</p> : null}
      </form>
    </>
  );
}

function Field({
  label,
  labelExtra,
  name,
  value,
  error,
  showError = true,
  onChange,
  textarea = false,
  ...props
}: {
  label: string;
  labelExtra?: ReactNode;
  name: string;
  value: string;
  error?: string;
  showError?: boolean;
  onChange: (value: string) => void;
  textarea?: boolean;
  inputMode?: "tel" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  const shared = {
    id: `field-${name}`,
    name,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `error-${name}` : undefined,
    ...props,
  };
  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={`field-${name}`}>{label}</label>
        {labelExtra}
      </div>
      {textarea ? <textarea {...shared} /> : <input type="text" {...shared} />}
      {error && showError ? <span id={`error-${name}`} className="field-error">{error}</span> : null}
    </div>
  );
}
