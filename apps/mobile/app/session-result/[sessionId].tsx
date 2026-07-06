import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Animated, AccessibilityInfo } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { colors, spacing, confidentEase } from '../../src/theme';

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
  const totalQuestions = Number(params.totalQuestions);
  // Derived from params already passed to this screen — not a new
  // metric, not fetched, just totalQuestions minus the two counts
  // already shown.
  const blankCount = Math.max(0, totalQuestions - correctCount - wrongCount);

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

      // Routed using the session's own fields, not the request params —
      // StartExamSessionUseCase can return an existing IN_PROGRESS
      // session (idempotent resume) rather than the one just requested.
      router.replace({
        pathname: '/exam-session/[sessionId]',
        params: { sessionId: newSession.id, packageId: newSession.packageId, examId: newSession.examId },
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
        <AppText variant="footnote" color="tertiary" style={styles.eyebrow}>
          SINAV SONUCU
        </AppText>
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

      <View style={styles.statsGrid}>
        <StatCard icon="checkmark-circle" tone="success" label="Doğru" value={String(correctCount)} />
        <StatCard icon="close-circle" tone="danger" label="Yanlış" value={String(wrongCount)} />
        <StatCard icon="ellipse-outline" tone="neutral" label="Boş" value={String(blankCount)} />
        <StatCard icon="time-outline" tone="info" label="Süre" value={timeUsedLabel} />
      </View>

      <PrimaryButton label="Tekrar Dene" onPress={handleRetry} disabled={isRetrying} />
      <View style={styles.secondaryButtonWrap}>
        <SecondaryButton label="Ana Sayfaya Dön" onPress={() => router.dismissTo('/')} />
      </View>
      </FadeInUp>
    </ScreenContainer>
  );
}

const statTones = {
  success: { background: colors.successMuted, icon: colors.success },
  danger: { background: colors.dangerMuted, icon: colors.danger },
  neutral: { background: colors.surfaceSecondary, icon: colors.textTertiary },
  info: { background: colors.infoMuted, icon: colors.info },
} as const;

function StatCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: keyof typeof statTones;
  label: string;
  value: string;
}) {
  const toneColors = statTones[tone];
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: toneColors.background }]}>
        <Ionicons name={icon} size={20} color={toneColors.icon} />
      </View>
      <View style={styles.statTextWrap}>
        <AppText variant="footnote" color="secondary">
          {label}
        </AppText>
        <AppText variant="title3" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  resultCard: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  eyebrow: { letterSpacing: 0.5, marginBottom: spacing.xs },
  scoreValue: { marginTop: spacing.sm },
  narrative: { marginTop: spacing.xs, textAlign: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: { flexShrink: 1 },
  secondaryButtonWrap: { marginTop: spacing.sm },
});
