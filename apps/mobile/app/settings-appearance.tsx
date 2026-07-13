import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, BackButton, Card, IconChip, ScreenContainer } from '../src/components';
import { colors, radii, spacing } from '../src/theme';

function ReadinessCard({
  icon,
  title,
  message,
  status,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  status: string;
}) {
  return (
    <Card style={styles.readinessCard}>
      <View style={styles.cardHeader}>
        <IconChip icon={<Ionicons name={icon} size={18} color={colors.accent} />} size={36} />
        <View style={styles.cardText}>
          <AppText variant="headline">{title}</AppText>
          <AppText variant="footnote" color="secondary" style={styles.cardMessage}>
            {message}
          </AppText>
        </View>
      </View>
      <View style={styles.statusTag}>
        <AppText variant="caption" color="tertiary">
          {status}
        </AppText>
      </View>
    </Card>
  );
}

export default function SettingsAppearanceScreen() {
  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      <Card variant="hero" style={styles.heroCard}>
        <View style={styles.heroTop}>
          <IconChip icon={<Ionicons name="moon-outline" size={24} color={colors.accent} />} size={52} />
          <View style={styles.heroText}>
            <AppText variant="title2">Görünüm</AppText>
            <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
              Koyu mod için hazırlık noktası. Şimdilik açık/kapalı anahtarı koymuyoruz;
              çünkü tema altyapısı bağlanmadan böyle bir anahtar hiçbir şeyi değiştirmez.
            </AppText>
          </View>
        </View>
      </Card>

      <ReadinessCard
        icon="color-palette-outline"
        title="Tema altyapısı"
        status="Sıradaki iş"
        message="Tüm ekranların renk tokenlarını tek ThemeProvider üzerinden okuması gerekiyor. Böylece koyu mod tek ayardan tüm uygulamaya güvenli yayılır."
      />
      <ReadinessCard
        icon="contrast-outline"
        title="Erişilebilir kontrast"
        status="Kontrol gerekli"
        message="Koyu palet eklendiğinde kart, metin, buton ve seçenek durumlarının kontrastı ayrıca cihaz üzerinde doğrulanmalı."
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  heroCard: { marginBottom: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroText: { flex: 1 },
  heroCopy: { marginTop: spacing.xs },
  readinessCard: { marginBottom: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardText: { flex: 1 },
  cardMessage: { marginTop: spacing.xs },
  statusTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
});
