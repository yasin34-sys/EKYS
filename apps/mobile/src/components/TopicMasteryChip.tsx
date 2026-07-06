import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, spacing } from '../theme';

// Design System §26 "Topic Progress Chip": mastery conveyed through
// accent-intensity, not red/amber/green traffic-light alarm coding —
// "not yet mastered" reads as "not yet," not "failing." Thresholds are a
// simple presentation-layer read of an already-computed TOPIC_ACCURACY
// value (0..1) — not a new Rule Engine metric.
export function topicMasteryLabel(accuracy: number): 'Başlangıç' | 'Gelişiyor' | 'Hakim' {
  if (accuracy >= 0.75) return 'Hakim';
  if (accuracy >= 0.34) return 'Gelişiyor';
  return 'Başlangıç';
}

export interface TopicMasteryChipProps {
  accuracy: number;
}

export function TopicMasteryChip({ accuracy }: TopicMasteryChipProps) {
  const label = topicMasteryLabel(accuracy);
  const tone =
    label === 'Hakim'
      ? { background: colors.accentMuted, text: colors.accent }
      : label === 'Gelişiyor'
        ? { background: colors.border, text: colors.textSecondary }
        : { background: colors.border, text: colors.textTertiary };

  return (
    <View style={[styles.chip, { backgroundColor: tone.background }]}>
      <AppText variant="caption" style={{ color: tone.text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
});
