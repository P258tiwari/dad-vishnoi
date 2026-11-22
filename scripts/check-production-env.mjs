const required = [
  "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY",
  "BOT_SESSION_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET",
  "NOTION_API_KEY", "NOTION_DATA_SOURCE_ID", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET",
];
const missing = required.filter(key => !process.env[key]?.trim());
const errors = missing.map(key => `${key} is missing`);
if (process.env.NEXT_PUBLIC_SITE_URL !== "https://vishnoi.doctorsatdoor.com") errors.push("NEXT_PUBLIC_SITE_URL must be https://vishnoi.doctorsatdoor.com");
for (const key of ["BOT_SESSION_SECRET", "ADMIN_SESSION_SECRET"]) {
  if ((process.env[key] || "").length < 32) errors.push(`${key} must have at least 32 characters`);
}
if ((process.env.ADMIN_PASSWORD || "").length < 12) errors.push("ADMIN_PASSWORD must have at least 12 characters");
if (process.env.BOT_SESSION_SECRET === process.env.ADMIN_SESSION_SECRET) errors.push("Use separate bot and admin session secrets");
if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.startsWith("rzp_live_")) errors.push("RAZORPAY_KEY_ID must be a live key (rzp_live_) in production");
if (errors.length) {
  console.error("Production configuration is incomplete:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("Production configuration checks passed. No secret values displayed.");
