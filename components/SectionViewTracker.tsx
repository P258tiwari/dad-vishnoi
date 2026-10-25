"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

export function SectionViewTracker({ event }: { event: AnalyticsEvent }) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      trackEvent(event);
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [event]);

  return <span ref={markerRef} className="section-view-marker" aria-hidden="true" />;
}
