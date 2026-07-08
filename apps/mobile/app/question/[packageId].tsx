import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useQuestionRepository,
  useAttemptRepository,
  useLearningMetricsRepository,
  useCurrentUserProfile,
  useRepeatPoolRepository,
  useTrialAccessRepository,
  useTrialGrantSync,
  useTopicRepository,
} from '../../src/services/hooks';
import { GetQuestionsByPackageUseCase } from '../../src/application/GetQuestionsByPackageUseCase';
import { GetRepeatPoolUseCase } from '../../src/application/GetRepeatPoolUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetTrialQuestionByIndexUseCase } from '../../src/application/GetTrialQuestionByIndexUseCase';
import type { GetTrialQuestionResult } from '../../src/application/GetTrialQuestionByIndexUseCase';
import { SubmitAnswerUseCase } from '../../src/application/SubmitAnswerUseCase';
import { expoIdGenerator } from '../../src/application/shared/expoIdGenerator';
import { systemClock } from '../../src/application/shared/systemClock';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  EmptyState,
  InfoState,
  BackButton,
  QuestionCard,
  OptionRow,
  ProgressBar,
  PrimaryButton,
  SecondaryButton,
  FadeInUp,
} from '../../src/components';
import { colors, radii, spacing } from '../../src/theme';
import type { OptionRowState } from '../../src/components/OptionRow';
import type { Question } from '../../src/domain';

interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
}

// Sentinel used by the Repeat Pool screen (app/repeat-pool.tsx) to
// source questions from GetRepeatPoolUseCase instead of a real package.
const REPEAT_POOL_SENTINEL = 'repeat-pool';

export default function QuestionScreen() {
  const { packageId, examId, accessMode } = useLocalSearchParams<{
    packageId: string;
    examId?: string;
    accessMode?: string;
  }>();
  const isRepeatMode = packageId === REPEAT_POOL_SENTINEL;
  // TRIAL is only ever reached via Package Detail's "Ücretsiz Dene" CTA
  // (see app/package/[id].tsx), never for Repeat Pool — the `&&
  // !isRepeatMode` guard is defensive, not load-bearing, since the two
  // routes are already mutually exclusive by construction.
  const isTrialMode = accessMode === 'trial' && !isRepeatMode;

  const questionRepository = useQuestionRepository();
  const attemptRepository = useAttemptRepository();
  const learningMetricsRepository = useLearningMetricsRepository();
  const repeatPoolRepository = useRepeatPoolRepository();
  const trialAccessRepository = useTrialAccessRepository();
  const trialGrantSync = useTrialGrantSync();
  const topicRepository = useTopicRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const [activeQuestions, setActiveQuestions] = useState<Question[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean } | null>(null);
  const [sessionResults, setSessionResults] = useState<QuestionResult[]>([]);
  const [passResults, setPassResults] = useState<QuestionResult[]>([]);

  // FULL practice and Repeat Pool: unchanged eager whole-list fetch.
  // Disabled entirely in TRIAL mode — GetQuestionsByPackageUseCase must
  // never be called for a metered trial package (Phase 2B.4B's design:
  // eagerly loading every question would consume the trial cap on
  // questions the user may never reach).
  const questionsQuery = useQuery({
    queryKey: isRepeatMode
      ? ['questions', 'repeatPool', userProfile?.id, examId]
      : ['questions', 'byPackage', packageId, accessMode ?? 'full'],
    queryFn: () =>
      isRepeatMode
        ? new GetRepeatPoolUseCase({ repeatPoolRepository, questionRepository }).execute(
            userProfile!.id,
            examId as string,
          )
        : new GetQuestionsByPackageUseCase({ questionRepository }).execute(packageId as string),
    enabled: isTrialMode
      ? false
      : isRepeatMode
        ? Boolean(userProfile) && Boolean(examId)
        : Boolean(packageId),
  });

  // TRIAL: one question at a time via GetTrialQuestionByIndexUseCase —
  // never GetQuestionsByPackageUseCase. currentIndex is part of the
  // query key deliberately: advancing to the next question is a new
  // request (a new grant may be required), not a slice into an
  // already-fetched array the way FULL/Repeat work.
  const trialQuestionQuery = useQuery({
    queryKey: ['trialQuestion', packageId, userProfile?.id, currentIndex],
    queryFn: () =>
      new GetTrialQuestionByIndexUseCase({
        questionRepository,
        trialAccessRepository,
        trialGrantSync,
      }).execute({
        userId: userProfile!.id,
        packageId: packageId as string,
        questionIndex: currentIndex,
      }),
    enabled: isTrialMode && Boolean(userProfile) && Boolean(packageId),
  });

  useEffect(() => {
    if (questionsQuery.data && activeQuestions === null) {
      setActiveQuestions(questionsQuery.data);
    }
  }, [questionsQuery.data, activeQuestions]);

  const submitMutation = useMutation({
    mutationFn: (vars: { questionId: string; examId: string; selectedOptionId: string }) =>
      new SubmitAnswerUseCase({
        attemptRepository,
        questionRepository,
        learningMetricsRepository,
        generateId: expoIdGenerator,
        now: systemClock,
      }).execute({
        userId: userProfile!.id,
        examId: vars.examId,
        questionId: vars.questionId,
        examSessionId: null,
        sequence: null,
        selectedOptionId: vars.selectedOptionId,
      }),
    onSuccess: (data, vars) => {
      setResult({ isCorrect: data.isCorrect });
      const entry: QuestionResult = { questionId: vars.questionId, isCorrect: data.isCorrect };
      setSessionResults((prev) => [...prev, entry]);
      setPassResults((prev) => [...prev, entry]);
    },
  });

  // Unified across modes so the shared question/summary rendering below
  // doesn't need to branch on isTrialMode at all — only the sourcing of
  // these three values differs.
  const trialResult = isTrialMode ? trialQuestionQuery.data : undefined;
  const isTrialQuestionResult = trialResult?.status === 'QUESTION';
  const isTrialEnd = trialResult?.status === 'END';

  const currentQuestion: Question | undefined = isTrialMode
    ? isTrialQuestionResult
      ? trialResult.question
      : undefined
    : activeQuestions?.[currentIndex];

  // Topic breadcrumb: resolved from currentQuestion.examId, not route
  // params — this works identically for FULL, TRIAL, and Repeat Pool
  // (Repeat Pool's own examId route param is the source exam already, but
  // reading it off the question itself keeps this independent of that and
  // avoids relying on Repeat Pool's params staying shaped a particular
  // way). No fabricated name: the chip is only ever rendered once a real
  // topic name resolves (see render below).
  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', currentQuestion?.examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(currentQuestion!.examId),
    enabled: Boolean(currentQuestion?.examId),
  });
  const topicName = currentQuestion
    ? (topicsQuery.data?.find((topic) => topic.id === currentQuestion.topicId)?.name ?? null)
    : null;

  const totalQuestions = isTrialMode
    ? isTrialQuestionResult
      ? trialResult.totalQuestions
      : 0
    : (activeQuestions?.length ?? 0);

  const isPastEnd = isTrialMode
    ? isTrialEnd
    : activeQuestions !== null && currentIndex >= activeQuestions.length;

  const isLoading = isTrialMode ? trialQuestionQuery.isLoading : questionsQuery.isLoading;
  const submitted = result !== null;

  function handleSelect(optionId: string) {
    if (submitted) return;
    setSelectedOptionId(optionId);
  }

  function handleSubmit() {
    if (!currentQuestion || !selectedOptionId || !userProfile) return;
    submitMutation.mutate({
      questionId: currentQuestion.id,
      examId: currentQuestion.examId,
      selectedOptionId,
    });
  }

  // Identical for both modes: advancing the index is what drives
  // trialQuestionQuery's next fetch (new query key), the same way it
  // already drives activeQuestions[currentIndex] for FULL/Repeat.
  function handleNext() {
    setCurrentIndex((index) => index + 1);
    setSelectedOptionId(null);
    setResult(null);
    submitMutation.reset();
  }

  function handleRetryWrong() {
    const wrongIds = new Set(passResults.filter((r) => !r.isCorrect).map((r) => r.questionId));
    const wrongQuestions = (activeQuestions ?? []).filter((q) => wrongIds.has(q.id));
    setActiveQuestions(wrongQuestions);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setResult(null);
    setPassResults([]);
    submitMutation.reset();
  }

  function getOptionState(optionId: string, isCorrect: boolean): OptionRowState {
    if (!submitted) {
      return optionId === selectedOptionId ? 'selected' : 'default';
    }
    if (isCorrect) return 'correct';
    if (optionId === selectedOptionId) return 'incorrect';
    return 'dimmed';
  }

  const correctCount = sessionResults.filter((r) => r.isCorrect).length;
  const wrongCount = sessionResults.filter((r) => !r.isCorrect).length;
  const totalAttempts = sessionResults.length;
  const accuracyPercent = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
  const currentPassWrongCount = passResults.filter((r) => !r.isCorrect).length;

  return (
    <ScreenContainer scroll={isPastEnd}>
      <View style={styles.headerRow}>
        <BackButton />
        {currentQuestion && !isPastEnd ? (
          <View
            style={styles.progressPill}
            accessibilityLabel={`Soru ${currentIndex + 1} / ${totalQuestions}`}
          >
            <AppText variant="footnote" color="secondary" style={styles.progressPillText}>
              {currentIndex + 1} / {totalQuestions}
            </AppText>
          </View>
        ) : null}
      </View>

      {currentQuestion && !isPastEnd ? (
        <View style={styles.progressWrap}>
          <ProgressBar progress={(currentIndex + 1) / totalQuestions} height={4} />
        </View>
      ) : null}

      {isLoading ? (
        <View>
          <Card style={styles.questionCardSkeleton}>
            <Skeleton width="90%" height={18} style={styles.skeletonLine} />
            <Skeleton width="70%" height={18} />
          </Card>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} width="100%" height={56} style={styles.skeletonOption} />
          ))}
        </View>
      ) : isTrialMode &&
        trialResult &&
        trialResult.status !== 'QUESTION' &&
        trialResult.status !== 'END' ? (
        // The condition above (not just isTrialQuestionResult/isTrialEnd)
        // is what lets TypeScript narrow trialResult to TrialIssueResult
        // here — narrowing through separately-named booleans wouldn't.
        <View style={styles.centerFill}>{renderTrialIssue(trialResult)}</View>
      ) : isTrialMode && trialQuestionQuery.error ? (
        <View style={styles.centerFill}>
          <InfoState
            icon="alert-circle-outline"
            tone="danger"
            title="Bir şeyler ters gitti"
            message="Deneme sorusu yüklenemedi. Lütfen tekrar dene."
          />
        </View>
      ) : !isTrialMode && (questionsQuery.error || !activeQuestions || activeQuestions.length === 0) ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="document-text-outline"
            title={isRepeatMode ? 'Tekrar edilecek soru yok' : 'Bu pakette soru bulunamadı'}
            message={
              isRepeatMode
                ? 'Tekrar havuzunda bekleyen bir soru kalmadı.'
                : 'Bu paket için henüz soru eklenmedi.'
            }
          />
        </View>
      ) : isPastEnd ? (
        <FadeInUp style={styles.summaryWrap}>
          <Card variant="hero" style={styles.summaryCard}>
            <AppText variant="title2">Pratik Tamamlandı</AppText>
            <AppText variant="subhead" color="secondary" style={styles.summaryNarrative}>
              Bu oturumda {totalAttempts} sorudan {correctCount} tanesini doğru cevapladın.
            </AppText>

            <View style={styles.statsRow}>
              <StatItem icon="checkmark-circle" tone="success" label="Doğru" value={String(correctCount)} />
              <StatItem icon="close-circle" tone="danger" label="Yanlış" value={String(wrongCount)} />
              <StatItem icon="stats-chart" tone="info" label="Doğruluk" value={`%${accuracyPercent}`} />
            </View>
          </Card>

          {/* Yanlışları Tekrar Çöz relies on activeQuestions (the eager
              whole-package array) to re-slice by id — TRIAL mode has no
              such array by design (questions are fetched one at a time,
              and re-serving a "wrong" one would mean re-running the
              index-based trial flow, not a simple local re-slice), so
              it's intentionally hidden here rather than adapted. */}
          {!isTrialMode && currentPassWrongCount > 0 ? (
            <PrimaryButton
              label="Yanlışları Tekrar Çöz"
              onPress={handleRetryWrong}
              disabled={submitMutation.isPending}
            />
          ) : null}
          <View style={styles.secondaryButtonWrap}>
            <SecondaryButton
              label={isRepeatMode ? 'Tekrar Havuzuna Dön' : 'Paketlere Dön'}
              onPress={() => router.dismissTo(isRepeatMode ? '/repeat-pool' : '/packages')}
            />
          </View>
        </FadeInUp>
      ) : currentQuestion ? (
        <>
          {topicName ? (
            <View style={styles.topicChip}>
              <Ionicons name="bookmark-outline" size={14} color={colors.textSecondary} />
              <AppText
                variant="footnote"
                color="secondary"
                style={styles.topicChipText}
                numberOfLines={1}
              >
                {topicName}
              </AppText>
            </View>
          ) : null}
          <QuestionCard body={currentQuestion.body} />

          <View style={styles.options}>
            {currentQuestion.options.map((option) => (
              <OptionRow
                key={option.id}
                label={option.label}
                body={option.body}
                state={getOptionState(option.id, option.isCorrect)}
                onPress={() => handleSelect(option.id)}
                disabled={submitted}
              />
            ))}
          </View>

          {submitMutation.isError ? (
            <AppText variant="footnote" color="danger" style={styles.errorNote}>
              Cevap gönderilemedi. Lütfen tekrar dene.
            </AppText>
          ) : null}

          <View style={styles.footer}>
            {!submitted ? (
              <PrimaryButton
                label="Gönder"
                disabled={!selectedOptionId || submitMutation.isPending}
                onPress={handleSubmit}
              />
            ) : (
              <PrimaryButton label="Sonraki" onPress={handleNext} />
            )}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

// Narrowed to exactly the non-QUESTION, non-END members of
// GetTrialQuestionResult — the caller narrows trialResult down to this
// type before calling in, rather than this function accepting the full
// union and silently falling through a `default: return null` for any
// status it doesn't recognize.
type TrialIssueResult = Exclude<
  GetTrialQuestionResult,
  { status: 'QUESTION' } | { status: 'END' }
>;

function renderTrialIssue(result: TrialIssueResult) {
  switch (result.status) {
    case 'NO_CANDIDATES':
      return (
        <EmptyState
          icon="document-text-outline"
          title="Bu pakette soru bulunamadı"
          message="Bu paket için henüz soru eklenmedi."
        />
      );
    case 'CAP_REACHED':
      return (
        <InfoState
          icon="lock-closed-outline"
          tone="info"
          title="Ücretsiz deneme hakkın doldu"
          message="Bu paketin tamamına erişmek için premium gerekiyor."
        />
      );
    case 'OFFLINE':
      return (
        <InfoState
          illustration={require('../../assets/illustrations/offline.png')}
          tone="info"
          title="Çevrimdışısın"
          message="Yalnızca daha önce açtığın deneme soruları çevrimdışı kullanılabilir."
        />
      );
    case 'REJECTED':
    case 'NOT_VISIBLE_AFTER_GRANT':
    case 'HYDRATION_FAILED':
      return (
        <InfoState
          icon="alert-circle-outline"
          tone="danger"
          title="Bir şeyler ters gitti"
          message="Lütfen tekrar dene."
        />
      );
    default: {
      // Exhaustiveness check: if a new status is ever added to
      // GetTrialQuestionResult (and it isn't QUESTION/END), this line
      // fails to compile until a case above is added for it — the
      // opposite of the previous silent `return null` fallback.
      const unhandled: never = result;
      return unhandled;
    }
  }
}

// Same icon-in-circle stat treatment already established on the Session
// Result screen (Phase 3B.7) — reused here for consistency, not shared
// code, since the two screens track different value sets.
const statTones = {
  success: { background: colors.successMuted, icon: colors.success },
  danger: { background: colors.dangerMuted, icon: colors.danger },
  info: { background: colors.infoMuted, icon: colors.info },
} as const;

function StatItem({
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
    <View style={styles.statItem}>
      <View style={[styles.statIconCircle, { backgroundColor: toneColors.background }]}>
        <Ionicons name={icon} size={16} color={toneColors.icon} />
      </View>
      <AppText variant="title3" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" color="tertiary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPill: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  progressPillText: { fontVariant: ['tabular-nums'] },
  progressWrap: { marginBottom: spacing.lg },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs / 2,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  topicChipText: { flexShrink: 1 },
  options: { marginTop: spacing.lg },
  footer: { marginTop: spacing.lg },
  errorNote: { marginTop: spacing.sm, textAlign: 'center' },
  questionCardSkeleton: { marginBottom: spacing.lg },
  skeletonLine: { marginBottom: spacing.sm },
  skeletonOption: { marginBottom: spacing.sm, borderRadius: radii.sm },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
  summaryWrap: { paddingTop: spacing.md },
  summaryCard: { marginBottom: spacing.lg },
  summaryNarrative: { marginTop: spacing.xs, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  statItem: { alignItems: 'center', gap: spacing.xs / 2 },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs / 2,
  },
  statValue: { fontVariant: ['tabular-nums'] },
  secondaryButtonWrap: { marginTop: spacing.sm },
});
