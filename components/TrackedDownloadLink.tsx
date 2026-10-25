"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

export function TrackedDownloadLink({
  href,
  platform,
  ariaLabel,
  className,
  children,
}: {
  href: string;
  platform: "android" | "iphone";
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      onClick={() => trackEvent(platform === "android" ? "dad_report_download_android" : "dad_report_download_ios", { platform })}
    >
      {children}
    </a>
  );
}
