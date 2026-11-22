# Launch readiness — 25 October 2026

## Local verification completed

- Production build and TypeScript checks passed.
- ESLint passed without warnings.
- Mocked security suite passed; no real patient record was created.
- Production environment validation passed without displaying credentials.
- Zod updated to 4.6.6 or newer; npm installation audit and production audit report zero vulnerabilities.
- Local production HTTP checks passed for homepage, legal pages, login, sitemap, robots and the latest doctor image.
- Dashboard redirects unauthenticated requests to login.
- Ping opens the form directly. Step 5 is a Razorpay Checkout for ₹1,500; the server verifies the signature and captured amount with Razorpay before saving to Notion. Unpaid or failed attempts are never stored.
- All four enquiry-related APIs rejected unverified requests with HTTP 403.

## Changes made

- Replaced internal window navigation with Next.js router navigation.
- Fixed repeat-payment redirect for returning visitors.
- Production startup checks require live Razorpay API keys.
- Ignored all environment files except the example in Git.
- Aligned service descriptions in privacy and terms pages with video consultation and in-person treatment in Kanpur, using the supplied FAQ terms.
- Added `npm run test:security`.

## Deployment and remaining checks

Read-only checks against https://vishnoi.doctorsatdoor.com found HTTP 200 for public pages, robots, sitemap and login; dashboard redirected to login. **/ping returned HTTP 404.** These local changes have not been deployed in this audit.

Deploy the updated build using the existing VPS procedure in README.md, then repeat checks against the public hostname. Make one live ₹1,500 payment, confirm it is captured in Razorpay and appears as Paid in the dashboard. The old hosted Payment Page and its success URL are no longer used.

Payments are verified server-side: only Razorpay-signed, captured ₹1,500 payments create a Notion record, and each payment creates at most one record.

Still required: normal-browser Turnstile verification; desktop/mobile visual checks in both languages; a real payment and clearly labelled enquiry with attachment; confirmation of storage in Notion and dashboard status updates. No payment was made, no live enquiry submitted, and no external service credentials were functionally validated by this audit.

Hindi translation currently covers the homepage and footer, not every form and legal-page string. Confirm cancellation/refund handling with the service owner; no new refund policy was invented.

Dependency advisory reviewed: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 (patched version 4.6.6).
