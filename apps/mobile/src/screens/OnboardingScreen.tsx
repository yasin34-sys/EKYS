import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, PrimaryButton, FadeInUp } from '../components';
import { colors, radii, spacing } from '../theme';

// No real onboarding photography exists for this app (ekranlar/onboarding_splash
// uses a stock desk photo, which would be invented visual content). A large
// icon badge reuses the same honest, asset-light convention InfoState already
// established elsewhere rather than faking a hero image.
interface OnboardingPage {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

// Copy describes only features that actually exist today (practice
// packages, timed denemeler, the repeat pool, real statistics) — no
// invented stats, streaks, or testimonials.
const pages: OnboardingPage[] = [
  {
    icon: 'school-outline',
    title: 'EKYS CEPTE ile çalış',
    message: "Eğitim Kurumu Yöneticiliği Sınavı'na güncel içeriklerle, kendi hızında hazırlan.",
  },
  {
    icon: 'book-outline',
    title: 'Ders paketleri ve denemeler',
    message: 'Konulara göre çalış, gerçek sınav formatında zamanlı denemeler çöz.',
  },
  {
    icon: 'refresh-outline',
    title: 'Yanlışlarını tekrar et, gelişimini takip et',
    message: 'Yanlış yaptığın sorular tekrar havuzunda birikir; istatistiklerinle ilerlemeni gör.',
  },
];

export interface OnboardingScreenProps {
  onComplete: () => void;
}

// Deliberately not under app/ — this is rendered directly by
// app/_layout.tsx before the Stack ever mounts (only on first launch,
// gated by an AsyncStorage flag), never reached via router navigation.
// Living under app/ would register it as a real, navigable route
// (e.g. router.push('/onboarding')) despite requiring an onComplete
// prop no navigation call site could ever supply — a plain component
// under src/screens avoids that trap entirely.
export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[pageIndex];
  const isLastPage = pageIndex === pages.length - 1;

  function handleNext() {
    if (isLastPage) {
      onComplete();
      return;
    }
    setPageIndex((current) => current + 1);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <FadeInUp key={pageIndex} style={styles.pageWrap}>
          <View style={styles.iconWrap}>
            <Ionicons name={page.icon} size={40} color={colors.accent} />
          </View>
          <AppText variant="title1" style={styles.title}>
            {page.title}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.message}>
            {page.message}
          </AppText>
        </FadeInUp>

        <View style={styles.dotsRow}>
          {pages.map((_, index) => (
            <View key={index} style={[styles.dot, index === pageIndex && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel="Atla"
            style={styles.skipButton}
            hitSlop={8}
          >
            <AppText variant="headline" color="secondary">
              Atla
            </AppText>
          </Pressable>
          <View style={styles.nextButtonWrap}>
            <PrimaryButton label={isLastPage ? 'Başla' : 'İleri'} onPress={handleNext} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  pageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { textAlign: 'center', marginBottom: spacing.sm },
  message: { textAlign: 'center', paddingHorizontal: spacing.md },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.accent,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  nextButtonWrap: { flex: 1, marginLeft: spacing.lg },
});
