// Inter as the single typeface on both platforms — deliberately not
// relying on RN's 'System' font, which resolves to Roboto on Android
// and reads as Material Design. Loaded via useAppFonts() (see
// FontLoader.ts) before anything renders.
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// Design System v2.0 type scale — mapped from stitch's rendered scale
// (headline-lg-mobile/md/sm, body-lg/md/sm, label-md/sm; the desktop-only
// headline-lg at 32px is not used since this app is phone-only). Variant
// *names* are kept stable (largeTitle/title1/...) so existing call sites
// (variant="title2" etc.) don't need to change — only the underlying
// values move to match stitch pixel-for-pixel.
//
// Note: "headline" now maps to stitch's label-md (14/600), because that is
// the actual size/weight stitch uses for button labels and short emphasized
// labels — the two highest-fidelity-priority use cases (Priority/Button
// text) — rather than to a generic "emphasized body" size as before.
export const typography = {
  largeTitle: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 32, letterSpacing: 0 }, // headline-lg-mobile
  title1: { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 32, letterSpacing: 0 }, // headline-md
  title2: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 28, letterSpacing: 0 }, // headline-sm
  title3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24, letterSpacing: 0 }, // body-lg size, semibold
  headline: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 16, letterSpacing: 0 }, // label-md
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 }, // body-md
  subhead: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 }, // body-sm
  footnote: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0 }, // no direct stitch equivalent
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 }, // label-sm
} as const;
