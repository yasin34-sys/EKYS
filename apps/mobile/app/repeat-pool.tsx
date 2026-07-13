import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useExamRepository,
  useRepeatPoolRepository,
  useQuestionRepository,
  useTopicRepository,
  useCurrentUserProfile,
} from '../src/services/hooks';
import { GetPublishedExamsUseCase } from '../src/application/GetPublishedExamsUseCase';
import { GetRepeatPoolUseCase } from '../src/application/GetRepeatPoolUseCase';
import { GetTopicsByExamUseCase } from '../src/application/GetTopicsByExamUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  BackButton,
  IconChip,
  PrimaryButton,
  AccountRequiredState,
  topicIcon,
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

  const { data: userProfile, isLoading: isUserProfileLoading } = useCurrentUserProfile();
  const isRegistered = userProfile?.accountStatus === 'REGISTERED';

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
    enabled: isRegistered && Boolean(examId),
  });

  // Topic name per preview row — same GetTopicsByExamUseCase every other
  // screen already trusts, resolved from each question's own topicId.
  // A topicId that doesn't resolve just means no topic chip on that row,
  // never a fabricated name.
  const topicRepository = useTopicRepository();
  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(examId as string),
    enabled: Boolean(examId) && isRegistered,
  });
  const topicNameById = new Map((topicsQuery.data ?? []).map((topic) => [topic.id, topic.name]));

  // Returning here after a repeat-practice pass (or from Home) should
  // reflect the now-updated pool, not a stale mount-time snapshot.
  // Manual refetch() bypasses `enabled`, so it's guarded the same way
  // `enabled` already is — otherwise a focus event before userProfile/
  // examId resolve would fire the query with a missing id.
  useFocusEffect(
    useCallback(() => {
      if (!isRegistered || !examId) return;
      poolQuery.refetch();
      // poolQuery itself changes identity every render and is
      // deliberately left out of the deps array — only re-running on
      // focus or when the guard's own ids change is intended here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRegistered, examId]),
  );

  const isLoading = isUserProfileLoading || examsQuery.isLoading || poolQuery.isLoading;
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

      {!isUserProfileLoading && !isRegistered ? (
        <AccountRequiredState message="Tekrar havuzunu kullanmak için hesabını e-posta ile bağla." />
      ) : isLoading ? (
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

          <View style={styles.section}>
            <AppText variant="title3" style={styles.sectionTitle}>
              Sorular
            </AppText>
            <Card style={styles.previewCard}>
              {questions!.map((question, index) => {
                const topicName = topicNameById.get(question.topicId);
                return (
                  <View
                    key={question.id}
                    style={[
                      styles.previewRow,
                      index !== questions!.length - 1 && styles.previewRowDivider,
                    ]}
                  >
                    <IconChip
                      icon={
                        <Ionicons
                          name={topicName ? topicIcon(topicName) : 'help-circle-outline'}
                          size={16}
                          color={colors.accent}
                        />
                      }
                      size={28}
                    />
                    <View style={styles.previewTextWrap}>
                      {topicName ? (
                        <AppText variant="caption" color="tertiary" numberOfLines={1}>
                          {topicName}
                        </AppText>
                      ) : null}
                      <AppText variant="body" numberOfLines={2}>
                        {question.body}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
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
  section: { marginTop: spacing.lg },
  sectionTitle: { marginBottom: spacing.md },
  previewCard: { paddingVertical: spacing.xs },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  previewRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  previewTextWrap: { flex: 1 },
});
