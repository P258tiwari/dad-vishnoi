# Launch readiness — 25 October 2026

## Local verification completed

- Production build and TypeScript checks passed.
- ESLint passed without warnings.
- Mocked security suite passed; no real patient record was created.
- Production environment validation passed without displaying credentials.
- Zod updated to 4.6.6 or newer; npm installation audit and production audit report zero vulnerabilities.
- Local production HTTP checks passed for homepage, legal pages, login, sitemap, robots and the latest doctor image.
- Dashboard redirects unauthenticated requests to login.
- First-time Ping visits redirect to the hosted Razorpay page. Returning users with the manual-review cookie can reopen the form without another payment redirect.
- All four enquiry-related APIs rejected unverified requests with HTTP 403.

## Changes made

- Replaced internal window navigation with Next.js router navigation.
- Fixed repeat-payment redirect for returning visitors.
- Added Razorpay URL validation to production startup checks.
- Ignored all environment files except the example in Git.
- Aligned service descriptions in privacy and terms pages with video consultation and in-person treatment in Kanpur, using the supplied FAQ terms.
- Added `npm run test:security`.

## Deployment and remaining checks

Read-only checks against https://vishnoi.doctorsatdoor.com found HTTP 200 for public pages, robots, sitemap and login; dashboard redirected to login. **/ping returned HTTP 404.** These local changes have not been deployed in this audit.

Deploy the updated build using the existing VPS procedure in README.md, then repeat checks against the public hostname. Verify the hosted Razorpay page charges ₹1,500 and its return destination is `/api/consultation/return` or `/ping?status=success` on the canonical hostname.

Payment access remains a deliberately unverified manual-review flow. The return flag/cookie is not proof of payment. The team must verify the Razorpay receipt before confirming a slot; automatic verification requires a separate signed payment integration.

Still required: normal-browser Turnstile verification; desktop/mobile visual checks in both languages; a real payment and clearly labelled enquiry with attachment; confirmation of storage in Notion and dashboard status updates. No payment was made, no live enquiry submitted, and no external service credentials were functionally validated by this audit.

Hindi translation currently covers the homepage and footer, not every form and legal-page string. Confirm cancellation/refund handling with the service owner; no new refund policy was invented.

Dependency advisory reviewed: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 (patched version 4.6.6).
