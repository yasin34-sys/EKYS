import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useExamRepository,
  useTopicRepository,
  useLearningMetricsRepository,
  useCurrentUserProfile,
} from '../src/services/hooks';
import { GetPublishedExamsUseCase } from '../src/application/GetPublishedExamsUseCase';
import { GetTopicsByExamUseCase } from '../src/application/GetTopicsByExamUseCase';
import { GetDashboardMetricsUseCase } from '../src/application/GetDashboardMetricsUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  BackButton,
  IconChip,
  TopicMasteryChip,
  ProgressBar,
  topicIcon,
} from '../src/components';
import { colors, spacing } from '../src/theme';
import type { Topic } from '../src/domain';

// "See all" destination from Statistics (§13) — every Topic in the exam,
// not just the ones with existing metrics; topics with no Attempts yet
// simply read as "Başlangıç" (0 accuracy), matching TopicMasteryChip's
// own threshold rather than a separate "no data" branch.
export default function LearningProgressScreen() {
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

  useFocusEffect(
    useCallback(() => {
      metricsQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const isLoading = examsQuery.isLoading || topicsQuery.isLoading || metricsQuery.isLoading || !userProfile;

  // Leaf topics only — Topic Progress rows track masterable study units,
  // not the parent grouping labels already shown on Exam Detail (§6).
  const allTopics = topicsQuery.data ?? [];
  const leafTopics = allTopics.filter((t) => allTopics.some((other) => other.parentTopicId === t.id) === false);
  const accuracyByTopicId = new Map(
    (metricsQuery.data?.topicMetrics ?? [])
      .filter((m) => m.metricType === 'TOPIC_ACCURACY' && m.topicId)
      .map((m) => [m.topicId as string, m.value]),
  );

  function parentName(topic: Topic): string | null {
    if (!topic.parentTopicId) return null;
    return allTopics.find((t) => t.id === topic.parentTopicId)?.name ?? null;
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>
      <View style={styles.titleRow}>
        <AppText variant="largeTitle" style={styles.titleText}>
          Konu İlerlemesi
        </AppText>
        {!isLoading && leafTopics.length > 0 ? (
          <AppText variant="footnote" color="tertiary" style={styles.titleCount}>
            {leafTopics.length} Konu
          </AppText>
        ) : null}
      </View>

      {isLoading ? (
        <Card>
          <Skeleton width="80%" height={16} style={styles.skeletonRow} />
          <Skeleton width="60%" height={16} style={styles.skeletonRow} />
          <Skeleton width="70%" height={16} />
        </Card>
      ) : leafTopics.length === 0 ? (
        <Card>
          <AppText variant="subhead" color="tertiary">
            Henüz konu ilerlemesi yok — bir paketle çalışmaya başla.
          </AppText>
        </Card>
      ) : (
        <Card>
          {leafTopics.map((topic, index) => {
            const accuracy = accuracyByTopicId.get(topic.id) ?? 0;
            return (
              <View
                key={topic.id}
                style={[styles.row, index !== leafTopics.length - 1 && styles.rowDivider]}
              >
                <View style={styles.rowTop}>
                  <IconChip
                    icon={<Ionicons name={topicIcon(topic.name)} size={18} color={colors.accent} />}
                    size={32}
                  />
                  <View style={styles.rowText}>
                    <AppText variant="body" numberOfLines={2}>
                      {topic.name}
                    </AppText>
                    {parentName(topic) ? (
                      <AppText variant="caption" color="tertiary">
                        {parentName(topic)}
                      </AppText>
                    ) : null}
                  </View>
                  <TopicMasteryChip accuracy={accuracy} />
                </View>
                <View style={styles.rowProgressWrap}>
                  <ProgressBar progress={accuracy} height={4} />
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  titleText: { flex: 1 },
  titleCount: { flexShrink: 0 },
  skeletonRow: { marginBottom: spacing.sm },
  row: { paddingVertical: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { flex: 1 },
  rowProgressWrap: { marginTop: spacing.sm },
});
