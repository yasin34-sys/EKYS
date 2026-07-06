import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserProfile } from '../../src/services/hooks';
import { ScreenContainer, AppText, Card, Skeleton, TopAppBar } from '../../src/components';
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
// confusing second path to the same screen.
const navRows: NavRow[] = [
  { icon: 'settings-outline', label: 'Ayarlar', href: '/settings' },
  { icon: 'information-circle-outline', label: 'Hakkında', href: '/about' },
];

export default function ProfileScreen() {
  const { data: userProfile, isLoading } = useCurrentUserProfile();

  return (
    <ScreenContainer scroll topBar={<TopAppBar />}>
      <View style={styles.header}>
        <AppText variant="largeTitle">Profil</AppText>
      </View>

      {isLoading ? (
        <Card style={styles.statusCard}>
          <Skeleton width={40} height={40} borderRadius={radii.full} style={styles.skeletonIcon} />
          <Skeleton width="40%" height={14} style={styles.skeletonLabel} />
          <Skeleton width="30%" height={20} />
        </Card>
      ) : (
        <Card style={styles.statusCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={22} color={colors.accent} />
          </View>
          <AppText variant="subhead" color="secondary">
            Hesap durumu
          </AppText>
          <AppText variant="headline" style={styles.statusValue}>
            {userProfile ? accountStatusLabel[userProfile.accountStatus] : 'Bilinmiyor'}
          </AppText>
        </Card>
      )}

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
              <Ionicons name={row.icon} size={20} color={colors.textSecondary} />
              <AppText variant="body">{row.label}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  statusCard: { marginBottom: spacing.lg },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statusValue: { marginTop: spacing.xs },
  skeletonIcon: { marginBottom: spacing.md },
  skeletonLabel: { marginBottom: spacing.sm },
  navCard: { paddingVertical: spacing.xs },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  navRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  navRowPressed: { backgroundColor: colors.background },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
