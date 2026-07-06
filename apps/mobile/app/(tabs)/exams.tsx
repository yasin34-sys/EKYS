import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  useExamRepository,
  useTopicRepository,
  usePackageRepository,
  useEntitlementRepository,
  useTrialAccessRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPublishedExamsUseCase } from '../../src/application/GetPublishedExamsUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetPackagesByExamUseCase } from '../../src/application/GetPackagesByExamUseCase';
import { ScreenContainer, AppText, EmptyState, TopicList, PackageList, TopAppBar } from '../../src/components';
import { spacing } from '../../src/theme';

// "Dersler" tab (Phase 2A, extended Phase 2B.4C.2): topic/lesson
// browsing, both lists reusing use cases already built for Exam Detail:
// - TopicList is driven by GetTopicsByExamUseCase.
// - PackageList is driven by GetPackagesByExamUseCase, with
//   packageRepository, entitlementRepository, and trialAccessRepository
//   as its dependencies.
// PackageList's result is filtered here to exclude ZORLAYICI_DENEME, so
// Deneme packages are removed from Dersler and stay exclusively in the
// Denemeler tab (packages.tsx applies the complementary filter, keeping
// only ZORLAYICI_DENEME).
// Single-exam MVP: both scoped to the first published exam, matching
// the same simplification already used on Home/Statistics/Repeat Pool.
// Topics remain informational only (non-interactive), the same
// deliberate rule Exam Detail already applies — no per-topic
// drill-down screen exists yet.
export default function LessonsScreen() {
  const examRepository = useExamRepository();
  const topicRepository = useTopicRepository();
  const packageRepository = usePackageRepository();
  const entitlementRepository = useEntitlementRepository();
  const trialAccessRepository = useTrialAccessRepository();

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
        trialAccessRepository,
      }).execute(userProfile!.id, examId as string),
    enabled: Boolean(examId) && Boolean(userProfile),
  });

  const studyPackages = packagesQuery.data?.filter(
    (entry) => entry.package.packageType !== 'ZORLAYICI_DENEME',
  );

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
          <TopicList isLoading={examsQuery.isLoading || topicsQuery.isLoading} topics={topicsQuery.data} />
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
