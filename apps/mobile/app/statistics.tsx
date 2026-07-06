import { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useExamRepository,
  useTopicRepository,
  useLearningMetricsRepository,
  useCurrentUserProfile,
} from '../src/services/hooks';
import { GetPublishedExamsUseCase } from '../src/application/GetPublishedExamsUseCase';
import { GetTopicsByExamUseCase } from '../src/application/GetTopicsByExamUseCase';
import { GetDashboardMetricsUseCase } from '../src/application/GetDashboardMetricsUseCase';
import { ScreenContainer, AppText, Card, Skeleton, BackButton, TopicMasteryChip } from '../src/components';
import { spacing } from '../src/theme';

const MAX_VISIBLE_STAT_CARDS = 6;

// Narrative framing over an already-computed TOPIC_ACCURACY value
// (presentation only, per ADR-008's "Dashboard owns presentation, Rule
// Engine owns analytics") — not a new metric or rule. The verdict leads
// the sentence rather than trailing it, so it still reads correctly even
// if a long topic name causes 2-line truncation on a narrow stat card.
function narrativeForAccuracy(topicName: string, accuracy: number): string {
  if (accuracy >= 0.75) return `Güçlüsün: "${topicName}"`;
  if (accuracy >= 0.34) return `Gelişiyorsun: "${topicName}"`;
  return `Daha fazla çalış: "${topicName}"`;
}

export default function StatisticsScreen() {
  const examRepository = useExamRepository();
  const topicRepository = useTopicRepository();
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

  const metricsQuery = useQuery({
    queryKey: ['dashboardMetrics', userProfile?.id, examId],
    queryFn: () =>
      new GetDashboardMetricsUseCase({ learningMetricsRepository }).execute(
        userProfile!.id,
        examId as string,
      ),
    enabled: Boolean(userProfile) && Boolean(examId),
  });

  // Returning here after completing a Practice/Deneme session should
  // reflect the newly-recomputed metrics, not a stale mount-time snapshot.
  useFocusEffect(
    useCallback(() => {
      metricsQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const isLoading = examsQuery.isLoading || topicsQuery.isLoading || metricsQuery.isLoading || !userProfile;
  const topicMetrics = metricsQuery.data?.topicMetrics ?? [];
  const topicsById = new Map((topicsQuery.data ?? []).map((t) => [t.id, t]));

  const accuracyMetrics = topicMetrics.filter((m) => m.metricType === 'TOPIC_ACCURACY');
  const overallReadiness =
    accuracyMetrics.length > 0
      ? accuracyMetrics.reduce((sum, m) => sum + m.value, 0) / accuracyMetrics.length
      : null;

  const visibleMetrics = accuracyMetrics.slice(0, MAX_VISIBLE_STAT_CARDS);

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>
      <AppText variant="largeTitle" style={styles.title}>
        İstatistikler
      </AppText>

      {isLoading ? (
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
            İlk paketini tamamladığında burada göreceksin.
          </AppText>
        </Card>
      ) : (
        <>
          <Card variant="hero" style={styles.heroCard}>
            <AppText variant="headline">Genel olarak iyi gidiyorsun</AppText>
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
                  <AppText variant="footnote" color="secondary" numberOfLines={2}>
                    {narrativeForAccuracy(topicName, metric.value)}
                  </AppText>
                  <AppText
                    variant="title2"
                    color="primary"
                    style={[styles.statValue, { fontVariant: ['tabular-nums'] }]}
                  >
                    %{Math.round(metric.value * 100)}
                  </AppText>
                  <TopicMasteryChip accuracy={metric.value} />
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
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { marginBottom: spacing.lg },
  heroCard: { marginBottom: spacing.lg, alignItems: 'flex-start' },
  heroSkeleton: { marginBottom: spacing.lg, gap: spacing.sm },
  heroValue: { marginTop: spacing.sm },
  emptyMessage: { marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { width: '47%', gap: spacing.xs },
  statCardSkeleton: { width: '47%', gap: spacing.sm },
  statValue: { marginTop: spacing.xs / 2 },
  skeletonLine: { marginBottom: spacing.sm },
  link: { textAlign: 'center', paddingVertical: spacing.sm },
});
