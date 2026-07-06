import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii } from '../theme';

export interface IconChipProps {
  icon: ReactNode;
  size?: number;
  tone?: 'accent' | 'neutral';
}

// Design System v2.0's small icon-square: a rounded-lg tinted container
// around a single icon, repeated across stitch's "Hızlı Erişim" grid and
// topic-list rows. Icon-library-agnostic by design (accepts a rendered
// icon element) since different screens pull icons from different sets
// depending on glyph availability.
export function IconChip({ icon, size = 40, tone = 'accent' }: IconChipProps) {
  const backgroundColor = tone === 'accent' ? colors.accentMuted : colors.surfaceSecondary;
  return (
    <View style={[styles.chip, { width: size, height: size, backgroundColor }]}>{icon}</View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
