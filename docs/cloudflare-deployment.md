# Cloudflare Pages deployment

## Project settings

- Production branch: `main`
- Framework preset: None
- Build command: none
- Build output directory: `public`
- Root directory: repository root
- Preview deployments: enabled for non-production branches

## Required encrypted variables

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`

Set these separately for Preview and Production. Never commit their values.

## Preview acceptance checks

- All four routes return `200` and render in French/English.
- The language switch preserves the corresponding page.
- Internal links, fonts, favicon and social image load without errors.
- Unknown routes return the custom `404` response.
- Canonical, hreflang, Open Graph, Twitter and JSON-LD metadata are present.
- Preview responses include `X-Robots-Tag: noindex, nofollow, noarchive`.
- The contact endpoint rejects invalid submissions and delivers a valid test lead after secrets are configured.
- Desktop and mobile layouts have no horizontal overflow or console errors.

## Production cutover

Do not connect `pbxmtl.ca` until the preview passes. During cutover, preserve all MX, SPF, DKIM, DMARC and mail-host records. Configure `www` to redirect permanently to the apex, verify HTTPS and redirects, then re-submit the production sitemap in Google Search Console.
