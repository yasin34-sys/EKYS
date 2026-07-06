// Design System v2.0 radius scale — from stitch's rendered borderRadius
// config (DEFAULT=4, lg=8, xl=12, full=9999). Buttons/inputs/chips use the
// smaller radius; cards use the larger one — same two-step relationship as
// before, values updated.
export const radii = {
  sm: 8, // buttons, inputs, icon chips
  md: 12, // standard cards
  lg: 16, // reserved for larger sheets/feature surfaces (not exercised by any stitch screen yet)
  full: 9999, // avatars, pills, circular progress
} as const;
