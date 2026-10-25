# Vishnoi deployment

Target: https://vishnoi.doctorsatdoor.com

Deployed on 22 October 2026 to `/opt/vishnoi` on the authorized VPS. The `vishnoi` Compose project serves only on `127.0.0.1:3100`, behind the dedicated nginx virtual host. HTTPS redirects, certificate renewal, Cloudflare proxying and a hostname-scoped Strict TLS rule are enabled. Existing sites were preserved.

Verified: healthy container, homepage HTTPS 200, authenticated dashboard access, and 403 rejection of unverified public API requests. No test patient record was submitted. Cloudflare rejected the automated browser challenge with code 300030; a normal-browser verification and enquiry submission remain to be confirmed. This is not a claim that all server security maintenance is complete: OS updates remain pending, and the shared host firewall was not changed.

## Inspect the existing VPS first

Check the OS, running sites, proxy, Docker/Compose, free memory, and port 3100 before installing anything. Do not overwrite existing nginx virtual hosts or restart unrelated applications. Keep the current SSH session open during network changes.

## Production configuration

Create `.env.production` on the server from the local `.env.local`, set `NEXT_PUBLIC_SITE_URL=https://vishnoi.doctorsatdoor.com`, and restrict the file with `chmod 600 .env.production`. Never put it under a public web directory. `.dockerignore` prevents credentials entering the image or build context.

The Cloudflare widget **Vishnoi Dental Ping** must have the exact hostname `vishnoi.doctorsatdoor.com` and Managed mode. Supply `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. `BOT_SESSION_SECRET` and `ADMIN_SESSION_SECRET` are independent random secrets of at least 32 characters. The production admin password must have at least 12 characters. The container refuses startup if required settings are absent.

Public environment variables are fixed at build time. Rebuild after changing the site key or site URL. Bot checks are always enforced in production; local development skips them unless `BOT_PROTECTION_ENABLED=true` (use a separate development widget).

## Build and launch after Docker availability is confirmed

From the uploaded project directory:

```bash
chmod 600 .env.production
docker compose --env-file .env.production -p vishnoi build --pull
docker compose --env-file .env.production -p vishnoi up -d
docker compose --env-file .env.production -p vishnoi ps
curl -I http://127.0.0.1:3100/
```

The container runs as a non-root user with a read-only filesystem, restricted capabilities, resource limits, log rotation, and a health check. Only nginx should reach its loopback port. Do not expose 3100 publicly. Use one instance: application rate limits are process-local; use a shared limiter before adding replicas.

## nginx and HTTPS

`deploy/nginx.conf` is an initial HTTP virtual host for certificate issuance. Check port 3100 and the existing nginx configuration before installing it as a new site. Run `nginx -t` before a reload. Use Certbot's nginx integration to issue the certificate for **only** vishnoi.doctorsatdoor.com and enable HTTP-to-HTTPS redirection. Do not send real enquiries or log in before HTTPS works.

The reverse proxy overwrites forwarding headers, limits request bodies and API request frequency, and buffers incoming uploads. Keep those protections in the HTTPS server block after Certbot updates it.

After HTTPS works, enable Cloudflare proxying for this subdomain and use Full (strict) TLS. Scope any TLS/WAF/cache rule to this hostname so unrelated domains are unaffected. Before proxying, configure nginx to trust `CF-Connecting-IP` **only from the current official Cloudflare IP ranges**: https://www.cloudflare.com/ips/. Never trust that header from arbitrary sources. Otherwise every visitor behind Cloudflare may share the same application rate limit.

Keep `/api/*`, `/dashboard`, and `/login` out of CDN caches. Keep SSH access restricted and preserve necessary existing service ports. Restrict this origin to Cloudflare using a site-scoped allowlist or authenticated origin pulls after certificate renewal and existing-site implications are reviewed. Do not apply a host-wide firewall allowlist blindly on a shared server.

## Release checks

- Verify HTTPS and the canonical hostname; check homepage, images, login, dashboard and legal pages.
- An unverified POST to each of `/api/leads`, `/api/summary`, `/api/transcribe`, `/api/location` must return 403 and create no Notion row.
- Complete a real browser security check and submit one clearly labelled test enquiry with permission, then check its data, audio and dashboard status. A successful build alone is not an end-to-end production test.
- Confirm CDN/private cache behavior and server headers. Check logs without printing submitted patient contents or secrets.
- Verify direct access to port 3100 is unavailable externally and HTTPS renewal is configured.

## Security scope and remaining limits

Turnstile validation checks hostname and action server-side; successful verification creates an IP-bound, signed, HTTP-only, SameSite=Strict session lasting 15 minutes. Invalid verification or missing production configuration is rejected. The form also has IP and phone limits, duplicate detection, a honeypot, India-only field validation, byte-counted body limits, and media-signature validation. Uploaded files are never executed on the app server. Signature validation is not antivirus scanning.

No control guarantees zero bot submissions or zero attacks. Monitor submission quality, 403/429 rates and provider spend. Current production dependency audit is clean; the full development audit still reports an unpatched `braces` advisory through ESLint's glob dependencies. Those development packages are excluded from the standalone runtime image. Do not use `npm audit fix --force`, which proposes a framework lint-package downgrade.

Run `node tests/security.cjs`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit --omit=dev` before release. The security test uses mocked Notion/Cloudflare responses and creates no real patient data.
