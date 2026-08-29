# PBXMTL Cloudflare migration inventory

Audit date: 2026-08-29

## Repository

- GitHub: `amittbhardwj/pbxmtl-ca`
- Default branch: `main`
- Starting state: README only; no application, build, or deployment configuration
- Migration branch: `migration/cloudflare-pages`

## Live routes to preserve

| Current route | Language | Purpose |
| --- | --- | --- |
| `/` | French (Canada) | Main $799 bilingual launch-site offer |
| `/en/` | English (Canada) | English main offer |
| `/tutoring-centres/` | French (Canada) | Tutoring/education niche page |
| `/en/tutoring-centres/` | English (Canada) | English tutoring/education niche page |

Non-trailing-slash variants currently redirect to trailing-slash routes. The migrated site will use the trailing-slash URLs consistently in canonicals, hreflang, sitemap, navigation, and redirects.

## Content and conversion

- Offer: bilingual launch website, CAD $799 one-time, 14–21 day delivery, one revision round
- Availability: first three suitable clients and approximately one new project per month
- Optional care plan: CAD $49/month
- Audience: Montréal tutors, tutoring centres, and small service businesses
- Proof: Ramath+ plus software/AI/OCR engineering experience
- Main CTA: request the next pilot slot
- Current form fields: name, business, email, optional website, need, message, agreement, honeypot
- Current client-side endpoint: `POST /api/leads`
- Current direct-email fallback: `amitt.bhardwj@gmail.com`

## Design system

- Visual direction: editorial white layout, near-black feature bands/cards, Apple-like blue accents
- Core colours: `#ffffff`, `#f5f5f7`, `#1d1d1f`, `#6e6e73`, `#0071e3`, `#0066cc`, `#2997ff`, dark section `#0b0b0d`
- Typography: Manrope display, DM Sans body, with system fallbacks
- Layout: sticky translucent header, large typographic hero, rounded cards, alternating light/dark sections, fixed mobile CTA
- Images: no raster content images; brand mark and product visuals are CSS/SVG-based
- Responsive breakpoints in the live CSS support desktop, tablet, and mobile layouts

## Existing SEO and metadata

- Unique titles and meta descriptions on all four routes
- Canonical and `fr-CA` / `en-CA` / `x-default` hreflang tags
- Open Graph and Twitter text metadata
- `ProfessionalService` and `FAQPage` JSON-LD on the two main pages
- `robots.txt` and `sitemap.xml` present
- Google Search Console verification meta tag present
- Montréal, Québec, and Canada service-area signals throughout the copy

## Audit findings to correct

- English source documents declare `lang="fr-CA"` until JavaScript runs
- Canonical/sitemap URLs omit trailing slashes although the server redirects to them
- `www.pbxmtl.ca` currently serves duplicate 200 content instead of redirecting to the apex
- Unknown routes return the homepage with HTTP 200 (soft 404)
- No `og:image` or `twitter:image` is currently defined
- Contact form has no useful non-JavaScript POST behavior
- Current pages ship roughly 326 KB of JavaScript plus 50 KB of CSS despite being content-led pages
- Live HTML is dynamically served with `cache-control: max-age=0`; static Pages hosting can cache assets more effectively

## DNS safety inventory

- Nameservers are already Cloudflare-managed: `khloe.ns.cloudflare.com`, `pete.ns.cloudflare.com`
- Apex and `www` are proxied through Cloudflare
- MX: priority 1 `emailfwd.pbxmtl.ca`
- Mail host A record: `emailfwd.pbxmtl.ca` → `149.56.225.6`
- SPF: `v=spf1 a mx include:emailfwd.whc.ca ~all`
- No `_dmarc.pbxmtl.ca` record was visible during the audit
- Website migration must not alter MX, mail-host A, SPF, DKIM, or future DMARC records

## Target architecture

- Static HTML/CSS/JavaScript in `public/`
- Cloudflare Pages deployment from GitHub `main`
- No framework or build step
- Minimal Pages Function only for `POST /api/leads`
- Preview deployments marked `noindex` through preview-host response headers before domain cutover

## Cutover boundary

Production DNS and custom-domain routing remain unchanged until the Cloudflare preview passes functional, SEO, accessibility, responsive, performance, security-header, and redirect validation and explicit final approval is received.
