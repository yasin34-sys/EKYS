import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useExamRepository,
  useRepeatPoolRepository,
  useQuestionRepository,
  useCurrentUserProfile,
} from '../src/services/hooks';
import { GetPublishedExamsUseCase } from '../src/application/GetPublishedExamsUseCase';
import { GetRepeatPoolUseCase } from '../src/application/GetRepeatPoolUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  BackButton,
  PrimaryButton,
} from '../src/components';
import { colors, spacing } from '../src/theme';

// Reached from Home's Hero Card (priority #2, Screen Spec §4) and,
// contextually, from Session Result. Single-exam MVP: scoped to the first
// published exam rather than taking an examId param, matching the same
// simplification other already-built screens use.
export default function RepeatPoolScreen() {
  const examRepository = useExamRepository();
  const repeatPoolRepository = useRepeatPoolRepository();
  const questionRepository = useQuestionRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const examsQuery = useQuery({
    queryKey: ['exams', 'published'],
    queryFn: () => new GetPublishedExamsUseCase({ examRepository }).execute(),
  });

  const examId = examsQuery.data?.[0]?.id;

  const poolQuery = useQuery({
    queryKey: ['repeatPool', userProfile?.id, examId],
    queryFn: () =>
      new GetRepeatPoolUseCase({ repeatPoolRepository, questionRepository }).execute(
        userProfile!.id,
        examId!,
      ),
    enabled: Boolean(userProfile) && Boolean(examId),
  });

  // Returning here after a repeat-practice pass (or from Home) should
  // reflect the now-updated pool, not a stale mount-time snapshot.
  useFocusEffect(
    useCallback(() => {
      poolQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const isLoading = examsQuery.isLoading || poolQuery.isLoading || !userProfile;
  const questions = poolQuery.data;
  const poolCount = questions?.length ?? 0;

  // Reuses the existing Practice Question Screen rather than a separate
  // implementation — "repeat-pool" is a sentinel packageId value that
  // screen branches on to source its questions from GetRepeatPoolUseCase
  // instead of GetQuestionsByPackageUseCase (see question/[packageId].tsx).
  function handleStart() {
    if (!examId) return;
    router.push({ pathname: '/question/[packageId]', params: { packageId: 'repeat-pool', examId } });
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      <AppText variant="largeTitle">Tekrar Havuzu</AppText>
      <AppText variant="subhead" color="secondary" style={styles.subhead}>
        Yanlış yaptığın sorular burada birikir; doğru çözdüğünde havuzdan çıkar.
      </AppText>

      {isLoading ? (
        <>
          <Card variant="hero" style={styles.heroSkeleton}>
            <Skeleton width="70%" height={20} style={styles.skeletonLine} />
            <Skeleton width="100%" height={50} borderRadius={12} />
          </Card>
          <Card>
            <Skeleton width="80%" height={16} style={styles.skeletonLine} />
            <Skeleton width="60%" height={16} />
          </Card>
        </>
      ) : poolCount === 0 ? (
        <Card variant="hero" style={styles.heroCard}>
          <AppText variant="title2">Tekrar edilecek soru yok</AppText>
          <AppText variant="subhead" color="secondary" style={styles.emptyMessage}>
            Harika gidiyorsun — şu anda tekrar havuzunda bekleyen bir soru yok.
          </AppText>
        </Card>
      ) : (
        <>
          <Card variant="hero" style={styles.heroCard}>
            <AppText variant="title2">Tekrar Başlat</AppText>
            <AppText variant="subhead" color="secondary" style={styles.heroMessage}>
              {poolCount} tekrar sorusu seni bekliyor.
            </AppText>
            <View style={styles.startButton}>
              <PrimaryButton label="Tekrar Başlat" onPress={handleStart} />
            </View>
          </Card>

          <Card>
            {questions!.map((question, index) => (
              <View
                key={question.id}
                style={[
                  styles.previewRow,
                  index !== questions!.length - 1 && styles.previewRowDivider,
                ]}
              >
                <AppText variant="body" numberOfLines={2}>
                  {question.body}
                </AppText>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  subhead: { marginTop: spacing.xs, marginBottom: spacing.xl },
  heroCard: { marginBottom: spacing.lg },
  heroSkeleton: { marginBottom: spacing.lg, gap: spacing.md },
  heroMessage: { marginTop: spacing.xs, marginBottom: spacing.md },
  emptyMessage: { marginTop: spacing.xs },
  startButton: { marginTop: spacing.xs },
  skeletonLine: { marginBottom: spacing.sm },
  previewRow: { paddingVertical: spacing.sm },
  previewRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
