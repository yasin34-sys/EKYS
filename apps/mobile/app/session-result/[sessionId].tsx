import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Animated, AccessibilityInfo } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  useExamSessionRepository,
  useEntitlementRepository,
  usePackageRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { StartExamSessionUseCase } from '../../src/application/StartExamSessionUseCase';
import { expoIdGenerator } from '../../src/application/shared/expoIdGenerator';
import { systemClock } from '../../src/application/shared/systemClock';
import {
  ScreenContainer,
  AppText,
  Card,
  PrimaryButton,
  SecondaryButton,
  FadeInUp,
} from '../../src/components';
import { spacing, confidentEase } from '../../src/theme';

// Score counts up on entry rather than appearing instantly (Screen Spec
// §11) — the one place in the product where an animating number is
// earned, since a completed deneme is a genuinely significant moment.
// Respects reduce-motion the same way Skeleton/FadeInUp do.
function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);
  const animRef = useRef<Animated.Value | null>(null);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setValue(target);
        return;
      }
      const anim = new Animated.Value(0);
      animRef.current = anim;
      anim.addListener(({ value: v }) => setValue(Math.round(v)));
      Animated.timing(anim, {
        toValue: target,
        duration: durationMs,
        easing: confidentEase,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      cancelled = true;
      animRef.current?.removeAllListeners();
    };
    // Runs once per mounted result — target/duration are stable per screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

// Pure display screen: every value here was already computed by
// FinishExamSessionUseCase + GetAttemptsBySessionUseCase in the
// exam-session screen and passed through as real, already-known data
// — no re-fetching, no "get session by id" use case needed.
export default function SessionResultScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    packageId: string;
    examId: string;
    score: string;
    passed: string;
    passingScore: string;
    correctCount: string;
    wrongCount: string;
    totalQuestions: string;
    timeUsedSeconds: string;
  }>();

  const score = Number(params.score);
  const passed = params.passed === 'true';
  const passingScore = Number(params.passingScore);
  const correctCount = Number(params.correctCount);
  const wrongCount = Number(params.wrongCount);
  const timeUsedSeconds = Number(params.timeUsedSeconds);

  const timeUsedMinutes = Math.floor(timeUsedSeconds / 60);
  const timeUsedRemainderSeconds = timeUsedSeconds % 60;
  const timeUsedLabel = `${timeUsedMinutes} dk ${timeUsedRemainderSeconds} sn`;

  const scoreDiff = Math.abs(Math.round(score - passingScore));
  const narrative = passed
    ? `Geçme puanının ${scoreDiff} puan üzerindesin.`
    : `Geçme puanının ${scoreDiff} puan altındasın.`;

  const displayedScore = useCountUp(score);

  const examSessionRepository = useExamSessionRepository();
  const entitlementRepository = useEntitlementRepository();
  const packageRepository = usePackageRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    if (!userProfile) return;
    setIsRetrying(true);
    try {
      const newSession = await new StartExamSessionUseCase({
        examSessionRepository,
        entitlementRepository,
        packageRepository,
        generateId: expoIdGenerator,
        now: systemClock,
      }).execute({
        userId: userProfile.id,
        examId: params.examId,
        packageId: params.packageId,
      });

      router.replace({
        pathname: '/exam-session/[sessionId]',
        params: { sessionId: newSession.id, packageId: params.packageId, examId: params.examId },
      });
    } catch {
      setIsRetrying(false);
      Alert.alert('Hata', 'Sınav yeniden başlatılamadı. Lütfen tekrar dene.');
    }
  }

  return (
    <ScreenContainer scroll>
      <FadeInUp>
      <Card variant="hero" style={styles.resultCard}>
        {/* Deliberately the same visual register regardless of pass/fail —
            Design System §2/§21: a failed deneme reads as information, not
            a verdict, so it is never styled as the opposite extreme of a
            pass (no red headline/score). */}
        <AppText variant="title2">{passed ? 'Sınavı Geçtin' : 'Sınavı Geçemedin'}</AppText>
        <AppText
          variant="largeTitle"
          color="primary"
          style={[styles.scoreValue, { fontVariant: ['tabular-nums'] }]}
        >
          {displayedScore}
        </AppText>
        <AppText variant="subhead" color="secondary" style={styles.narrative}>
          {narrative}
        </AppText>
      </Card>

      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <StatItem label="Doğru" value={String(correctCount)} color="success" />
          <StatItem label="Yanlış" value={String(wrongCount)} color="danger" />
        </View>
        <View style={styles.statsRow}>
          <StatItem label="Doğruluk" value={`%${score}`} color="primary" />
          <StatItem label="Süre" value={timeUsedLabel} color="primary" />
        </View>
      </Card>

      <PrimaryButton label="Tekrar Dene" onPress={handleRetry} disabled={isRetrying} />
      <View style={styles.secondaryButtonWrap}>
        <SecondaryButton label="Ana Sayfaya Dön" onPress={() => router.dismissTo('/')} />
      </View>
      </FadeInUp>
    </ScreenContainer>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'success' | 'danger' | 'primary';
}) {
  return (
    <View style={styles.statItem}>
      <AppText variant="title3" color={color === 'primary' ? 'primary' : color}>
        {value}
      </AppText>
      <AppText variant="caption" color="tertiary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  resultCard: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  scoreValue: { marginTop: spacing.sm },
  narrative: { marginTop: spacing.xs, textAlign: 'center' },
  statsCard: { marginBottom: spacing.lg, gap: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: spacing.xs / 2 },
  secondaryButtonWrap: { marginTop: spacing.sm },
});
