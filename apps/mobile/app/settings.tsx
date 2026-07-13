import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppText, Card, BackButton } from '../src/components';
import { colors, radii, spacing } from '../src/theme';

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  status: string;
  href: '/settings-appearance' | '/settings-notifications' | '/account-management';
}

// Every row here is a documented, currently-unbuilt dependency per
// SCREEN_SPECIFICATIONS.md §18 (dark mode needs Design System §34's
// ThemeProvider; notifications need a push system; data/privacy controls
// have no flow yet) — routed to detail screens instead of pretending to
// be working toggles.
//
// "Hesabı Sil" routes to account-management's real deletion-request flow
// (a prefilled support email, manually processed — see
// account-delete-request.tsx). Not instant self-service deletion, but a
// genuine, working request path, satisfying Apple App Store Review
// Guideline 5.1.1(v) / Google Play's Account Deletion policy's
// in-app-initiated requirement.
const groups: { title: string; rows: SettingsRow[] }[] = [
  {
    title: 'Görünüm',
    rows: [
      {
        icon: 'moon-outline',
        label: 'Koyu Mod',
        detail: 'Tema altyapısı hazır olunca açılacak.',
        status: 'Planlandı',
        href: '/settings-appearance',
      },
    ],
  },
  {
    title: 'Bildirimler',
    rows: [
      {
        icon: 'notifications-outline',
        label: 'Bildirim Tercihleri',
        detail: 'Hatırlatma tercihleri için hazırlık ekranı.',
        status: 'Planlandı',
        href: '/settings-notifications',
      },
    ],
  },
  {
    title: 'Hesap',
    rows: [
      {
        icon: 'trash-outline',
        label: 'Hesabı Sil',
        detail: 'Hesap yönetimi ekranından silme talebi başlatabilirsin.',
        status: 'Kullanılabilir',
        href: '/account-management',
      },
    ],
  },
];

export default function SettingsScreen() {
  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>
      <AppText variant="title2" style={styles.title}>
        Ayarlar
      </AppText>
      <AppText variant="subhead" color="secondary" style={styles.subtitle}>
        Satırlara dokunarak her ayarın durumunu ve eksik altyapısını görebilirsin.
      </AppText>

      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText variant="footnote" color="tertiary" style={styles.groupLabel}>
            {group.title.toLocaleUpperCase('tr-TR')}
          </AppText>
          <Card style={styles.groupCard}>
            {group.rows.map((row, index) => (
              <Pressable
                key={row.label}
                onPress={() => router.push(row.href)}
                accessibilityRole="button"
                accessibilityLabel={row.label}
                style={[styles.row, index !== group.rows.length - 1 && styles.rowDivider]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconBubble}>
                    <Ionicons name={row.icon} size={18} color={colors.accent} />
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="body">{row.label}</AppText>
                    <AppText variant="caption" color="tertiary" numberOfLines={2}>
                      {row.detail}
                    </AppText>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <View style={styles.comingSoonTag}>
                    <AppText variant="caption" color="tertiary">
                      {row.status}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  group: { marginBottom: spacing.lg },
  groupLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  groupCard: { paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
  },
  rowText: { flex: 1, gap: spacing.xs / 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  comingSoonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
});
