# EKYS CEPTE — Design System

**Status:** v1.1 — Refinement pass complete, pending approval. Single source of truth for every future screen once accepted — no UI component or screen should be built outside this system without a deliberate, disclosed exception.

**Owner:** Product Design. Implementation changes to `src/theme/` and `src/components/` should trace back to a section of this document.

**Changelog v1.0 → v1.1:** this revision followed a critical design-director review against Apple/Linear/Notion/Revolut/Headspace as the bar. v1.0 was safe but risked being *forgettable* — uniform card fields with no focal point, stat-tile dashboards indistinguishable from B2B admin tooling, spinner-first loading, and a color system so restrained it never created a moment of warmth. This revision adds: a Hero Card tier, a second warm accent reserved for achievement moments, narrative-first dashboard framing, skeleton loading as the default (not spinners), a defined Focus Mode for question-solving, named micro-interactions with a specific easing curve, a real Achievement Moment spec, and explicit premium-membership presentation guidance. Nothing in v1.0 was reversed — everything here builds on the same tokens and philosophy.

---

## 1. Product Design Philosophy

**Quiet Confidence, with Momentum.** The interface never competes for the user's attention with itself — it gets out of the way of studying. But v1.0 stopped at "quiet" and never addressed "confidence" as something *felt*, not just avoided-negative. Every design decision is evaluated against two questions: *does this reduce cognitive load and exam-prep anxiety* — and separately — *does this help the candidate feel forward motion?* A design that only avoids stress but never creates a sense of progress is merely inoffensive, not premium.

Rejected outright: streak-shaming, aggressive red/green traffic-light feedback, gamified pop-ups, badge/trophy chasing, dashboard chart-overload, celebratory confetti for routine actions, manipulative urgency of any kind. Favored: single-focus screens, one primary action per screen, generous negative space, typography carrying hierarchy instead of decoration, and — new in this revision — one clear focal point per screen rather than a uniform field of identical elements.

This is not a consumer entertainment app that happens to have exam content. It is a serious tool a serious candidate reaches for daily, for months, under real pressure. The design has to survive that — not just look good in a first screenshot.

## 2. Brand Personality

If EKYS CEPTE were a person: a calm, highly competent private tutor who has helped thousands of candidates pass this exact exam. Not a cheerleader. Not a drill sergeant. Not a mascot. Composed, precise, encouraging without being saccharine, honest even when the news (a wrong answer, a low score) isn't good. Quietly premium — like a well-made pen or a good watch, where the value is in the making, not in shouting about itself.

This personality is the reason premium-membership presentation (§29) can never use urgency tactics: a trusted tutor does not manufacture scarcity to sell you something. The moment the app does that, the entire brand personality collapses.

## 3. Emotional Goals

Mapped to the actual emotional arc of a Turkish exam candidate, since this is who the product exists for:

| Moment | Risk | Design response |
|---|---|---|
| Opening the app | Anxiety, "have I done enough" | Calm entry, no alarming red numbers, no guilt-tripping about missed days |
| Starting a topic | Uncertainty about where to begin | One clear next step, not a wall of options |
| Answering incorrectly | Shame, self-doubt | Non-judgmental correction — informative, never punitive styling |
| Finishing a deneme (mock exam) | Exhaustion, fear of the result | Honest, calm results — a failed deneme reads as "useful information," not "you failed" |
| Returning after days away | Guilt, risk of giving up entirely | Welcoming continuity — no shaming streak-loss messaging, ever |
| Making real progress | Risk of it going unnoticed/unfelt | A visualized trajectory (§24), not just a static number — progress that isn't felt might as well not be shown |

Every visual decision should trace back to one sentence: **"I trust this application."** Trust here means consistency (nothing surprises the user), restraint (no manipulative urgency, no dark patterns), precision (numbers presented cleanly and correctly), and stability (layouts never jump or shift unexpectedly).

## 4. Visual Identity

A warm-neutral canvas, not stark white. One confident primary accent, used sparingly and only where it means something, plus one warm secondary accent reserved exclusively for genuinely rare, meaningful moments (§5, §25). Generous whitespace as a first-class design tool, not leftover space — but whitespace is not the same as emptiness: a screen with nothing in it isn't calm, it's unfinished (§13). Depth from hairlines and barely-there shadows for ordinary content, with exactly one Hero element per screen allowed slightly more visual weight (§12). Typography-led hierarchy — size and weight do the work color does in lesser apps. Restrained iconography (one icon language, outline-by-default). No stock photography, no cartoon mascots. Numbers — scores, percentages, timers — are treated with typographic respect: aligned, tabular, never jittering.

**Explicitly not Material Design**, beyond color and shape choices — no ripple effect on press (opacity/scale micro-interactions instead, §27), no Floating Action Button, no Material bottom-sheet drag handle, no Material snackbar styling. "Avoid Material" is a checklist, not a mood.

---

## 5. Color System

Color means something in this system — it is never decorative. Two accents total, each with a distinct, non-overlapping job: a primary accent for anything actionable, and a warm secondary accent for the rare moments that deserve to feel human rather than efficient.

**Why indigo:** it reads as trust and focused intelligence without the genericness of "finance app blue" or the playfulness of purple. Green was rejected as the primary because it's overloaded with "wellness app" and "success/correct" associations that would conflict with its use elsewhere; red-adjacent hues were rejected entirely as a primary because they physiologically trigger stress responses, which directly opposes the calm-focus goal of the entire product.

### Light Mode

| Token | Hex | Use |
|---|---|---|
| `background` | `#FAFAF8` | Base canvas |
| `backgroundSecondary` | `#F2F1EE` | Section separation within a screen |
| `surface` | `#FFFFFF` | Cards, elevated content |
| `surfaceSecondary` | `#F7F6F4` | Nested/inset elements within a card |
| `borderHairline` | `#EBEBE8` | Default card/divider border |
| `borderStrong` | `#DDDDD9` | Emphasized dividers, input borders |
| `textPrimary` | `#1C1C1E` | Primary reading text |
| `textSecondary` | `#6E6E73` | Supporting text, labels |
| `textTertiary` | `#AEAEB2` | Captions, placeholders, disabled-adjacent |
| `textDisabled` | `#C7C7CB` | Disabled control labels |
| `accent` | `#4338CA` | Primary accent — actionable/active/selected only |
| `accentMuted` | `#EEF0FC` | Accent-tinted backgrounds (selected rows, icon chips) |
| `accentPressed` | `#362DAE` | Accent on press/active state |
| `warmAccent` | `#C4883A` | **New.** Reserved exclusively for Achievement Moments (§25) and premium-membership surfaces (§29) — never used elsewhere, so it stays meaningful every time it appears |
| `warmAccentMuted` | `#F7EEE2` | Warm-accent-tinted backgrounds |

### Semantic Colors (Light)

| Token | Hex | Muted background |
|---|---|---|
| `success` | `#1F9D6C` | `#E6F5EE` |
| `info` | `#5B6B8C` | `#EEF1F5` |
| `danger` | `#B3453D` | `#FBEDEC` |

### Dark Mode

Dark mode is **not an inversion** — every value is independently tuned for contrast and vibrancy against dark surfaces. Elevation in dark mode is communicated by surfaces getting progressively *lighter*, not by shadow (shadows don't read on dark backgrounds).

| Token | Hex | Use |
|---|---|---|
| `background` | `#0E0E10` | Base canvas — near-black, warm-neutral undertone, not pure black |
| `surface` (Level 1) | `#17171A` | Cards |
| `surfaceSecondary` (Level 2) | `#202024` | Nested elements, elevated-over-card content |
| `borderHairline` | `#2B2B2F` | |
| `textPrimary` | `#F5F5F4` | |
| `textSecondary` | `#A0A0A5` | |
| `textTertiary` | `#6E6E73` | |
| `accent` | `#6C63F5` | Lightened/desaturated from the light-mode indigo — the light-mode value would read muddy on dark surfaces |
| `accentMuted` | `#221F3D` | |
| `warmAccent` | `#D9A05C` | Lightened from the light-mode warm accent for the same reason |
| `warmAccentMuted` | `#3A2E1D` | |
| `success` | `#34C98A` | Brightened for dark-background legibility |
| `info` | `#8B9BC0` | |
| `danger` | `#E0665C` | |

**Rule:** any new semantic color added later must define both a light and dark value independently — never derive dark mode by applying opacity or a filter to the light-mode value. **Rule:** `warmAccent` never appears more than once per screen, and never for anything routine — the instant it becomes decoration, it stops working.

---

## 6. Typography System

Single typeface: **Inter** (Regular/Medium/SemiBold/Bold), loaded explicitly rather than relying on the platform default — the platform default resolves to Roboto on Android, which reads as Material Design.

| Style | Weight | Size / Line height | Tracking | Use |
|---|---|---|---|---|
| `largeTitle` | Bold | 34 / 41 | -0.4 | Top-of-tab screen titles |
| `title1` | Bold | 28 / 34 | -0.3 | Primary section headers |
| `title2` | SemiBold | 22 / 28 | -0.2 | Card/sheet titles |
| `title3` | SemiBold | 20 / 25 | -0.1 | Sub-section headers |
| `headline` | SemiBold | 17 / 22 | 0 | Emphasized body, button labels |
| `body` | Regular | 17 / 24 | 0 | Reading text, question bodies |
| `subhead` | Regular | 15 / 20 | 0 | Secondary text, descriptions |
| `footnote` | Regular | 13 / 18 | 0 | Metadata, timestamps |
| `caption` | Medium | 12 / 16 | 0.1 | Labels, tags, chips |

**Rules:**
- Never more than two weights visible on a single screen at once — hierarchy comes from the scale, not weight-stacking.
- Text color is tied to typographic role: primary text uses `textPrimary`, never a lower-hierarchy color on a higher-hierarchy style.
- Reading text (question bodies, explanations) is width-constrained to roughly 60–75 characters per line even on large screens — full-bleed body text on a tablet-width screen is a readability failure, not a feature.
- **Vertical rhythm:** every text style's line-height is a multiple of `spacing.xs` (4), so text blocks align to the same underlying grid as the spacing system — this is what makes a screen feel *composed* rather than assembled from independently-placed pieces, and it's the difference between typographic craft and merely picking sizes that look fine in isolation.
- **All numeric data — scores, percentages, timers, question counts — uses tabular (monospaced) figures** (`fontVariant: ['tabular-nums']`). A countdown timer or live score that visually jitters as digits change is disqualifying for a "premium" exam app.

## 7. 8pt Spacing System

| Token | Value | Use |
|---|---|---|
| `xs` | 4 | Tight internal gaps (icon-to-label) |
| `sm` | 8 | Compact internal gaps |
| `md` | 16 | Standard internal gaps, list item spacing |
| `lg` | 24 | Screen horizontal padding, card padding |
| `xl` | 32 | Gaps between major sections |
| `xxl` | 40 | Large section breaks |
| `xxxl` | 64 | Onboarding/splash-scale composition, used rarely |

**Information density is contextual, not a blanket rule.** v1.0 implied "generous spacing" applies uniformly everywhere; that's wrong. Focus contexts (an active question, a reading-heavy screen) want maximum whitespace — nothing competing with the one thing that matters. Overview contexts (Dashboard, an exam list) legitimately want more information visible per screen — moderate density, never cramped, but not padded out with empty space just to look "spacious." Generous spacing in a context that has nothing to say isn't premium, it's empty.

Spacing values are never invented ad hoc per screen. If a gap doesn't fit the scale, the scale is revisited deliberately — not silently overridden with a one-off number.

## 8. Border Radius System

| Token | Value | Use |
|---|---|---|
| `sm` | 10 | Inputs, chips, small controls |
| `md` | 16 | Standard cards |
| `lg` | 20 | Feature cards, Hero Cards, sheets, modals |
| `full` | 999 | Avatars, icon bubbles, pills |

Rule: radius scales with element size. A large card with a small radius looks unfinished; a small chip with a large radius looks like a pill by accident. Bigger element, proportionally bigger radius.

## 9. Elevation and Shadow System

Depth comes from exactly **one** mechanism at a time — never stack shadow + heavy color + border simultaneously; that combination is what makes an interface look like a template.

| Level | Light mode | Dark mode | Use |
|---|---|---|---|
| 0 — Flat | No shadow, no border | No lightening | Background canvas |
| 1 — Resting | Hairline border + barely-visible shadow (`shadowOpacity: 0.04`, `shadowRadius: 12`) | Surface lightened one step, no shadow | Standard cards |
| 1.5 — Hero | Same as Level 1, plus a 3px `accent`-colored top edge | Same, top edge in `accent` | Exactly one Hero Card per screen (§12) — the sole exception to "elevation is uniform" |
| 2 — Raised | Slightly stronger shadow, no border (shadow alone now carries the depth) | Surface lightened two steps | Pressed/active cards, inline modals |
| 3 — Overlay | Strongest shadow in the system, reserved | Surface lightened three steps + subtle scrim behind | Sheets, dialogs, true modals |

## 10. Iconography Language

**Ionicons**, outline variant by default, filled variant reserved for active/selected/emphasis states only (matches Apple's own tab bar and control conventions). Never mix icon sets.

| Size | Use |
|---|---|
| 16 | Inline with captions/footnotes |
| 20 | List rows, inline buttons |
| 24 | Tab bar, primary navigation |
| 32–40 | Empty states, feature callouts |

Icons always inherit a semantic color token — never an arbitrary decorative color chosen per-instance.

## 11. Illustration Language

No mascot characters, no cartoon illustration, no stock photography. This matches Apple/Linear/Notion's own restraint, not just a budget constraint. Default treatment for empty/informational states is icon + typography. If illustration is ever justified later (e.g., a first-run onboarding moment), it must be abstract/geometric and built only from the existing accent + neutral palette — never a separate illustration-specific color set.

## 12. Card System

**The single biggest fix in this revision.** v1.0's card system produced a uniform field of identical rectangles on every screen — technically consistent, but with no focal point, which is a real driver of "forgettable." A screen where every card carries equal visual weight is not calm, it's monotonous; Linear, Notion, and Revolut all give exactly one element more presence than everything around it.

| Variant | Elevation | Use |
|---|---|---|
| **Hero Card** *(new)* | Level 1.5 — accent top edge | Exactly **one** per screen: the single most important action or moment (e.g., "continue where you left off" on Home) |
| Standard Card | Level 1 | Default content container |
| Interactive Card | Level 1, with a pressed-state opacity/scale shift | Anything genuinely tappable |
| Stat Card | Level 1, compact, number-forward | Dashboard metrics — see §24 for why raw numbers alone aren't enough |
| Feature Card | Level 1–2, larger internal padding | Secondary CTAs |

Internal zoning inside a card is consistent: optional icon/eyebrow top, title, supporting text, optional footer action — never ad hoc per screen. **Rule:** if a screen has zero Hero Cards, it should be reconsidered — every screen should have exactly one thing that matters most, and the design should say so visually.

## 13. Button System

| Variant | Treatment | Use |
|---|---|---|
| Primary | Solid `accent` fill, `textOnAccent` label | The one primary action per screen |
| Secondary | Hairline border, `accent` label, transparent fill | Secondary actions alongside a primary |
| Tertiary / Text | No border or fill, `accent` label only | Low-emphasis actions |
| Destructive | `danger` fill or label | Rare, deliberate (e.g., account deletion) |

| Size | Height | Use |
|---|---|---|
| Large | 50 | Primary CTAs |
| Medium | 44 | Standard |
| Small | 36 (padding-compensated to still meet the 44pt minimum tap target) | Inline/compact contexts |

Disabled state: reduced opacity (`0.4`), never a different hue — the shape stays recognizable, just quieted. Press feedback is opacity/scale only — **no ripple effect** (§4).

## 14. Input Components

- **Text input:** hairline border by default; on focus, border shifts to `accent` with a subtle `accentMuted` background tint — never a harsh glow or color-shift animation. Label is always visible above the field — placeholder-as-label is explicitly rejected (it fails the moment a user starts typing and fails accessibility).
- **Error state:** `danger`-colored hairline + small icon + inline message below the field. No shake animation, no red glow — calm, not alarming, consistent with the brand personality.
- **Selection controls (exam options):** this is the app's single most-used interactive component and deserves its own treatment, not a generic radio button — see §26.

## 15. Navigation Philosophy

Shallow depth wherever possible — deep stack drilling is anxiety-inducing under exam-prep time pressure, and a candidate should always feel oriented. Tab bar is primary navigation. Modal sheets are used for focused, single-task flows (e.g., confirming the start of a timed session) rather than a full stack push. Back navigation is always available and predictable. No hidden gesture is ever the *only* way to accomplish something important — a visible affordance always exists alongside any gesture shortcut.

**State restoration, new in this revision:** returning to the app resumes exactly where the candidate left off — mid-question, mid-topic — rather than dropping them back at a tab root. This costs nothing to design for now and is expensive to retrofit later. It is also a genuine premium-feel differentiator: an app that remembers where you were is an app that respects your time, which is a trust signal (§3), not just a convenience.

## 16. Tab Bar Design

White/`surface` background, hairline top border (never a shadow — shadows under a tab bar are a Material convention). 4–5 items maximum. Labels always visible — icon-only tab bars fail both clarity and accessibility. Outline icon + tertiary color when inactive; filled icon + `accent` color when active, with the icon-activation micro-interaction defined in §27.

## 17. Headers

Top-of-tab screens (Home, Exams, Profile) use the `largeTitle` pattern at the top of the scroll content, matching iOS's large-title convention. Nested/sub-screens (once they exist — e.g., an exam detail screen reached from the Exams list) use a smaller `title2`/`title3` header with a back affordance, not a repeated large title on every depth level. Large titles are reserved for the top of each tab's own stack.

**Future enhancement, not built yet:** the large title collapsing into a compact inline title on scroll (native iOS behavior) — worth adding once these screens have enough content to actually scroll.

## 18. Lists

Two named variants:
- **Card List** (default): one card per row, generous spacing between cards — matches the calm, spacious brand and is the default choice everywhere.
- **Compact List** (secondary, used deliberately): hairline-divided rows inside a single card container, reserved for genuinely dense data where card-per-row would create excessive scrolling (e.g., a long topic list within one subject).

## 19. Empty States

Icon (tertiary color) + title + message, centered — but the message needs an actual **voice**, not clinical fallback text. "Henüz yok" (there's nothing yet) is a placeholder sentence; "Henüz bir konu tamamlamadın — başlamaya hazır mısın?" (you haven't finished a topic yet — ready to start?) is a product with a personality that reframes absence as an invitation, not a dead end. This is where "too cold/clinical" would otherwise show up most directly, since empty states are disproportionately common early in a user's life with the app. Every empty state must explain *why* it's empty and, where relevant, what would make it non-empty — never a bare "No data."

## 20. Loading Experience

**Reversed from v1.0.** Spinners are the single most generic signal in mobile UI — almost no top-tier app still uses one for primary content anymore. **Skeleton/shimmer loaders (matching the eventual content's shape — card outlines, text-line placeholders) are the default** for any primary content load: the Exams list, Dashboard stats, Profile. A spinner is now reserved only for short, button-triggered actions where there's no content shape to preview (e.g., submitting an answer). Loading is scoped to the section that's actually loading, not the whole screen, whenever a screen has more than one independent data source.

## 21. Error States

Two distinct tones, never conflated: **informational** (currently-expected states like "not configured yet" — `info` tone, calm) versus **genuine errors** (`danger` tone, muted rather than alarm-red). Errors pair with a clear next action (retry) wherever one exists — **flagged as a gap in the current MVP screens**, worth closing once this system is implemented.

## 22. Success States

Quiet, not celebratory, for routine actions — a small `success`-tinted accent (checkmark icon, subtle tinted card) is enough. Reserve genuine celebration entirely for Achievement Moments (§25); routine celebration is what makes an app feel gamified, which is explicitly rejected. This is a deliberate asymmetry: most of the app stays quiet so that the rare celebratory moment actually means something.

## 23. Progress Indicators

Restrained linear progress bar (`accent` fill on a muted track) or a minimal ring for compact contexts. No glossy gradient fills. **Progress bar fills always animate from the previous value to the new one (§27) — never snap instantly** — a snap reads as a data update; an animated fill reads as something that actually happened. Accompanying numbers always use tabular figures (§6).

## 24. Statistics Cards — Narrative Framing

**The second major fix in this revision.** A number-plus-caption stat tile is, on its own, the exact visual language of a B2B analytics dashboard (Stripe, Google Analytics) — and that association is disqualifying for "too much like an admin dashboard." The fix is not visual, it's editorial: **every stat card leads with a short narrative sentence, with the number as supporting detail, not the headline.**

Not: *"Doğruluk: %72"* (cold, data-first) — instead: *"Genel Yetenek'te güçleniyorsun"* with 72% shown as supporting detail beneath it. The number is still there, still tabular, still precise — but the sentence is what a person reads first, and a sentence has a point of view a number never does. This single principle is what separates Oura/Whoop-style premium personal analytics from generic BI tooling, and it applies to every Stat Card in the product without exception.

Composition: narrative headline (`headline` or `title3`), supporting tabular number (`title1`/`title2`, `textSecondary`), optional trend framed as forward motion ("son haftaya göre yükseldi," not a bare delta arrow). Grid: 2 columns on phone, consistent card sizing, `md` gap between cards.

## 25. Home & Dashboard Composition

These are two different screens with two different jobs, and v1.0 never drew the line between them — left unaddressed, Home would drift into becoming a second, smaller Dashboard, which dilutes both.

**Home** answers exactly one question: *"What should I do right now?"* Composition: one Hero Card (continue-studying / next-best-action), at most one supporting glance (a single momentum indicator, narratively framed per §24), and nothing else. Home is explicitly **not** a stat grid — if Home starts accumulating multiple stat cards, that content belongs on Dashboard instead.

**Dashboard** answers *"How am I actually doing?"* — a denser, more analytical space, but still never more than 4–6 stat cards visible without scrolling. Lead with one key metric prominently (overall readiness) before any secondary breakdown; use progressive disclosure (per-topic breakdown behind "see all," not dumped onto the main view). If charts are ever used, they are minimal and line-based — never 3D, never a heavily decorated pie chart.

### Achievement Moments *(new — specified for the first time)*

Reserved for 3–5 genuinely meaningful milestones across a candidate's whole journey: first topic mastered, first full deneme completed, halfway to the exam date, a personal-best score. Near-full-screen, brief (single tap or auto-dismiss), using `warmAccent` and — the one context where it's earned — the one permitted gradient exception (§34). Typography is larger and warmer than anywhere else in the app, but not loud: no sound, no confetti, no particle effects. The register is Apple Fitness's "close your rings" moment, not Duolingo's owl. **Rarity is the entire mechanism** — if this fires every session it becomes noise and stops working; if it fires five times across a whole exam-prep journey, each one is remembered.

## 26. Exam-Specific Components

The components that matter most in this entire system, since they're where the candidate spends the majority of their time in-app:

- **Question Card:** spacious card, generous line-height, comfortable reading width (§6) — the question body is the most important text on the screen and must never compete with surrounding chrome.
- **Option Row:** a full-width selectable row, not a small radio circle — this is the single highest-frequency interaction in the app and deserves a large, confident tap target. Unselected: hairline border, neutral background. Selected: `accent` border + `accentMuted` background + checkmark icon (with the selection micro-interaction in §27). After a result is revealed: the correct option gets `success`-tinted treatment, an incorrectly-selected option gets `danger`-tinted treatment — both reinforced with an icon, never color alone (accessibility, §31).
- **Timer/Countdown:** tabular figures, calm presentation. Color shifts subtly through the hierarchy (`textSecondary` → `textPrimary` → a muted warning tone only in the final moments) — never a flashing red countdown, which manufactures panic rather than focus.
- **Topic Progress Chip:** a small pill indicating mastery per topic ("Başlangıç" / "Gelişiyor" / "Hakim"), using accent-intensity to convey confidence level rather than red/amber/green traffic-light alarm coding — "not yet mastered" should read as "not yet," not "failing."
- **Deneme Summary Card:** post-exam results presented calmly and honestly — no over-the-top celebration for a pass, no harsh failure styling for a miss. A failed deneme reads as useful information for growth, matching the brand personality in §2.

## 27. Focus Mode *(new — the most important single addition)*

Actively answering a question is the single highest-leverage focus moment in the entire app, and v1.0 never addressed it directly. When a candidate is in an active question-solving session: the tab bar is hidden entirely (true full-screen focus, not just visually de-emphasized), no incidental live-updating UI is visible besides the timer itself, and nothing else competes for attention on screen. This is "focus-first" made literal and enforceable, not just a stated value — a design principle that never changes what actually renders isn't a principle, it's a slogan.

## 28. Motion Principles

Purposeful, restrained, quick — every animation must indicate a state change, guide attention, or confirm an action; nothing purely decorative.

**Named easing curve:** `cubic-bezier(0.22, 1, 0.36, 1)` ("Confident Ease") is used for every standard transition in the app — deliberately distinct from both a linear/default curve and from any bouncy spring easing. This is what "no bounce" (v1.0) becomes once it's actually specific enough to implement consistently rather than left to per-screen interpretation.

Standard UI transition duration: 150–250ms. Screen transitions: 300–400ms. Entrances ease-out (decelerate — feels natural), exits ease-in. **No bouncy/springy easing anywhere** — that reads as playful/gamified, which is explicitly rejected.

## 29. Micro-Interactions *(expanded — v1.0 only covered button press)*

Specifically-designed moments, not left generic:

| Interaction | Treatment |
|---|---|
| Option selection | Border + background transition, 120ms, Confident Ease. Paired with a light haptic once §30 is implemented |
| Progress bar fill | Animates from previous to new value, 400–600ms, Confident Ease — never snaps (§23) |
| Tab icon activation | Outline→filled cross-fade + a subtle scale pulse (1.0 → 1.08 → 1.0), ~200ms |
| Correct/incorrect reveal | Icon scales in with no overshoot — a controlled arrival, not a bounce |
| Button press | Opacity shift only (already built) — never a ripple |

Screen-to-screen transitions follow each platform's native stack convention (iOS push/pop, Android's equivalent) — this is navigation physics, not visual styling, so unlike the tab bar it is *not* unified cross-platform; users' platform-level muscle memory should be respected here. Tab switches are instant/fade, never a sliding animation.

## 30. Haptic Feedback Guidelines

Not yet implemented (would need `expo-haptics`, not currently installed — flagged as a future dependency, not added now). Principles for when it is built: light haptic on selecting an exam option (confirms the tap registered), a success-type haptic on completing a deneme or an Achievement Moment (§25), a light warning haptic on an invalid action. **No haptic on routine navigation** (tab switches, scrolling) — haptics are reserved for meaningful confirmations; overusing them cheapens every instance.

## 31. Accessibility Guidelines

- WCAG AA contrast minimum (4.5:1 text, 3:1 large text/UI components) for every text/background pairing in both light and dark mode, including the new `warmAccent` — needs verification once implemented, not assumed correct by eye.
- Minimum touch targets: 44×44pt (iOS) / 48×48dp (Android) for every interactive element, regardless of its visual size.
- Layouts stay flexible for Dynamic Type / font scaling — no fixed-height text containers that would clip enlarged text.
- State is never conveyed by color alone anywhere in the system — every color-coded state (correct/incorrect, active/inactive) is paired with an icon or text label.
- Full screen-reader label coverage on every interactive element.
- Respect the OS-level reduce-motion setting — non-essential animation (including Achievement Moments) is disabled when a user has that preference enabled.

## 32. Responsive Layout Rules

Phone-only for the current MVP scope — tablet/landscape is an explicit future decision, not addressed here. Content width is still capped (roughly 600px) even on large-screen Android devices/foldables, so text and cards never stretch uncomfortably wide. Every screen respects safe areas. Portrait-only orientation (already set in `app.json`).

## 33. Component Naming Conventions

PascalCase component files matching their exported component name (already established). Prop naming is semantic and consistent across every component: `tone` for status/semantic variants (`info`/`danger`/`success`), `variant` for visual-style variants (typography scale, button style, card tier), no abbreviations. Boolean props follow platform convention when mirroring a native prop (`disabled`, matching RN itself) and use `is`/`has` prefixes for app-specific booleans where that reads naturally.

## 34. Design Tokens Structure

Current structure (`src/theme/colors.ts`, `typography.ts`, `spacing.ts`, `radii.ts`, `elevation.ts`) is a flat, static export — correct for a light-mode-only MVP, but **not yet dark-mode-capable**. Implementing dark mode (§5) is a structural change, not a token-value change: it means splitting into `colors.light.ts` / `colors.dark.ts`, introducing a `ThemeProvider`/`useTheme()` resolving against the system color scheme, and every component that currently imports `colors` directly switching to consume it through that hook instead. This is flagged here explicitly so it isn't silently redone piecemeal later.

**Visual consistency enforcement:** any new screen or component must be composed from the tokens and primitives defined in this document. If a genuine gap is found — a case this document doesn't cover — the document is amended *first*, deliberately, before a one-off style is used anywhere. No screen-specific style diverges silently; that's how design systems rot.

---

## 35. Premium Membership Presentation *(new)*

Confident, not urgent — this is the section where the brand personality (§2) is most at risk of being violated, because commercial pressure is exactly what tempts a product into dark patterns. **Explicitly banned:** countdown timers, fake scarcity ("only 3 spots left"), red "LIMITED TIME" badges, artificial urgency of any kind. A trusted tutor does not need to manufacture pressure to be worth paying for.

Presentation: free-vs-premium comparisons use calm iconography — a checkmark for included, a muted dash (not a red X) for not included. Pricing and value numbers receive the same tabular-figure, elevated typographic treatment as exam statistics (§6, §24) — premium is communicated through typographic respect, not banner/badge styling. `warmAccent` may be used here (§5) since this is one of its two sanctioned contexts, paired with the one permitted gradient exception (§36) if it genuinely improves the moment — never as default background decoration.

---

## 36. On Gradients

Premium does not mean gradients. Premium means composition, typography, spacing, hierarchy, and interaction quality — the entire system above is built on flat color for exactly this reason. The one narrow exception: small, tasteful gradients may be used where they genuinely improve a specific experience — a splash screen, an onboarding moment, a premium-membership surface (§35), or an Achievement Moment (§25) — never as default decoration on cards, buttons, or backgrounds throughout the app. If a gradient shows up anywhere outside those contexts, that is a violation of this system, not a stylistic choice.

---

**Next step:** wait for approval. Once accepted, implementation should proceed incrementally against this document — starting with reconciling the already-built `src/theme/`/`src/components/` against §5–§14 exactly (including the new `warmAccent` tokens and the Hero Card tier), before touching Focus Mode (§27) or any exam-specific component in §26.
