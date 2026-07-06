import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

export interface TopAppBarProps {
  rightAccessory?: ReactNode;
}

// Design System v2.0's TopAppBar — a fixed brand header (logo + wordmark)
// present on every screen in the stitch references, replacing v1.1's
// per-screen largeTitle-only headers. Screens still render their own page
// title beneath this (see stitch/*/screen.png — "EKYS CEPTE" bar, then a
// separate page heading like "İstatistikler" below it).
export function TopAppBar({ rightAccessory }: TopAppBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <MaterialIcons name="school" size={24} color={colors.accent} />
        <AppText variant="title1">EKYS CEPTE</AppText>
      </View>
      {rightAccessory}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
