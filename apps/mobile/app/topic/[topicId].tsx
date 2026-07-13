import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useTopicRepository,
  usePackageRepository,
  useEntitlementRepository,
  useLearningMetricsRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetDashboardMetricsUseCase } from '../../src/application/GetDashboardMetricsUseCase';
import { GetPackagesByTopicUseCase } from '../../src/application/GetPackagesByTopicUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  EmptyState,
  BackButton,
  IconChip,
  PackageList,
  TopicMasteryChip,
  ProgressBar,
  topicIcon,
  collectTopicAndDescendantIds,
} from '../../src/components';
import { colors, radii, spacing } from '../../src/theme';

// Topic Detail (Phase 8A.1): reached only from Dersler's now-pressable
// top-level topic cards, which always pass both topicId and examId (see
// (tabs)/exams.tsx's handleTopicPress) — the same convention
// exam-start/[packageId] and question/[packageId] already use for
// routes that need more than one id.
export default function TopicDetailScreen() {
  const { topicId, examId } = useLocalSearchParams<{ topicId: string; examId: string }>();

  const topicRepository = useTopicRepository();
  const packageRepository = usePackageRepository();
  const entitlementRepository = useEntitlementRepository();
  const learningMetricsRepository = useLearningMetricsRepository();

  const { data: userProfile } = useCurrentUserProfile();

  // Same queryKey Dersler already populated (['topics', 'byExam', examId])
  // — arriving here from a topic card tap is an instant cache hit, not a
  // fresh fetch.
  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(examId as string),
    enabled: Boolean(examId),
  });

  const topic = topicsQuery.data?.find((t) => t.id === topicId);
  const subtopics = useMemo(
    () => (topicsQuery.data ?? []).filter((t) => t.parentTopicId === topicId).sort((a, b) => a.displayOrder - b.displayOrder),
    [topicsQuery.data, topicId],
  );

  // Same queryKey Dersler already populated (['dashboardMetrics', userId,
  // examId]) — also an instant cache hit in the common case of tapping
  // straight from Dersler.
  const dashboardMetricsQuery = useQuery({
    queryKey: ['dashboardMetrics', userProfile?.id, examId],
    queryFn: () =>
      new GetDashboardMetricsUseCase({ learningMetricsRepository }).execute(
        userProfile!.id,
        examId as string,
      ),
    enabled: Boolean(userProfile) && Boolean(examId),
  });
  // Never fabricated: a topic missing from the map (no attempts yet)
  // reads as 0 accuracy, matching Dersler/Learning Progress's existing
  // convention exactly — not a new rule invented for this screen.
  const accuracy = (() => {
    if (!dashboardMetricsQuery.data || !topicId) return null;
    const metric = dashboardMetricsQuery.data.topicMetrics.find(
      (m) => m.metricType === 'TOPIC_ACCURACY' && m.topicId === topicId,
    );
    return metric?.value ?? 0;
  })();

  // Packages relevant to this topic, derived from each package's own
  // real topic_id (GetPackagesByTopicUseCase / PackageRepository.
  // getByTopicIds, corrected Phase 8A.2 to query packages.topic_id
  // directly instead of joining through package_questions/questions —
  // that join only ever saw content this device already had RLS
  // visibility into, which hid a topic's locked premium packages) —
  // topicId plus any real descendant subtopic ids, never every package
  // in the exam. Deneme packages always have topic_id = null, so they
  // never appear here; the packageType filter below is defense in
  // depth, matching Dersler's own filter that keeps them exclusive to
  // the Denemeler tab.
  const topicIds = useMemo(
    () => (topicsQuery.data && topicId ? collectTopicAndDescendantIds(topicsQuery.data, topicId) : []),
    [topicsQuery.data, topicId],
  );
  const packagesQuery = useQuery({
    queryKey: ['packages', 'byTopic', topicId, userProfile?.id],
    queryFn: () =>
      new GetPackagesByTopicUseCase({
        packageRepository,
        entitlementRepository,
      }).execute(userProfile!.id, topicIds),
    enabled: Boolean(userProfile) && Boolean(topicsQuery.data) && Boolean(topicId),
  });
  const studyPackages = packagesQuery.data?.filter(
    (entry) => entry.package.packageType !== 'ZORLAYICI_DENEME',
  );

  const isLoading = topicsQuery.isLoading;

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      {isLoading ? (
        <Card variant="hero">
          <View style={styles.titleRow}>
            <Skeleton width={44} height={44} borderRadius={radii.sm} />
            <View style={styles.titleTextWrap}>
              <Skeleton width="70%" height={20} />
            </View>
          </View>
        </Card>
      ) : topicsQuery.error || !topic ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Konu bulunamadı"
            message="Bu konu artık mevcut olmayabilir."
          />
        </View>
      ) : (
        <>
          <Card variant="hero">
            <View style={styles.titleRow}>
              <IconChip
                icon={<Ionicons name={topicIcon(topic.name)} size={22} color={colors.accent} />}
                size={44}
              />
              <View style={styles.titleTextWrap}>
                <AppText variant="title2">{topic.name}</AppText>
                {accuracy !== null ? (
                  <View style={styles.masteryRow}>
                    <TopicMasteryChip accuracy={accuracy} />
                  </View>
                ) : null}
              </View>
            </View>
            {accuracy !== null ? (
              <View style={styles.progressWrap}>
                <ProgressBar progress={accuracy} height={6} />
              </View>
            ) : null}
          </Card>

          {subtopics.length > 0 ? (
            <View style={styles.section}>
              <AppText variant="title3" style={styles.sectionTitle}>
                Alt Konular
              </AppText>
              <Card>
                {subtopics.map((sub, index) => (
                  <View
                    key={sub.id}
                    style={[styles.subtopicRow, index !== subtopics.length - 1 && styles.subtopicRowDivider]}
                  >
                    <AppText variant="body" color="secondary" numberOfLines={2}>
                      {sub.name}
                    </AppText>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          <View style={styles.section}>
            <PackageList
              isLoading={packagesQuery.isLoading || !userProfile}
              packages={studyPackages}
              emptyTitle="Bu konuya bağlı paket yok"
              emptyMessage="Bu konudan soru içeren bir paket yayınlandığında burada görünecek."
            />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleTextWrap: { flex: 1 },
  masteryRow: { marginTop: spacing.xs, alignItems: 'flex-start' },
  progressWrap: { marginTop: spacing.lg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
  section: { marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  subtopicRow: { paddingVertical: spacing.sm },
  subtopicRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
