# legal-site

Static Privacy Policy / Terms / Support pages for EKYS CEPTE, meant to be hosted on Netlify
as their own site (not part of the app's build, and not part of the repo's pnpm workspace).

## What this is

- Plain HTML + one shared CSS file. No framework, no npm dependency, no build step.
- Four pages: `/` (landing), `/privacy`, `/terms`, `/support`.
- Visually matches the EKYS CEPTE mobile app's calm blue/white design language.
- Every page carries a visible "Taslak — yayın öncesi bilgiler tamamlanmalı" (Draft — info must
  be finalized before publishing) banner, because real business details are not filled in yet.

## Placeholders that must be filled in before this goes live

Search the HTML files for these exact tokens and replace every occurrence:

- `[[LEGAL_ENTITY]]` — the legal business/company name operating the app.
- `[[SUPPORT_EMAIL]]` — a real, monitored support contact email.
- `[[BUSINESS_ADDRESS_OPTIONAL]]` — a business address, if the owner wants to publish one (optional).
- `[[EFFECTIVE_DATE]]` — the date these pages take legal effect.

None of these were invented — they don't exist anywhere in the repo yet, so they were left as
explicit placeholders. Once you have real values, replace them across all four HTML files (each
placeholder appears more than once — check `privacy/index.html`, `terms/index.html`,
`support/index.html`, and `index.html`).

Once real values are in and the content has had a legal review pass, remove the
`.draft-banner` `<div>` from each page (and its corresponding rule in `styles.css`, if you want to
retire it entirely) — the banner is intentionally the only thing marking these pages as
non-final.

## Deploying to Netlify

This folder is a complete, self-contained static site — it does not depend on anything else in
this monorepo and is deliberately excluded from the pnpm workspace, so it can be deployed
independently.

**Option A — Netlify CLI, from this folder:**

```
cd legal-site
netlify deploy          # preview deploy
netlify deploy --prod   # production deploy, once ready
```

**Option B — Netlify dashboard, git-connected:**

1. In Netlify, "Add new site" → "Import an existing project" → connect this repo.
2. Set **Base directory** to `legal-site`.
3. Leave **Build command** empty (there is none).
4. Set **Publish directory** to `legal-site` (or `.` relative to the base directory above).
5. Deploy. `netlify.toml` in this folder already sets the publish path and basic security
   headers, so no further config should be needed.
6. Once a real domain is attached, that URL is what the app's About screen should eventually
   link to (not done yet — see below).

## Why the mobile app doesn't link here yet

The app's About screen currently shows "Gizlilik Politikası" / "Kullanım Koşulları" / "Destek"
as disabled "Yakında" (Coming Soon) rows. That's intentional and out of scope for this batch —
there is no public URL for these pages yet. Once this site is deployed and has a real domain,
wiring the About screen's links to it is a separate, later change.
