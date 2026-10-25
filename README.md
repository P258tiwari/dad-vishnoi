# Dentist At Door

A mobile-first Dentist At Door landing page with a Notion-backed Ping enquiry workflow and a private admin dashboard.

## Features

- Four-step Ping form with India-only addresses with state selection and current-location autofill, voice transcription, bilingual AI summary review, English/Hindi switching, consent and file attachments
- Notion-only enquiry storage; new enquiries start as `Active`
- Files uploaded directly to the enquiry's Notion `Attachments` property
- Standalone `/login` page and protected `/dashboard`
- Search, status filters, full enquiry detail view, attachment links and status updates
- One-click `Mark served` action
- No Google Sheets or WhatsApp delivery dependency

## Installation

Prerequisites: Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Open the public site at `http://localhost:3000`, the private login at `http://localhost:3000/login`, and the protected dashboard at `http://localhost:3000/dashboard`.

## Required environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL, without a trailing slash |
| `NOTION_API_KEY` | Secret for the website's internal Notion integration |
| `NOTION_DATA_SOURCE_ID` | Dentist At Door enquiry data source ID |
| `GOOGLE_MAPS_API_KEY` | Server-only key for Places API (New) address search and Geocoding API current-location lookup |
| `ADMIN_USERNAME` | Username for the single dashboard login |
| `ADMIN_PASSWORD` | Password for the single dashboard login |
| `ADMIN_SESSION_SECRET` | Random value of at least 32 characters used to sign admin sessions |
| `OPENAI_API_KEY` | Optional voice transcription and bilingual summary API key |
| `NEXT_PUBLIC_GA_ID` | Optional GA4 measurement ID |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional Meta Pixel ID |

Never prefix private variables with `NEXT_PUBLIC_`, and never commit `.env.local`.

Generate a session secret with PowerShell:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

## Notion setup

The new database is [Ping Enquiries ? Vishnoi Dental](https://www.notion.so/347a8d51ade84a5791071e9b86662273). Its data source ID, `8b0d0ef9-eaa7-479a-a6fc-26fed1f0b34a`, is included in `.env.example`. Connect the **Dentist At Door** integration before setting this ID in `.env.local` and in the deployment environment. The previous database remains intact; existing records are not migrated automatically.

1. Open the database in Notion.
2. Create or select an internal Notion integration with read, insert and update content capabilities.
3. Use the database menu → **Connections** to share the database with that integration.
4. Copy the integration secret into `NOTION_API_KEY` in `.env.local` and in the deployment environment.

The database includes all patient/contact fields, concern, transcript, consent, source, submission time, file attachments and the statuses `Active`, `Contacted`, `Scheduled`, `Served`, and `Closed`.

The new schema stores city, state, country, pincode, map URL, coordinates, place ID and address source separately. Original concern, English summary, Hindi summary and voice transcript remain separate fields. Landmarks, consent, attachments and submission time are preserved. The dashboard supports location search and state filters.

Views: **All Ping enquiries**, **Needs follow-up** (Active and Contacted), and **Enquiry pipeline** grouped by status.

During cutover, the writer checks the configured data-source schema and only sends supported fields. This keeps the previous database working until the new database is connected. Full field storage requires the new data source.

## Google Maps address setup

1. In Google Cloud, enable **Places API (New)** and **Geocoding API** for the same project.
2. Create a server-side API key and restrict it to those two APIs and the production server where possible.
3. Add the key as `GOOGLE_MAPS_API_KEY` in `.env.local` and in the deployment environment.

The key stays on the server. Without it, Google address autocomplete is unavailable, but an explicit current-location request can still fill the address through the server-side OpenStreetMap fallback. The fallback is cached, limited to one upstream request per second and attributed in the form. Manually entered addresses always remain available and Indian state and pincode validation is enforced on the form and server.

Set `REVERSE_GEOCODER_URL` only when switching from the default public Nominatim endpoint to a compatible reverse-geocoding proxy or self-hosted service. Review the upstream usage policy before production launch.

## Admin login

Set one username and password in `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Sessions are signed server-side, stored in an HTTP-only, same-site cookie, and expire after 12 hours. The dashboard and status API both verify the session.

The login and dashboard are separate application routes and are not linked from the public landing page.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Before launch, submit a real Ping with and without files, confirm the row and attachments in Notion, verify each dashboard status transition, and replace all legal/contact placeholders.
