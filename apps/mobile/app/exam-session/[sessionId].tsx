import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useQuestionRepository,
  useAttemptRepository,
  useLearningMetricsRepository,
  useExamSessionRepository,
  useExamRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetQuestionsByPackageUseCase } from '../../src/application/GetQuestionsByPackageUseCase';
import { GetExamByIdUseCase } from '../../src/application/GetExamByIdUseCase';
import { SubmitAnswerUseCase } from '../../src/application/SubmitAnswerUseCase';
import { FinishExamSessionUseCase } from '../../src/application/FinishExamSessionUseCase';
import { GetAttemptsBySessionUseCase } from '../../src/application/GetAttemptsBySessionUseCase';
import { expoIdGenerator } from '../../src/application/shared/expoIdGenerator';
import { systemClock } from '../../src/application/shared/systemClock';
import {
  ScreenContainer,
  AppText,
  Skeleton,
  Card,
  EmptyState,
  BackButton,
  QuestionCard,
  OptionRow,
  ProgressBar,
  PrimaryButton,
  Timer,
} from '../../src/components';
import { colors, radii, spacing } from '../../src/theme';

// Mock Exam mode: no per-question reveal, ever — options only ever
// show 'default'/'selected'. Attempts carry examSessionId + sequence,
// submitted when advancing (not on tap), so a candidate can change
// their selection before it's locked in.
export default function ExamSessionScreen() {
  const { sessionId, packageId, examId } = useLocalSearchParams<{
    sessionId: string;
    packageId: string;
    examId: string;
  }>();

  const questionRepository = useQuestionRepository();
  const attemptRepository = useAttemptRepository();
  const learningMetricsRepository = useLearningMetricsRepository();
  const examSessionRepository = useExamSessionRepository();
  const examRepository = useExamRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const examQuery = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => new GetExamByIdUseCase({ examRepository }).execute(examId),
    enabled: Boolean(examId),
  });

  const questionsQuery = useQuery({
    queryKey: ['questions', 'byPackage', packageId],
    queryFn: () => new GetQuestionsByPackageUseCase({ questionRepository }).execute(packageId),
    enabled: Boolean(packageId),
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (examQuery.data && totalDurationSeconds === null) {
      const seconds = examQuery.data.durationMinutes * 60;
      setTotalDurationSeconds(seconds);
      setTimeRemainingSeconds(seconds);
    }
  }, [examQuery.data, totalDurationSeconds]);

  const questions = questionsQuery.data;
  const totalQuestions = questions?.length ?? 0;
  const currentQuestion = questions?.[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  async function submitCurrentAnswer(): Promise<void> {
    if (!currentQuestion || !selectedOptionId || !userProfile) return;
    await new SubmitAnswerUseCase({
      attemptRepository,
      questionRepository,
      learningMetricsRepository,
      generateId: expoIdGenerator,
      now: systemClock,
    }).execute({
      userId: userProfile.id,
      examId: currentQuestion.examId,
      questionId: currentQuestion.id,
      examSessionId: sessionId,
      sequence: currentIndex + 1,
      selectedOptionId,
    });
  }

  const finishingRef = useRef(false);

  async function finishSession() {
    if (finishingRef.current || !userProfile) return;
    finishingRef.current = true;
    setIsFinishing(true);
    try {
      const finishedSession = await new FinishExamSessionUseCase({
        examSessionRepository,
        attemptRepository,
        examRepository,
        now: systemClock,
      }).execute({ examSessionId: sessionId, userId: userProfile.id, examId });

      const attempts = await new GetAttemptsBySessionUseCase({ attemptRepository }).execute(
        sessionId,
      );
      const correctCount = attempts.filter((a) => a.isCorrect).length;
      const wrongCount = attempts.length - correctCount;
      const timeUsedSeconds =
        totalDurationSeconds !== null && timeRemainingSeconds !== null
          ? totalDurationSeconds - timeRemainingSeconds
          : 0;

      router.replace({
        pathname: '/session-result/[sessionId]',
        params: {
          sessionId,
          packageId,
          examId,
          score: String(Math.round(finishedSession.score ?? 0)),
          passed: String(Boolean(finishedSession.passed)),
          passingScore: String(examQuery.data?.passingScore ?? 0),
          correctCount: String(correctCount),
          wrongCount: String(wrongCount),
          totalQuestions: String(attempts.length),
          timeUsedSeconds: String(timeUsedSeconds),
        },
      });
    } catch {
      finishingRef.current = false;
      setIsFinishing(false);
      Alert.alert('Hata', 'Sınav sonlandırılamadı. Lütfen tekrar dene.');
    }
  }

  const finishSessionRef = useRef(finishSession);
  finishSessionRef.current = finishSession;
  const submitCurrentAnswerRef = useRef(submitCurrentAnswer);
  submitCurrentAnswerRef.current = submitCurrentAnswer;

  // Interval started once (when the duration is known) and torn down
  // on unmount — refs keep it calling the latest closures without
  // restarting the interval every tick.
  useEffect(() => {
    if (totalDurationSeconds === null) return;

    const interval = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          (async () => {
            await submitCurrentAnswerRef.current().catch(() => {});
            await finishSessionRef.current();
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalDurationSeconds]);

  async function handleNext() {
    setIsSubmitting(true);
    setSubmitError(false);
    try {
      await submitCurrentAnswer();
      setCurrentIndex((index) => index + 1);
      setSelectedOptionId(null);
    } catch {
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFinishLastQuestion() {
    setIsSubmitting(true);
    setSubmitError(false);
    try {
      await submitCurrentAnswer();
      await finishSession();
    } catch {
      setSubmitError(true);
      setIsSubmitting(false);
    }
  }

  function handleManualFinishPress() {
    Alert.alert('Sınavı Bitir', 'Sınavı bitirmek istediğine emin misin? Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Bitir',
        style: 'destructive',
        onPress: async () => {
          if (selectedOptionId) {
            await submitCurrentAnswer().catch(() => {});
          }
          await finishSession();
        },
      },
    ]);
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <BackButton />
        {timeRemainingSeconds !== null ? (
          <View style={styles.timerWrap}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Timer remainingSeconds={timeRemainingSeconds} />
          </View>
        ) : null}
        <Pressable
          onPress={handleManualFinishPress}
          disabled={isFinishing}
          accessibilityRole="button"
          accessibilityLabel="Sınavı bitir"
          hitSlop={8}
          style={styles.finishPill}
        >
          <AppText variant="footnote" color="danger">
            Bitir
          </AppText>
        </Pressable>
      </View>

      {questions && questions.length > 0 ? (
        <>
          <View style={styles.counterRow}>
            <View style={styles.progressPill} accessibilityLabel={`Soru ${currentIndex + 1} / ${totalQuestions}`}>
              <AppText variant="footnote" color="secondary" style={styles.progressPillText}>
                {currentIndex + 1} / {totalQuestions}
              </AppText>
            </View>
          </View>
          <View style={styles.progressWrap}>
            <ProgressBar progress={(currentIndex + 1) / totalQuestions} height={4} />
          </View>
        </>
      ) : null}

      {questionsQuery.isLoading || examQuery.isLoading ? (
        <View>
          <Card style={styles.questionCardSkeleton}>
            <Skeleton width="90%" height={18} style={styles.skeletonLine} />
            <Skeleton width="70%" height={18} />
          </Card>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} width="100%" height={56} style={styles.skeletonOption} />
          ))}
        </View>
      ) : questionsQuery.error || examQuery.error || !questions || questions.length === 0 ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="document-text-outline"
            title="Sınav başlatılamadı"
            message="Bu paket için henüz soru eklenmedi."
          />
        </View>
      ) : currentQuestion ? (
        <>
          <QuestionCard body={currentQuestion.body} />

          <View style={styles.options}>
            {currentQuestion.options.map((option) => (
              <OptionRow
                key={option.id}
                label={option.label}
                body={option.body}
                state={option.id === selectedOptionId ? 'selected' : 'default'}
                onPress={() => setSelectedOptionId(option.id)}
                disabled={isSubmitting || isFinishing}
              />
            ))}
          </View>

          {submitError ? (
            <AppText variant="footnote" color="danger" style={styles.errorNote}>
              Cevap kaydedilemedi. Lütfen tekrar dene.
            </AppText>
          ) : null}

          <View style={styles.footer}>
            {isLastQuestion ? (
              <PrimaryButton
                label="Bitir"
                disabled={!selectedOptionId || isSubmitting || isFinishing}
                onPress={handleFinishLastQuestion}
              />
            ) : (
              <PrimaryButton
                label="Sonraki"
                disabled={!selectedOptionId || isSubmitting || isFinishing}
                onPress={handleNext}
              />
            )}
          </View>
        </>
      ) : null}
    </ScreenContainer>
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
  timerWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs / 2 },
  finishPill: {
    backgroundColor: colors.dangerMuted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  counterRow: { alignItems: 'flex-end', marginBottom: spacing.xs },
  progressPill: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  progressPillText: { fontVariant: ['tabular-nums'] },
  progressWrap: { marginBottom: spacing.lg },
  options: { marginTop: spacing.lg },
  footer: { marginTop: spacing.lg },
  errorNote: { marginTop: spacing.sm, textAlign: 'center' },
  questionCardSkeleton: { marginBottom: spacing.lg },
  skeletonLine: { marginBottom: spacing.sm },
  skeletonOption: { marginBottom: spacing.sm, borderRadius: radii.sm },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
});
