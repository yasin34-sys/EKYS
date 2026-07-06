import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { colors, screenPadding } from '../theme';

export interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  centered?: boolean;
  // Renders full-bleed, inside the safe area but above the padded content
  // — for the persistent brand bar (TopAppBar) every ekranlar screen shows
  // above its own page title. Optional and unused by existing call sites,
  // so this is additive only.
  topBar?: ReactNode;
}

// Top-anchored by default (content starts at the top, like a real
// screen), not vertically centered — dead-centering everything is
// what makes placeholder screens read as placeholders. centered is
// available for the deliberate exceptions (bootstrap states).
export function ScreenContainer({
  children,
  scroll = false,
  centered = false,
  topBar,
}: ScreenContainerProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {topBar}
        <ScrollView
          contentContainerStyle={[styles.content, centered && styles.centered]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {topBar}
      <View style={[styles.content, styles.flex, centered && styles.centered]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPadding },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
