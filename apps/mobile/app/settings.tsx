import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppText, Card, BackButton } from '../src/components';
import { colors, radii, spacing } from '../src/theme';

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

// Every row here is a documented, currently-unbuilt dependency per
// SCREEN_SPECIFICATIONS.md §18 (dark mode needs Design System §34's
// ThemeProvider; notifications need a push system; data/privacy controls
// have no flow yet) — rendered disabled with an honest "Yakında" tag
// rather than a toggle that would silently do nothing.
const groups: { title: string; rows: SettingsRow[] }[] = [
  {
    title: 'Görünüm',
    rows: [{ icon: 'moon-outline', label: 'Koyu Mod' }],
  },
  {
    title: 'Bildirimler',
    rows: [{ icon: 'notifications-outline', label: 'Bildirim Tercihleri' }],
  },
  {
    title: 'Hesap',
    rows: [{ icon: 'trash-outline', label: 'Hesabı Sil' }],
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

      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText variant="footnote" color="tertiary" style={styles.groupLabel}>
            {group.title.toLocaleUpperCase('tr-TR')}
          </AppText>
          <Card style={styles.groupCard}>
            {group.rows.map((row, index) => (
              <View
                key={row.label}
                style={[styles.row, index !== group.rows.length - 1 && styles.rowDivider]}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name={row.icon} size={20} color={colors.textTertiary} />
                  <AppText variant="body" color="tertiary">
                    {row.label}
                  </AppText>
                </View>
                <View style={styles.comingSoonTag}>
                  <AppText variant="caption" color="tertiary">
                    Yakında
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { marginBottom: spacing.lg },
  group: { marginBottom: spacing.lg },
  groupLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs, letterSpacing: 0.4 },
  groupCard: { paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  comingSoonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
});
