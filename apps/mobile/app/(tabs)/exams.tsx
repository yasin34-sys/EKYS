import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useExamRepository,
  useTopicRepository,
  usePackageRepository,
  useEntitlementRepository,
  useLearningMetricsRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPublishedExamsUseCase } from '../../src/application/GetPublishedExamsUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetPackagesByExamUseCase } from '../../src/application/GetPackagesByExamUseCase';
import { GetDashboardMetricsUseCase } from '../../src/application/GetDashboardMetricsUseCase';
import { ScreenContainer, AppText, EmptyState, TopicList, PackageList, TopAppBar } from '../../src/components';
import { spacing } from '../../src/theme';
import type { Topic } from '../../src/domain';

// "Dersler" tab (Phase 2A, extended Phase 2B.4C.2, Phase 8A.1): topic/
// lesson browsing, both lists reusing use cases already built for Exam
// Detail:
// - TopicList is driven by GetTopicsByExamUseCase.
// - PackageList is driven by GetPackagesByExamUseCase, with
//   packageRepository and entitlementRepository as its dependencies.
// PackageList's result is filtered here to exclude ZORLAYICI_DENEME, so
// Deneme packages are removed from Dersler and stay exclusively in the
// Denemeler tab (packages.tsx applies the complementary filter, keeping
// only ZORLAYICI_DENEME).
// Single-exam MVP: both scoped to the first published exam, matching
// the same simplification already used on Home/Statistics/Repeat Pool.
// Top-level topics are now pressable (Phase 8A.1), opening
// app/topic/[topicId].tsx — Exam Detail's own TopicList usage is
// unaffected (it never passes onTopicPress, so it stays exactly as
// informational as before).
export default function LessonsScreen() {
  const examRepository = useExamRepository();
  const topicRepository = useTopicRepository();
  const packageRepository = usePackageRepository();
  const entitlementRepository = useEntitlementRepository();
  const learningMetricsRepository = useLearningMetricsRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const examsQuery = useQuery({
    queryKey: ['exams', 'published'],
    queryFn: () => new GetPublishedExamsUseCase({ examRepository }).execute(),
  });

  const examId = examsQuery.data?.[0]?.id;

  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(examId as string),
    enabled: Boolean(examId),
  });

  const packagesQuery = useQuery({
    queryKey: ['packages', 'byExam', examId, userProfile?.id],
    queryFn: () =>
      new GetPackagesByExamUseCase({
        packageRepository,
        entitlementRepository,
      }).execute(userProfile!.id, examId as string),
    enabled: Boolean(examId) && Boolean(userProfile),
  });

  const studyPackages = packagesQuery.data?.filter(
    (entry) => entry.package.packageType !== 'ZORLAYICI_DENEME',
  );

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
    enabled: Boolean(userProfile) && Boolean(examId),
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
      if (!userProfile || !examId) return;
      dashboardMetricsQuery.refetch();
      // dashboardMetricsQuery itself changes identity every render and is
      // deliberately left out of the deps array — only re-running on
      // focus or when the guard's own ids change is intended here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile, examId]),
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

      {examsQuery.error ? (
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
        <>
          <TopicList
            isLoading={examsQuery.isLoading || topicsQuery.isLoading}
            topics={topicsQuery.data}
            accuracyByTopicId={dashboardMetricsQuery.data ? accuracyByTopicId : undefined}
            onTopicPress={handleTopicPress}
          />
          <PackageList
            isLoading={examsQuery.isLoading || packagesQuery.isLoading || !userProfile}
            packages={studyPackages}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  subtitle: { marginTop: spacing.xs },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
});
