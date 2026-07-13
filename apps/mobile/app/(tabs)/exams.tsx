import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useExamRepository,
  useTopicRepository,
  useLearningMetricsRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPublishedExamsUseCase } from '../../src/application/GetPublishedExamsUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetDashboardMetricsUseCase } from '../../src/application/GetDashboardMetricsUseCase';
import { ScreenContainer, AppText, EmptyState, TopicList, TopAppBar, AccountRequiredState } from '../../src/components';
import { spacing } from '../../src/theme';
import type { Topic } from '../../src/domain';

// "Dersler" tab: topics are the only entry point here. Per-topic
// "Konu Sınavı 1/2/..." cards live inside Topic Detail, so this screen
// no longer repeats the same list underneath the topic cards.
// Single-exam MVP: both scoped to the first published exam, matching
// the same simplification already used on Home/Statistics/Repeat Pool.
// Top-level topics are now pressable (Phase 8A.1), opening
// app/topic/[topicId].tsx — Exam Detail's own TopicList usage is
// unaffected (it never passes onTopicPress, so it stays exactly as
// informational as before).
export default function LessonsScreen() {
  const examRepository = useExamRepository();
  const topicRepository = useTopicRepository();
  const learningMetricsRepository = useLearningMetricsRepository();

  const { data: userProfile, isLoading: isUserProfileLoading } = useCurrentUserProfile();
  const isRegistered = userProfile?.accountStatus === 'REGISTERED';

  const examsQuery = useQuery({
    queryKey: ['exams', 'published'],
    queryFn: () => new GetPublishedExamsUseCase({ examRepository }).execute(),
  });

  const examId = examsQuery.data?.[0]?.id;

  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(examId as string),
    enabled: Boolean(examId) && isRegistered,
  });

  // Real TOPIC_ACCURACY values (same use case Statistics/Learning
  // Progress/Home already trust) — passed to TopicList so topic rows can
  // show a mastery chip + progress bar. Never fabricated: a topic simply
  // missing from this map falls back to 0 accuracy inside TopicList,
  // matching Learning Progress's own existing "no attempts yet reads as
  // Başlangıç" convention, not an invented value.
  const dashboardMetricsQuery = useQuery({
    queryKey: ['dashboardMetrics', userProfile?.id, examId],
    queryFn: () =>
      new GetDashboardMetricsUseCase({ learningMetricsRepository }).execute(
        userProfile!.id,
        examId as string,
      ),
    enabled: isRegistered && Boolean(examId),
  });
  const accuracyByTopicId = new Map(
    (dashboardMetricsQuery.data?.topicMetrics ?? [])
      .filter((metric) => metric.metricType === 'TOPIC_ACCURACY' && metric.topicId !== null)
      .map((metric) => [metric.topicId as string, metric.value]),
  );

  // Same fix already applied to Statistics/Home for this exact query:
  // returning to Dersler after solving practice/repeat/Deneme questions
  // elsewhere should reflect newly-recomputed accuracy, not a stale
  // mount-time snapshot. Manual refetch() bypasses `enabled`, so it's
  // guarded the same way `enabled` already is. topics/packages aren't
  // refetched here — no existing behavior on this screen did that either.
  useFocusEffect(
    useCallback(() => {
      if (!isRegistered || !examId) return;
      dashboardMetricsQuery.refetch();
      // dashboardMetricsQuery itself changes identity every render and is
      // deliberately left out of the deps array — only re-running on
      // focus or when the guard's own ids change is intended here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRegistered, examId]),
  );

  // examId is always defined by the time TopicList can render a topic to
  // tap (see the loaded branch below), so it's safe to close over here —
  // Topic Detail needs it to re-run GetTopicsByExamUseCase/
  // GetDashboardMetricsUseCase against the exact same query keys already
  // warmed by this screen (instant cache hit, no extra fetch).
  function handleTopicPress(topic: Topic) {
    router.push({ pathname: '/topic/[topicId]', params: { topicId: topic.id, examId: examId as string } });
  }

  return (
    <ScreenContainer scroll topBar={<TopAppBar />}>
      <View style={styles.header}>
        <AppText variant="largeTitle">Dersler</AppText>
        <AppText variant="subhead" color="secondary" style={styles.subtitle}>
          Konularına göz at, çalışmaya başla.
        </AppText>
      </View>

      {!isUserProfileLoading && !isRegistered ? (
        <AccountRequiredState message="Ders konuları ve konu sınavları için hesabını e-posta ile bağla." />
      ) : examsQuery.error ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Dersler yüklenemedi"
            message="Lütfen daha sonra tekrar dene."
          />
        </View>
      ) : !examsQuery.isLoading && !examId ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="book-outline"
            title="Henüz yayınlanmış sınav yok"
            message="Yayınlandığında dersler burada görünecek."
          />
        </View>
      ) : (
        <TopicList
          isLoading={isUserProfileLoading || examsQuery.isLoading || topicsQuery.isLoading}
          topics={topicsQuery.data}
          accuracyByTopicId={dashboardMetricsQuery.data ? accuracyByTopicId : undefined}
          onTopicPress={handleTopicPress}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  subtitle: { marginTop: spacing.xs },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
});
