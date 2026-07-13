import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useExamRepository,
  useTopicRepository,
  usePackageRepository,
  useEntitlementRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetExamByIdUseCase } from '../../src/application/GetExamByIdUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetPackagesByExamUseCase } from '../../src/application/GetPackagesByExamUseCase';
import {
  ScreenContainer,
  Card,
  Skeleton,
  EmptyState,
  BackButton,
  ExamInfoCard,
  TopicList,
  PackageList,
} from '../../src/components';
import { spacing } from '../../src/theme';

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const examRepository = useExamRepository();
  const topicRepository = useTopicRepository();
  const packageRepository = usePackageRepository();
  const entitlementRepository = useEntitlementRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const examQuery = useQuery({
    queryKey: ['exam', id],
    queryFn: () => new GetExamByIdUseCase({ examRepository }).execute(id as string),
    enabled: Boolean(id),
  });

  const topicsQuery = useQuery({
    queryKey: ['topics', id],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(id as string),
    enabled: Boolean(id),
  });

  const packagesQuery = useQuery({
    queryKey: ['packages', 'byExam', id, userProfile?.id],
    queryFn: () =>
      new GetPackagesByExamUseCase({
        packageRepository,
        entitlementRepository,
      }).execute(userProfile!.id, id as string),
    enabled: Boolean(id) && Boolean(userProfile),
  });

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      {examQuery.isLoading ? (
        <Card variant="hero" style={styles.section}>
          <Skeleton width="70%" height={22} style={styles.skeletonLine} />
          <Skeleton width="90%" height={16} />
        </Card>
      ) : examQuery.error || !examQuery.data ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Sınav bulunamadı"
            message="Bu sınav artık mevcut olmayabilir."
          />
        </View>
      ) : (
        <>
          <ExamInfoCard exam={examQuery.data} />
          <TopicList isLoading={topicsQuery.isLoading} topics={topicsQuery.data} />
          <PackageList
            isLoading={packagesQuery.isLoading || !userProfile}
            packages={packagesQuery.data}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  section: { marginBottom: spacing.xl },
  skeletonLine: { marginBottom: spacing.sm },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
});
