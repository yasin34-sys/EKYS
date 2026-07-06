import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserProfile } from '../../src/services/hooks';
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
  href: '/settings' | '/about';
}

// "İstatistikler" row removed — Statistics is now its own tab (Phase 2A's
// 5-tab restructuring), so linking to it here would be a redundant,
// confusing second path to the same screen. "Çıkış Yap" (sign out) is
// deliberately not present either — no sign-out mechanism exists
// anywhere in AuthService yet, and this is an anonymous-first app with
// no login screen to sign back in through, so a logout button here
// would be a dead end at best and destructive at worst.
const navRows: NavRow[] = [
  { icon: 'settings-outline', label: 'Ayarlar', href: '/settings' },
  { icon: 'information-circle-outline', label: 'Hakkında', href: '/about' },
];

// ekranlar/profil_ayarlar shows a photo avatar, a real name, a "PRO"
// badge, and a 3-stat bento grid (streak/correct-count/days-until-exam)
// — none of that data exists here: user_profiles has no name or photo
// field, no subscription/premium state is fetched on this screen, and
// there's no streak or exam-countdown concept anywhere in the domain.
// The identity block below keeps only what's real (accountStatus) and
// uses a generic person icon in place of a photo, rather than inventing
// any of it.
export default function ProfileScreen() {
  const { data: userProfile, isLoading } = useCurrentUserProfile();
  const version = Constants.expoConfig?.version ?? '—';

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
  navCard: { paddingVertical: spacing.xs },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  navRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  navRowPressed: { backgroundColor: colors.background },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footer: { alignItems: 'center', marginTop: spacing.xl },
});
