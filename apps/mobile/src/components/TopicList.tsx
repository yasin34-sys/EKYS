import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconChip } from './IconChip';
import { Skeleton } from './Skeleton';
import { TopicMasteryChip } from './TopicMasteryChip';
import { ProgressBar } from './ProgressBar';
import { colors, spacing } from '../theme';
import type { Topic } from '../domain';

export interface TopicListProps {
  isLoading: boolean;
  topics: Topic[] | undefined;
  // Optional: real TOPIC_ACCURACY values keyed by topic id (Dersler's own
  // GetDashboardMetricsUseCase call — see (tabs)/exams.tsx). Left
  // undefined by any caller that doesn't have this data (e.g. Exam
  // Detail), in which case rows render exactly as before, unchanged.
  accuracyByTopicId?: Map<string, number>;
}

interface TopicNode {
  topic: Topic;
  depth: number;
}

// Topic is a self-referencing hierarchy (see CONCEPTUAL_DATABASE_MODEL.md
// §2 Topic) with no schema-enforced depth limit. Flattening this into a
// depth-first, displayOrder-sorted list (rather than rendering the raw
// query order) is what keeps parent/child rows adjacent and in the right
// sequence regardless of how displayOrder numbers happen to overlap across
// sibling groups.
function flattenTopicTree(topics: Topic[]): TopicNode[] {
  const byParent = new Map<string | null, Topic[]>();
  for (const topic of topics) {
    const siblings = byParent.get(topic.parentTopicId) ?? [];
    siblings.push(topic);
    byParent.set(topic.parentTopicId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  const result: TopicNode[] = [];
  function visit(parentId: string | null, depth: number) {
    for (const topic of byParent.get(parentId) ?? []) {
      result.push({ topic, depth });
      visit(topic.id, depth + 1);
    }
  }
  visit(null, 0);
  return result;
}

// Presentational-only name match against the known EKYS subject set
// (PROJECT_CHARTER.md §4) — chooses an icon, never a claim about
// progress/content. Falls back to a generic icon for anything else
// (sub-topics, future subjects) rather than guessing.
export function topicIcon(name: string): keyof typeof Ionicons.glyphMap {
  const normalized = name.toLocaleLowerCase('tr-TR');
  if (normalized.includes('genel kültür')) return 'earth-outline';
  if (normalized.includes('inkılap') || normalized.includes('atatürk')) return 'flag-outline';
  if (normalized.includes('değerler')) return 'heart-outline';
  if (normalized.includes('eğitim yönetimi') || normalized.includes('girişimcilik')) return 'briefcase-outline';
  if (normalized.includes('mevzuat')) return 'hammer-outline';
  return 'bookmark-outline';
}

// Extracted from Exam Detail — same loading/empty/loaded branching,
// unchanged, just moved into its own file.
export function TopicList({ isLoading, topics, accuracyByTopicId }: TopicListProps) {
  const nodes = topics ? flattenTopicTree(topics) : [];
  const topLevelCount = nodes.filter((n) => n.depth === 0).length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="title3">Konular</AppText>
        {!isLoading && topLevelCount > 0 ? (
          <AppText variant="footnote" color="tertiary">
            {topLevelCount} Kategori
          </AppText>
        ) : null}
      </View>
      {isLoading ? (
        <Card>
          <Skeleton width="80%" height={16} style={styles.skeletonRow} />
          <Skeleton width="60%" height={16} style={styles.skeletonRow} />
          <Skeleton width="70%" height={16} />
        </Card>
      ) : nodes.length > 0 ? (
        <Card>
          {nodes.map((node, index) => (
            <TopicRow
              key={node.topic.id}
              node={node}
              isLast={index === nodes.length - 1}
              accuracyByTopicId={accuracyByTopicId}
            />
          ))}
        </Card>
      ) : (
        <Card>
          <AppText variant="subhead" color="tertiary">
            Bu sınav için henüz konu tanımlanmadı.
          </AppText>
        </Card>
      )}
    </View>
  );
}

function TopicRow({
  node,
  isLast,
  accuracyByTopicId,
}: {
  node: TopicNode;
  isLast: boolean;
  accuracyByTopicId?: Map<string, number>;
}) {
  const { topic, depth } = node;
  // Mastery info only ever shown for top-level rows (depth 0) — subtopic
  // rows stay as plain indented text, unchanged, keeping this compact
  // rather than repeating the chip/bar treatment at every nesting level.
  const accuracy = depth === 0 && accuracyByTopicId ? (accuracyByTopicId.get(topic.id) ?? 0) : null;

  return (
    <View
      style={[
        styles.topicRow,
        !isLast && styles.topicRowDivider,
        depth > 0 && { paddingLeft: spacing.md * depth },
      ]}
    >
      {depth === 0 ? (
        <IconChip
          icon={<Ionicons name={topicIcon(topic.name)} size={18} color={colors.accent} />}
          size={32}
        />
      ) : null}
      <View style={styles.topicTextWrap}>
        <View style={styles.topicHeaderRow}>
          <AppText
            variant={depth === 0 ? 'headline' : 'body'}
            color={depth === 0 ? 'primary' : 'secondary'}
            style={styles.topicNameText}
            numberOfLines={2}
          >
            {topic.name}
          </AppText>
          {accuracy !== null ? <TopicMasteryChip accuracy={accuracy} /> : null}
        </View>
        {accuracy !== null ? (
          <View style={styles.topicProgressWrap}>
            <ProgressBar progress={accuracy} height={4} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  skeletonRow: { marginBottom: spacing.sm },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  topicRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  topicTextWrap: { flex: 1 },
  topicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topicNameText: { flexShrink: 1 },
  topicProgressWrap: { marginTop: spacing.xs },
});
