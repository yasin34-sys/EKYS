import { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import {
  useCurrentUserProfile,
  useExamRepository,
  useLearningMetricsRepository,
} from '../../src/services/hooks';
import { GetPublishedExamsUseCase } from '../../src/application/GetPublishedExamsUseCase';
import { GetDashboardMetricsUseCase } from '../../src/application/GetDashboardMetricsUseCase';
import { ScreenContainer, AppText, Card, Skeleton, TopAppBar, IconChip } from '../../src/components';
import { colors, radii, spacing } from '../../src/theme';
import type { AccountStatus } from '../../src/domain';

const accountStatusLabel: Record<AccountStatus, string> = {
  ANONYMOUS: 'Misafir',
  REGISTERED: 'Kayıtlı',
};

interface NavRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: '/settings' | '/about' | '/account-management';
  status?: string;
}

// "İstatistikler" row removed — Statistics is now its own tab (Phase 2A's
// 5-tab restructuring), so linking to it here would be a redundant,
// confusing second path to the same screen.
const navRows: NavRow[] = [
  { icon: 'settings-outline', label: 'Ayarlar', href: '/settings' },
  { icon: 'information-circle-outline', label: 'Hakkında', href: '/about' },
];

const accountRows: NavRow[] = [
  {
    icon: 'log-out-outline',
    label: 'Çıkış Yap',
    href: '/account-management',
    status: 'Hazırlanıyor',
  },
];

// ekranlar/profil_ayarlar shows a photo avatar, a real name, a "PRO"
// badge, and a 3-stat bento grid (streak/correct-count/days-until-exam)
// — none of that data exists here: user_profiles has no name or photo
// field, no subscription/premium state is fetched on this screen, and
// there's no streak or exam-countdown concept anywhere in the domain.
// The identity block below keeps only what's real (accountStatus) and
// uses a generic person icon in place of a photo, rather than inventing
// any of it. The one stat card below it (overall accuracy) is real too —
// the same GetDashboardMetricsUseCase figure Statistics already shows,
// not a new metric invented for this screen.
export default function ProfileScreen() {
  const examRepository = useExamRepository();
  const learningMetricsRepository = useLearningMetricsRepository();

  const { data: userProfile, isLoading } = useCurrentUserProfile();
  const version = Constants.expoConfig?.version ?? '—';

  // Same real overall-accuracy figure Statistics already computes from
  // GetDashboardMetricsUseCase (TOPIC_ACCURACY average) — reused here,
  // not recomputed with new logic, so Profile can show one honest summary
  // stat instead of no progress information at all. Omitted entirely
  // (see render below) until there's real data, same as Home's weak
  // topics / recent activity sections.
  const examsQuery = useQuery({
    queryKey: ['exams', 'published'],
    queryFn: () => new GetPublishedExamsUseCase({ examRepository }).execute(),
  });
  const examId = examsQuery.data?.[0]?.id;

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
      if (!userProfile || !examId) return;
      metricsQuery.refetch();
      // metricsQuery itself changes identity every render and is
      // deliberately left out of the deps array — only re-running on
      // focus or when the guard's own ids change is intended here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile, examId]),
  );

  const progressLoading = isLoading || examsQuery.isLoading || (Boolean(examId) && metricsQuery.isLoading);
  const accuracyMetrics = (metricsQuery.data?.topicMetrics ?? []).filter(
    (m) => m.metricType === 'TOPIC_ACCURACY',
  );
  const overallAccuracy =
    accuracyMetrics.length > 0
      ? accuracyMetrics.reduce((sum, m) => sum + m.value, 0) / accuracyMetrics.length
      : null;

  return (
    <ScreenContainer scroll topBar={<TopAppBar />}>
      <View style={styles.header}>
        <AppText variant="largeTitle">Profil</AppText>
      </View>

      <View style={styles.identitySection}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={40} color={colors.accent} />
        </View>
        {isLoading ? (
          <Skeleton width={90} height={22} borderRadius={radii.full} />
        ) : (
          <View style={styles.statusPill}>
            <Ionicons
              name={userProfile?.accountStatus === 'REGISTERED' ? 'checkmark-circle' : 'person-outline'}
              size={14}
              color={colors.textSecondary}
            />
            <AppText variant="caption" color="secondary">
              {userProfile ? accountStatusLabel[userProfile.accountStatus] : 'Bilinmiyor'}
            </AppText>
          </View>
        )}
      </View>

      {progressLoading ? (
        <Card variant="hero" style={styles.progressCard}>
          <Skeleton width="60%" height={16} style={styles.progressSkeletonLine} />
          <Skeleton width="30%" height={28} />
        </Card>
      ) : overallAccuracy !== null ? (
        <Card variant="hero" style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Ionicons name="stats-chart-outline" size={16} color={colors.accent} />
            <AppText variant="footnote" color="tertiary">
              GENEL DOĞRULUK ORANI
            </AppText>
          </View>
          <AppText variant="title1" color="primary" style={{ fontVariant: ['tabular-nums'] }}>
            %{Math.round(overallAccuracy * 100)}
          </AppText>
        </Card>
      ) : null}

      <AppText variant="footnote" color="tertiary" style={styles.sectionEyebrow}>
        HESAP
      </AppText>

      {userProfile?.accountStatus === 'ANONYMOUS' ? (
        <Pressable
          onPress={() => router.push('/account-register')}
          accessibilityRole="button"
          accessibilityLabel="Hesabını kaydet"
          style={({ pressed }) => pressed && styles.accountCardPressed}
        >
          <Card style={styles.accountCard}>
            <View style={styles.accountCardLeft}>
              <IconChip
                icon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.accent} />}
                size={40}
              />
              <View style={styles.accountCardText}>
                <AppText variant="headline">Hesabını Kaydet</AppText>
                <AppText variant="footnote" color="secondary" style={styles.accountCardCopy}>
                  Premium erişim ve ilerleme bu hesaba bağlanır.
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Card>
        </Pressable>
      ) : null}

      <Card style={styles.accountActionCard}>
        {accountRows.map((row, index) => (
          <Pressable
            key={row.label}
            onPress={() => router.push(row.href)}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            style={({ pressed }) => [
              styles.navRow,
              index !== accountRows.length - 1 && styles.navRowDivider,
              pressed && styles.navRowPressed,
            ]}
          >
            <View style={styles.navRowLeft}>
              <IconChip icon={<Ionicons name={row.icon} size={18} color={colors.accent} />} size={32} />
              <View style={styles.navLabelWrap}>
                <AppText variant="body">{row.label}</AppText>
                <AppText variant="caption" color="tertiary">
                  Güvenli oturum yönetimi
                </AppText>
              </View>
            </View>
            <View style={styles.rowRight}>
              {row.status ? (
                <View style={styles.statusTag}>
                  <AppText variant="caption" color="tertiary">
                    {row.status}
                  </AppText>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
          </Pressable>
        ))}
      </Card>

      <AppText variant="footnote" color="tertiary" style={styles.sectionEyebrow}>
        UYGULAMA
      </AppText>
      <Card style={styles.navCard}>
        {navRows.map((row, index) => (
          <Pressable
            key={row.href}
            onPress={() => router.push(row.href)}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            style={({ pressed }) => [
              styles.navRow,
              index !== navRows.length - 1 && styles.navRowDivider,
              pressed && styles.navRowPressed,
            ]}
          >
            <View style={styles.navRowLeft}>
              <IconChip icon={<Ionicons name={row.icon} size={18} color={colors.accent} />} size={32} />
              <AppText variant="body">{row.label}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </Card>

      <View style={styles.footer}>
        <AppText variant="footnote" color="tertiary">
          EKYS CEPTE v{version}
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  identitySection: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  progressCard: { alignItems: 'flex-start', marginBottom: spacing.xl },
  progressSkeletonLine: { marginBottom: spacing.sm },
  progressHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  accountCard: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  accountCardPressed: { opacity: 0.86 },
  accountCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  accountCardText: { flex: 1 },
  accountCardCopy: { marginTop: spacing.xs / 2 },
  accountActionCard: { paddingVertical: spacing.xs, marginBottom: spacing.xl },
  sectionEyebrow: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  navCard: { paddingVertical: spacing.xs },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  navRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  navRowPressed: { backgroundColor: colors.background },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  navLabelWrap: { flex: 1, gap: spacing.xs / 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  footer: { alignItems: 'center', marginTop: spacing.xl },
});
