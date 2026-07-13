# legal-site

Static Privacy Policy / Terms / Support pages for EKYS CEPTE, meant to be hosted on Netlify
as their own site. This folder is not part of the mobile app build and is not part of the
repo's pnpm workspace.

## Current Status

- Plain HTML + one shared CSS file. No framework, no npm dependency, no build step.
- Four pages: `/` (landing), `/privacy`, `/terms`, `/support`.
- Visually matches the EKYS CEPTE mobile app's calm blue/white design language.
- Every page still carries a visible "Taslak - yayın ve arayüz onayı bekleniyor" banner.

The owner-provided publication details are now filled in:

- Legal entity: `EKYSCEPTE`
- Intended domain: `https://ekyscepte.com`
- Support email: `ekysceptedestek@gmail.com`
- Business address: not published
- Effective date: `13 Temmuz 2026`

The draft banner remains intentionally. The legal pages should not be treated as production-ready
until the mobile UI is approved, the final domain is connected, and the legal/support text has had
its final review.

## Before Production

Before publishing or wiring the mobile app's About screen to these pages:

1. Confirm the final public domain is active.
2. Confirm `ekysceptedestek@gmail.com` is monitored.
3. Review the Privacy Policy and Terms text one last time.
4. Remove the draft banner from the HTML pages only when the site is actually ready to publish.
5. Then update the mobile app's About screen links in a separate app change.

There are currently no replacement tokens left in the HTML files.

## Deploying to Netlify

This folder is a complete, self-contained static site. It can be deployed independently.

**Option A - Netlify CLI, from this folder:**

```bash
cd legal-site
netlify deploy          # preview deploy
netlify deploy --prod   # production deploy, once ready
```

**Option B - Netlify dashboard, git-connected:**

1. In Netlify, "Add new site" -> "Import an existing project" -> connect this repo.
2. Set **Base directory** to `legal-site`.
3. Leave **Build command** empty.
4. Set **Publish directory** to `legal-site` (or `.` relative to the base directory).
5. Deploy. `netlify.toml` already sets the publish path and basic security headers.
6. Attach `ekyscepte.com` only when the owner is ready to publish.

## Why The Mobile App Does Not Link Here Yet

The app's About screen currently shows "Gizlilik Politikası" / "Kullanım Koşulları" / "Destek"
as disabled "Yakında" rows. That remains intentional: the legal site has not been deployed to the
final domain yet, and the mobile UI has not received final approval. Once both are true, wiring the
About screen's links is a separate change.
