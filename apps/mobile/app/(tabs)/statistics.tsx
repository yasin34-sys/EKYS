import { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useExamRepository,
  useTopicRepository,
  useLearningMetricsRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPublishedExamsUseCase } from '../../src/application/GetPublishedExamsUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetDashboardMetricsUseCase } from '../../src/application/GetDashboardMetricsUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  TopicMasteryChip,
  ProgressBar,
  TopAppBar,
  AccountRequiredState,
} from '../../src/components';
import { colors, spacing } from '../../src/theme';

const MAX_VISIBLE_STAT_CARDS = 6;

// Tab-hosted version of the same Statistics content previously only
// reachable by pushing a standalone screen from Profile — now a
// top-of-tab screen (Design System §17: largeTitle, no back affordance,
// brand bar above it), per Phase 2A's 5-tab restructuring. Same use
// cases, same data, no new logic — visual/navigation change only. (The
// old standalone screen, app/statistics.tsx, was a since-deleted,
// unreachable leftover — see Phase 6C.2's route-collision cleanup.)
export default function StatisticsTabScreen() {
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

  const metricsQuery = useQuery({
    queryKey: ['dashboardMetrics', userProfile?.id, examId],
    queryFn: () =>
      new GetDashboardMetricsUseCase({ learningMetricsRepository }).execute(
        userProfile!.id,
        examId as string,
      ),
    enabled: isRegistered && Boolean(examId),
  });

  // Returning here after completing a Practice/Deneme session should
  // reflect the newly-recomputed metrics, not a stale mount-time snapshot.
  // Manual refetch() bypasses `enabled`, so this is guarded the same way
  // `enabled` already is — otherwise a focus event before userProfile/examId
  // resolve would fire the query with a missing id.
  useFocusEffect(
    useCallback(() => {
      if (!isRegistered || !examId) return;
      metricsQuery.refetch();
      // metricsQuery itself changes identity every render and is
      // deliberately left out of the deps array — only re-running on
      // focus or when the guard's own ids change is intended here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRegistered, examId]),
  );

  const isLoading = isUserProfileLoading || examsQuery.isLoading || topicsQuery.isLoading || metricsQuery.isLoading;
  const topicMetrics = metricsQuery.data?.topicMetrics ?? [];
  const topicsById = new Map((topicsQuery.data ?? []).map((t) => [t.id, t]));

  const accuracyMetrics = topicMetrics.filter((m) => m.metricType === 'TOPIC_ACCURACY');
  const overallReadiness =
    accuracyMetrics.length > 0
      ? accuracyMetrics.reduce((sum, m) => sum + m.value, 0) / accuracyMetrics.length
      : null;

  const visibleMetrics = accuracyMetrics.slice(0, MAX_VISIBLE_STAT_CARDS);

  return (
    <ScreenContainer scroll topBar={<TopAppBar />}>
      <View style={styles.header}>
        <AppText variant="footnote" color="tertiary" style={styles.eyebrow}>
          ÖZET RAPOR
        </AppText>
        <AppText variant="largeTitle">İstatistikler</AppText>
      </View>

      {!isUserProfileLoading && !isRegistered ? (
        <AccountRequiredState message="İstatistiklerini görmek için hesabını e-posta ile bağla." />
      ) : isLoading ? (
        <>
          <Card variant="hero" style={styles.heroSkeleton}>
            <Skeleton width="60%" height={20} style={styles.skeletonLine} />
            <Skeleton width="40%" height={32} />
          </Card>
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((key) => (
              <Card key={key} style={styles.statCardSkeleton}>
                <Skeleton width="80%" height={14} style={styles.skeletonLine} />
                <Skeleton width="40%" height={24} />
              </Card>
            ))}
          </View>
        </>
      ) : accuracyMetrics.length === 0 ? (
        <Card variant="hero">
          <AppText variant="title2">Henüz istatistik yok</AppText>
          <AppText variant="subhead" color="secondary" style={styles.emptyMessage}>
            İlk konu sınavını tamamladığında burada göreceksin.
          </AppText>
        </Card>
      ) : (
        <>
          <Card variant="hero" style={styles.heroCard}>
            <View style={styles.heroHeaderRow}>
              <Ionicons name="analytics-outline" size={18} color={colors.accent} />
              <AppText variant="headline" style={styles.heroHeadlineText}>
                Genel olarak iyi gidiyorsun
              </AppText>
            </View>
            <AppText variant="largeTitle" color="primary" style={[styles.heroValue, { fontVariant: ['tabular-nums'] }]}>
              %{Math.round((overallReadiness ?? 0) * 100)}
            </AppText>
            <AppText variant="subhead" color="secondary">
              genel doğruluk oranı
            </AppText>
          </Card>

          <View style={styles.grid}>
            {visibleMetrics.map((metric) => {
              const topic = metric.topicId ? topicsById.get(metric.topicId) : undefined;
              const topicName = topic?.name ?? 'Genel';
              return (
                <Card key={metric.id} style={styles.statCard}>
                  <AppText variant="subhead" color="primary" numberOfLines={2}>
                    {topicName}
                  </AppText>
                  <AppText
                    variant="title2"
                    color="primary"
                    style={[styles.statValue, { fontVariant: ['tabular-nums'] }]}
                  >
                    %{Math.round(metric.value * 100)}
                  </AppText>
                  <TopicMasteryChip accuracy={metric.value} />
                  <View style={styles.statProgressWrap}>
                    <ProgressBar progress={metric.value} height={4} />
                  </View>
                </Card>
              );
            })}
          </View>

          <Pressable onPress={() => router.push('/learning-progress')} accessibilityRole="button">
            <AppText variant="headline" color="accent" style={styles.link}>
              Tüm konuları gör
            </AppText>
          </Pressable>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  eyebrow: { marginBottom: spacing.xs / 2 },
  heroCard: { marginBottom: spacing.lg, alignItems: 'flex-start' },
  heroHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroHeadlineText: { flex: 1 },
  heroSkeleton: { marginBottom: spacing.lg, gap: spacing.sm },
  heroValue: { marginTop: spacing.sm },
  emptyMessage: { marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { width: '47%', gap: spacing.xs },
  statProgressWrap: { marginTop: spacing.xs / 2 },
  statCardSkeleton: { width: '47%', gap: spacing.sm },
  statValue: { marginTop: spacing.xs / 2 },
  skeletonLine: { marginBottom: spacing.sm },
  link: { textAlign: 'center', paddingVertical: spacing.sm },
});
