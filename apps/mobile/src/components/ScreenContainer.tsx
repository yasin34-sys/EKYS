import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, screenPadding } from '../theme';

// react-native's own built-in SafeAreaView only computes real insets on
// iOS — on Android it is effectively a no-op, which is why the TopAppBar
// brand bar overlapped the status bar there. react-native-safe-area-context
// (already a dependency) computes insets correctly on both platforms, via
// the SafeAreaProvider mounted once at the app root (see app/_layout.tsx).
// Restricted to the top edge only: bottom is deliberately left alone —
// tab screens already have their bottom space reserved by the tab bar
// itself (React Navigation's bottom-tabs already factors the bottom
// inset into the tab bar's own height), so adding a bottom inset here
// too would pad the content away from the tab bar unnecessarily.

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
