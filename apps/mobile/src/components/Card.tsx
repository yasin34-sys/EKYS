import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, softShadow, spacing } from '../theme';

export type CardVariant = 'standard' | 'hero';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
}

// Depth from a hairline border plus a barely-there ambient shadow — matches
// stitch's "Professional Card" treatment (white surface, 1px surface-variant
// border, very soft wide shadow).
//
// 'hero' escalates emphasis for exactly one card per screen (the single
// most important action or moment) — Design System v2.0 has no dedicated
// "highlighted card" mechanic outside the pricing screen's badge treatment
// (handled separately, contextually, where that's built), so here it's
// modeled simply as an accent-colored border + a slightly stronger shadow,
// closest to stitch's "Yoğun Tekrar Paketi" highlighted-card border.
export function Card({ variant = 'standard', style, ...props }: CardProps) {
  return <View style={[styles.card, variant === 'hero' && styles.hero, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    ...softShadow,
  },
  hero: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
});
