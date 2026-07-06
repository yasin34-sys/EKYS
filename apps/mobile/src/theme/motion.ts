import { Easing } from 'react-native';

// Design System §28: "Confident Ease" — cubic-bezier(0.22, 1, 0.36, 1),
// used for every standard transition in the app. Deliberately distinct
// from both a linear/default curve and any bouncy spring easing (§29:
// "no bounce anywhere" — reads as playful/gamified, which is rejected).
export const confidentEase = Easing.bezier(0.22, 1, 0.36, 1);

// Duration bands from Design System §28.
export const motionDuration = {
  standard: 200, // 150-250ms: standard UI transitions
  screen: 350, // 300-400ms: screen transitions
  progressFill: 500, // 400-600ms: progress bar / score fills (§23/§29)
} as const;
