const required = [
  "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY",
  "BOT_SESSION_SECRET", "ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET",
  "NOTION_API_KEY", "NOTION_DATA_SOURCE_ID",
];
const missing = required.filter(key => !process.env[key]?.trim());
const errors = missing.map(key => `${key} is missing`);
if (process.env.NEXT_PUBLIC_SITE_URL !== "https://vishnoi.doctorsatdoor.com") errors.push("NEXT_PUBLIC_SITE_URL must be https://vishnoi.doctorsatdoor.com");
for (const key of ["BOT_SESSION_SECRET", "ADMIN_SESSION_SECRET"]) {
  if ((process.env[key] || "").length < 32) errors.push(`${key} must have at least 32 characters`);
}
if ((process.env.ADMIN_PASSWORD || "").length < 12) errors.push("ADMIN_PASSWORD must have at least 12 characters");
if (process.env.BOT_SESSION_SECRET === process.env.ADMIN_SESSION_SECRET) errors.push("Use separate bot and admin session secrets");
try {
  const paymentUrl = new URL(process.env.RAZORPAY_PAYMENT_PAGE_URL || "https://pages.razorpay.com/pingfee");
  if (paymentUrl.protocol !== "https:" || paymentUrl.username || paymentUrl.password ||
      !(paymentUrl.hostname === "rzp.io" || paymentUrl.hostname === "razorpay.com" || paymentUrl.hostname.endsWith(".razorpay.com"))) {
    errors.push("RAZORPAY_PAYMENT_PAGE_URL must be an HTTPS Razorpay URL");
  }
} catch {
  errors.push("RAZORPAY_PAYMENT_PAGE_URL must be a valid URL");
}
if (errors.length) {
  console.error("Production configuration is incomplete:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("Production configuration checks passed. No secret values displayed.");
