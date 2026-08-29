# PBXMTL.ca

Production source for the bilingual PBXMTL website serving Montréal tutors and small service businesses.

## Architecture

- Static HTML, CSS and JavaScript in `public/`
- Cloudflare Pages Functions in `functions/`
- No framework, build step, package dependency, database or persistent visitor tracking
- `main` is the production branch; feature branches receive Cloudflare preview deployments

## Local preview

```sh
npm test
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000`. The static server does not run the contact Function; the automated test suite validates that Function with a mocked email provider.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | None |
| Build output directory | `public` |
| Root directory | Repository root |

The `functions/` directory is detected by Cloudflare Pages automatically.

Configure these encrypted production and preview secrets in Cloudflare before testing the contact form:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL` — inbox that receives leads
- `CONTACT_FROM_EMAIL` — a verified sender, such as `PBXMTL <website@pbxmtl.ca>`

Never commit their values. DNS cutover must preserve every MX, SPF, DKIM and DMARC record.

## Routes

- `/` — French main page
- `/en/` — English main page
- `/tutoring-centres/` — French tutoring landing page
- `/en/tutoring-centres/` — English tutoring landing page

See `docs/migration-inventory.md` for the pre-migration audit and cutover constraints.
PBXMTL.ca — bilingual websites for tutors and small service businesses in Montreal
