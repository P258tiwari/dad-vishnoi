import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://api.razorpay.com",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com https://checkout.razorpay.com`,
  "frame-src https://challenges.cloudflare.com https://api.razorpay.com https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.facebook.com https://*.razorpay.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://connect.facebook.net https://api.razorpay.com https://lumberjack.razorpay.com",
  "media-src 'self' blob: https://prod-files-secure.s3.us-west-2.amazonaws.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
    : []),
];

const noStoreHeaders = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Razorpay opens bank/UPI windows that must be able to report back to the checkout.
      { source: "/ping", headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }] },
      { source: "/api/:path*", headers: noStoreHeaders },
      { source: "/login", headers: noStoreHeaders },
      { source: "/dashboard", headers: noStoreHeaders },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" }] },
    ];
  },
};

export default nextConfig;
