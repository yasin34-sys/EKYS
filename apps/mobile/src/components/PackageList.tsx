import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconChip } from './IconChip';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { colors, radii, spacing } from '../theme';
import type { PackageWithAccess } from '../application/GetPackagesByExamUseCase';

const packageTypeLabel: Record<string, string> = {
  TEMEL_CALISMA: 'Temel Çalışma',
  YOGUN_TEKRAR: 'Yoğun Tekrar',
  ZORLAYICI_DENEME: 'Zorlayıcı Deneme',
};

// Exported so package/[id].tsx can use the exact same icon mapping —
// visual consistency between the list card and the detail screen it
// leads to, without a second lookup table to keep in sync by hand.
export const packageTypeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  TEMEL_CALISMA: 'book-outline',
  YOGUN_TEKRAR: 'refresh-outline',
  ZORLAYICI_DENEME: 'timer-outline',
};

const difficultyLabel: Record<string, string> = {
  KOLAY: 'Kolay',
  ORTA: 'Orta',
  ZOR: 'Zor',
};

export interface PackageListProps {
  isLoading: boolean;
  packages: PackageWithAccess[] | undefined;
  // Optional (Phase 8A.1): lets a caller with more specific context (e.g.
  // Topic Detail, where "no packages" means "none reference this topic
  // yet" rather than "nothing published anywhere") override the default
  // empty-state copy. Omitted by every existing call site, which keeps
  // the original wording unchanged.
  emptyTitle?: string;
  emptyMessage?: string;
}

// Extracted from Exam Detail — same loading/empty/loaded branching and
// navigation behavior, unchanged, just moved into its own file.
// Deliberately not shared with (tabs)/packages.tsx's own card, which
// has slightly different context (cross-exam listing) — unifying them
// wasn't part of this refactor's scope.
export function PackageList({
  isLoading,
  packages,
  emptyTitle = 'Henüz paket yayınlanmadı',
  emptyMessage = 'Yayınlandığında burada görünecek.',
}: PackageListProps) {
  return (
    <View style={styles.section}>
      <AppText variant="title3" style={styles.sectionTitle}>
        Paketler
      </AppText>
      {isLoading ? (
        <Card style={styles.packageCard}>
          <Skeleton width="50%" height={20} style={styles.skeletonRow} />
          <Skeleton width="35%" height={14} />
        </Card>
      ) : packages && packages.length > 0 ? (
        packages.map((entry) => <PackageRow key={entry.package.id} entry={entry} />)
      ) : (
        <Card>
          <EmptyState icon="albums-outline" title={emptyTitle} message={emptyMessage} />
        </Card>
      )}
    </View>
  );
}

function PackageRow({ entry }: { entry: PackageWithAccess }) {
  const { package: pkg, accessStatus } = entry;
  const icon = packageTypeIcon[pkg.packageType] ?? 'albums-outline';
  // Curated title (Phase 7A.3.2) takes priority; every existing package
  // has title === null, so this falls back to the exact old label.
  const displayTitle = pkg.title ?? packageTypeLabel[pkg.packageType] ?? pkg.packageType;

  return (
    <Pressable
      onPress={() => router.push(`/package/${pkg.id}`)}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${displayTitle}, ${difficultyLabel[pkg.difficultyLevel] ?? pkg.difficultyLevel}${pkg.isFreeTier ? ', ücretsiz' : ''}`}
    >
      <Card style={styles.packageCard}>
        <View style={styles.row}>
          <IconChip icon={<Ionicons name={icon} size={20} color={colors.accent} />} size={40} />
          <View style={styles.rowBody}>
            <View style={styles.packageHeader}>
              <AppText variant="headline" numberOfLines={2} style={styles.titleText}>
                {displayTitle}
              </AppText>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
            <AppText variant="footnote" color="tertiary" style={styles.packageMeta}>
              {difficultyLabel[pkg.difficultyLevel] ?? pkg.difficultyLevel}
            </AppText>
            <AccessTag isFreeTier={pkg.isFreeTier} accessStatus={accessStatus} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// Every tag here reads directly from already-computed access data
// (Package.isFreeTier, PackageWithAccess.accessStatus) — never invented.
// FULL (entitled, non-free) intentionally shows no tag: "you already
// have this" doesn't need its own badge the way a genuinely different
// access state does. Exported so (tabs)/packages.tsx's own Denemeler
// card (deliberately a separate component, not this one — see its own
// header comment) can reuse the same tag look without duplicating it.
export function AccessTag({
  isFreeTier,
  accessStatus,
}: {
  isFreeTier: boolean;
  accessStatus: PackageWithAccess['accessStatus'];
}) {
  if (isFreeTier) {
    return (
      <View style={[styles.tag, styles.freeTag]}>
        <AppText variant="caption" color="accent">
          Ücretsiz
        </AppText>
      </View>
    );
  }
  if (accessStatus === 'TRIAL') {
    return (
      <View style={[styles.tag, styles.trialTag]}>
        <AppText variant="caption" style={styles.trialTagText}>
          Ücretsiz Dene
        </AppText>
      </View>
    );
  }
  if (accessStatus === 'LOCKED') {
    return (
      <View style={[styles.tag, styles.lockedTag]}>
        <Ionicons name="lock-closed-outline" size={12} color={colors.textTertiary} />
        <AppText variant="caption" color="tertiary" style={styles.lockedTagText}>
          Kilitli
        </AppText>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  skeletonRow: { marginBottom: spacing.sm },
  packageCard: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rowBody: { flex: 1 },
  packageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleText: { flex: 1, marginRight: spacing.sm },
  packageMeta: { marginTop: spacing.xs / 2 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs / 2,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
  freeTag: { backgroundColor: colors.accentMuted },
  trialTag: { backgroundColor: colors.goldMuted },
  trialTagText: { color: colors.gold },
  lockedTag: { backgroundColor: colors.surfaceSecondary },
  lockedTagText: { marginLeft: 0 },
  pressed: { opacity: 0.7 },
});
