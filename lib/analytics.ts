export type AnalyticsEvent =
  | "ping_cta_click"
  | "ping_form_open"
  | "ping_form_start"
  | "ping_submit_success"
  | "ping_submit_duplicate"
  | "ping_submit_error"
  | "ping_location_current_success"
  | "ping_location_current_error"
  | "ping_location_reverse_lookup_error"
  | "ping_location_search_success"
  | "ping_location_outside_service_area"
  | "dad_report_section_view"
  | "dad_report_download_android"
  | "dad_report_download_ios"
  | "voice_recording_start"
  | "voice_transcription_success"
  | "voice_transcription_error"
  | "ping_summary_view"
  | "ping_summary_error";

export function trackEvent(event: AnalyticsEvent, parameters: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  window.gtag?.("event", event, parameters);
  if (event === "ping_submit_success") {
    window.fbq?.("track", "Lead", parameters);
  } else {
    window.fbq?.("trackCustom", event, parameters);
  }
}
