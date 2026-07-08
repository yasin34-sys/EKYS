import { View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, AppText, Card, BackButton } from '../src/components';
import { colors, radii, spacing } from '../src/theme';

// Privacy Policy / Terms of Service / Support links are explicitly
// undecided per SCREEN_SPECIFICATIONS.md §19 ("mechanism not yet
// decided, flagged") — shown as honest "Yakında" rows rather than
// linking to a fabricated URL.
//
// Store-readiness TODO: "Gizlilik Politikası" specifically cannot stay
// "Yakında" at actual submission time — both Apple App Store Review
// Guidelines and the Google Play Developer Program Policy require a
// live, reachable privacy policy URL before an app can be published,
// and this app already collects device/account data via Supabase. Real
// legal copy and a real URL have to come from the product owner, not be
// invented here.
const linkRows = ['Gizlilik Politikası', 'Kullanım Koşulları', 'Destek'];

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>
      <AppText variant="title2" style={styles.title}>
        Hakkında
      </AppText>
      <AppText variant="subhead" color="secondary" style={styles.subtitle}>
        Yasal belgeler ve destek seçenekleri yakında eklenecek.
      </AppText>

      <Card style={styles.card}>
        <View style={[styles.row, styles.rowDivider]}>
          <AppText variant="body">Sürüm</AppText>
          <AppText variant="body" color="secondary" style={{ fontVariant: ['tabular-nums'] }}>
            {version}
          </AppText>
        </View>
        {linkRows.map((label, index) => (
          <View key={label} style={[styles.row, index !== linkRows.length - 1 && styles.rowDivider]}>
            <AppText variant="body" color="tertiary">
              {label}
            </AppText>
            <View style={styles.comingSoonTag}>
              <AppText variant="caption" color="tertiary">
                Yakında
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.footer}>
        <Ionicons name="school-outline" size={16} color={colors.textTertiary} />
        <AppText variant="footnote" color="tertiary">
          EKYS CEPTE
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  card: { paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  comingSoonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
});
