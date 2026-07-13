import { useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  usePackageRepository,
  useExamRepository,
  useQuestionRepository,
  useEntitlementRepository,
  useExamSessionRepository,
  useTopicRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPackageByIdUseCase } from '../../src/application/GetPackageByIdUseCase';
import { GetExamByIdUseCase } from '../../src/application/GetExamByIdUseCase';
import { GetQuestionsByPackageUseCase } from '../../src/application/GetQuestionsByPackageUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { StartExamSessionUseCase } from '../../src/application/StartExamSessionUseCase';
import { expoIdGenerator } from '../../src/application/shared/expoIdGenerator';
import { systemClock } from '../../src/application/shared/systemClock';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  BackButton,
  IconChip,
  packageTypeIcon,
} from '../../src/components';
import { colors, radii, spacing } from '../../src/theme';

const packageTypeLabel: Record<string, string> = {
  TEMEL_CALISMA: 'Temel Çalışma',
  YOGUN_TEKRAR: 'Yoğun Tekrar',
  ZORLAYICI_DENEME: 'Zorlayıcı Deneme',
};

// Real, verifiable behavior only — each line matches something
// app/exam-session/[sessionId].tsx actually does today, not aspirational
// copy. No timer-continues-in-background claim: the countdown is a
// plain JS interval tied to the mounted screen, and that guarantee
// can't be made honestly across platforms.
const rules = [
  'Sınava başladığında süre geri sayımı hemen başlar.',
  'Cevabın, bir sonraki soruya geçtiğinde kaydedilir.',
  'Tüm soruları yanıtlamadan sınavı bitirebilirsin; boş bıraktıkların yanlış sayılmaz.',
  'Sonucun ve analizin, sınavı bitirdiğinde gösterilir.',
];

// New in Phase 3B.3: the confirmation step between Package Detail's
// "Başla" (FULL, ZORLAYICI_DENEME only — see app/package/[id].tsx) and
// actually starting a timed session. StartExamSessionUseCase now runs
// from here, not from Package Detail, but is otherwise called exactly
// as before (same deps, same params, same error handling).
export default function ExamStartScreen() {
  const { packageId, examId } = useLocalSearchParams<{ packageId: string; examId: string }>();

  const packageRepository = usePackageRepository();
  const examRepository = useExamRepository();
  const questionRepository = useQuestionRepository();
  const entitlementRepository = useEntitlementRepository();
  const examSessionRepository = useExamSessionRepository();
  const topicRepository = useTopicRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const [isStarting, setIsStarting] = useState(false);

  const packageQuery = useQuery({
    queryKey: ['package', packageId],
    queryFn: () => new GetPackageByIdUseCase({ packageRepository }).execute(packageId as string),
    enabled: Boolean(packageId),
  });

  const examQuery = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => new GetExamByIdUseCase({ examRepository }).execute(examId as string),
    enabled: Boolean(examId),
  });

  // Only used to display the real question count for this package — no
  // topic/subject distribution is derived or fabricated from it.
  const questionsQuery = useQuery({
    queryKey: ['questions', 'byPackage', packageId],
    queryFn: () => new GetQuestionsByPackageUseCase({ questionRepository }).execute(packageId as string),
    enabled: Boolean(packageId),
  });

  // Real per-topic question counts within this Deneme package — same
  // approach package/[id].tsx already uses for its own "Soru Dağılımı"
  // section, reused here rather than duplicated with new logic. A
  // topicId missing from the exam's topic list is skipped, never shown
  // with a fabricated name.
  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(examId as string),
    enabled: Boolean(examId),
  });

  const topicDistribution = useMemo(() => {
    if (!questionsQuery.data || !topicsQuery.data) return null;
    const topicNameById = new Map(topicsQuery.data.map((topic) => [topic.id, topic.name]));
    const countByTopicId = new Map<string, number>();
    for (const question of questionsQuery.data) {
      countByTopicId.set(question.topicId, (countByTopicId.get(question.topicId) ?? 0) + 1);
    }
    return Array.from(countByTopicId.entries())
      .map(([topicId, count]) => ({ topicId, name: topicNameById.get(topicId), count }))
      .filter((entry): entry is { topicId: string; name: string; count: number } => Boolean(entry.name))
      .sort((a, b) => b.count - a.count);
  }, [questionsQuery.data, topicsQuery.data]);

  // topicsQuery is included here even though its own failure/emptiness
  // never blocks starting the exam (see topicDistribution above and the
  // error branch below, neither of which reference topicsQuery.error) —
  // this only prevents the "Soru Dağılımı" section from popping in after
  // the rest of the screen has already settled and shifting everything
  // below it down.
  const isLoading =
    packageQuery.isLoading || examQuery.isLoading || questionsQuery.isLoading || topicsQuery.isLoading;
  const questionCount = questionsQuery.data?.length ?? 0;

  async function handleStartExam() {
    if (!packageQuery.data || !examQuery.data || !userProfile) return;
    setIsStarting(true);
    try {
      const session = await new StartExamSessionUseCase({
        examSessionRepository,
        entitlementRepository,
        packageRepository,
        generateId: expoIdGenerator,
        now: systemClock,
      }).execute({
        userId: userProfile.id,
        examId: examId as string,
        packageId: packageId as string,
      });

      // Routed using the session's own fields, not the request params —
      // StartExamSessionUseCase can return an existing IN_PROGRESS
      // session (idempotent resume), and that session is always the
      // source of truth for which package/exam it actually belongs to.
      router.push({
        pathname: '/exam-session/[sessionId]',
        params: { sessionId: session.id, packageId: session.packageId, examId: session.examId },
      });
    } catch {
      setIsStarting(false);
      Alert.alert('Hata', 'Sınav başlatılamadı. Lütfen tekrar dene.');
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      {isLoading ? (
        <Card variant="hero">
          <Skeleton width="70%" height={22} style={styles.skeletonLine} />
          <Skeleton width="90%" height={16} style={styles.skeletonLine} />
          <Skeleton width="100%" height={72} borderRadius={radii.md} />
        </Card>
      ) : packageQuery.error ||
        examQuery.error ||
        questionsQuery.error ||
        !packageQuery.data ||
        !examQuery.data ||
        questionCount === 0 ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Deneme yüklenemedi"
            message="Bu deneme artık mevcut olmayabilir ya da henüz soru içermiyor."
          />
        </View>
      ) : (
        <>
          <Card variant="hero" style={styles.section}>
            <AppText variant="footnote" color="tertiary" style={styles.eyebrow}>
              DENEME SINAVI
            </AppText>
            <View style={styles.titleRow}>
              <IconChip
                icon={
                  <Ionicons
                    name={packageTypeIcon[packageQuery.data.packageType] ?? 'timer-outline'}
                    size={22}
                    color={colors.accent}
                  />
                }
                size={44}
              />
              <View style={styles.titleTextWrap}>
                <AppText variant="title2">
                  {packageQuery.data.title ?? packageTypeLabel[packageQuery.data.packageType] ?? packageQuery.data.packageType}
                </AppText>
                <AppText variant="subhead" color="secondary" style={styles.metaLine}>
                  {questionCount} Soru
                </AppText>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <InfoStat icon="help-circle-outline" label="Soru" value={String(questionCount)} />
              <InfoStat
                icon="time-outline"
                label="Süre"
                value={`${examQuery.data.durationMinutes} dk`}
              />
              <InfoStat
                icon="clipboard-outline"
                label="Format"
                value="Deneme"
              />
              <InfoStat
                icon="ribbon-outline"
                label="Geçme Puanı"
                value={`${examQuery.data.passingScore}`}
              />
            </View>
          </Card>

          {topicDistribution && topicDistribution.length > 0 ? (
            <View style={styles.section}>
              <AppText variant="title3" style={styles.sectionTitle}>
                Soru Dağılımı
              </AppText>
              <Card>
                {topicDistribution.map((entry, index) => (
                  <View
                    key={entry.topicId}
                    style={[
                      styles.distributionRow,
                      index !== topicDistribution.length - 1 && styles.distributionRowDivider,
                    ]}
                  >
                    <AppText variant="body" style={styles.distributionName} numberOfLines={2}>
                      {entry.name}
                    </AppText>
                    <AppText
                      variant="subhead"
                      color="secondary"
                      style={[styles.distributionCount, { fontVariant: ['tabular-nums'] }]}
                    >
                      {entry.count} Soru
                    </AppText>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}

          <View style={styles.section}>
            <AppText variant="title3" style={styles.sectionTitle}>
              Sınav Kuralları
            </AppText>
            <Card>
              {rules.map((rule, index) => (
                <View
                  key={rule}
                  style={[styles.ruleRow, index !== rules.length - 1 && styles.ruleRowDivider]}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  <AppText variant="body" style={styles.ruleText}>
                    {rule}
                  </AppText>
                </View>
              ))}
            </Card>
          </View>

          <PrimaryButton
            label="Denemeyi Başlat"
            onPress={handleStartExam}
            disabled={isStarting}
          />
          <View style={styles.secondaryButtonWrap}>
            <SecondaryButton label="Vazgeç" onPress={() => router.back()} disabled={isStarting} />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function InfoStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <IconChip icon={<Ionicons name={icon} size={16} color={colors.accent} />} size={28} />
      <AppText variant="footnote" color="tertiary" style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="headline" style={[styles.infoValue, { fontVariant: ['tabular-nums'] }]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  eyebrow: { marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  titleTextWrap: { flex: 1 },
  metaLine: { marginTop: spacing.xs / 2 },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  distributionRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  distributionName: { flex: 1 },
  distributionCount: { flexShrink: 0 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  infoItem: {
    width: '47%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radii.sm,
    padding: spacing.md,
    gap: spacing.xs / 2,
  },
  infoLabel: { marginTop: spacing.xs / 2 },
  infoValue: { marginTop: spacing.xs / 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  ruleRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ruleText: { flex: 1 },
  skeletonLine: { marginBottom: spacing.sm },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
  secondaryButtonWrap: { marginTop: spacing.sm },
});
