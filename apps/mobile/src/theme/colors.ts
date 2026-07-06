// Design System v3.0 — repaletted from ekranlar/*/code.html (the current
// visual reference batch) plus ekranlar/premium_academic_minimalist/DESIGN.md,
// replacing v2.0's cool Material-blue palette. Token *names* are kept
// stable so no call site changes — only values move, same policy the
// v1.1 -> v2.0 migration already used. Where the ekranlar batch disagreed
// with itself (background #FAFAF8 vs #f9f9ff; two indigo shades; gold used
// in only 2/15 screens vs mustard/indigo elsewhere), one canonical value is
// picked here rather than reproducing the inconsistency — preferring
// whichever value the batch's own DESIGN.md prose and the majority of
// screens agree on.
export const colors = {
  background: '#FAFAF8', // warm off-white canvas — matches 13/15 ekranlar screens' inline override and DESIGN.md prose
  surface: '#FFFFFF', // cards
  surfaceSecondary: '#F2F1EE', // nested/inset fills, neutral chip bg — warm-neutral family, not cool gray
  progressTrack: '#EDEDEA', // progress bar / donut ring track

  border: '#E5E7EB', // default card/divider border — DESIGN.md's Level-1 hairline, also hardcoded literally in mevzuat_denemesi
  borderStrong: '#C7C4D8', // outline-variant — input borders, stronger dividers

  textPrimary: '#141B2B', // on-surface, as rendered
  textSecondary: '#45464D', // on-surface-variant — already matched the old palette exactly
  textTertiary: '#76777D', // outline — already matched the old palette exactly
  textOnAccent: '#FFFFFF',

  // The only accent used for actions, links, active states, progress fills.
  accent: '#4F46E5',
  accentMuted: '#F1F3FF', // accent-tinted backgrounds — the exact value used for selected option-row backgrounds across the batch
  accentPressed: '#3525CD', // accent on press/hover — the batch's darker indigo shade

  // Reserved exclusively for premium/subscription surfaces and achievement
  // moments (only 2/15 ekranlar screens actually use this; not consumed
  // anywhere yet in Phase 2A — added now so later phases have one shared
  // token instead of each screen picking its own gold).
  gold: '#D4AF37',
  goldMuted: '#FFFAF0',

  // Apple sign-in button fill — not a general-purpose token, reserved for
  // that one button (not built yet).
  appleButton: '#000000',

  success: '#059669',
  successMuted: '#D1FAE5',
  info: '#45464D',
  infoMuted: '#F2F1EE',
  danger: '#BA1A1A', // already matched the ekranlar batch's error token exactly
  dangerMuted: '#FFDAD6', // already matched the ekranlar batch's error-container token exactly
  onDangerMuted: '#93000A', // on-error-container — text/icon on dangerMuted backgrounds
} as const;
