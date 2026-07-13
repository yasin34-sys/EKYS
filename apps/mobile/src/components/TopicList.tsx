import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconChip } from './IconChip';
import { Skeleton } from './Skeleton';
import { TopicMasteryChip, topicMasteryLabel } from './TopicMasteryChip';
import { ProgressBar } from './ProgressBar';
import { colors, radii, spacing } from '../theme';
import type { Topic } from '../domain';

export interface TopicListProps {
  isLoading: boolean;
  topics: Topic[] | undefined;
  // Optional: real TOPIC_ACCURACY values keyed by topic id (Dersler's own
  // GetDashboardMetricsUseCase call — see (tabs)/exams.tsx). Left
  // undefined by any caller that doesn't have this data (e.g. Exam
  // Detail), in which case cards render exactly as before, unchanged.
  accuracyByTopicId?: Map<string, number>;
  // Optional (Phase 8A.1): when provided, top-level topic cards become
  // pressable and call this with the tapped topic. Subtopic rows never
  // trigger it. Left undefined by Exam Detail, which keeps topics purely
  // informational there — only Dersler opts into drill-down navigation.
  onTopicPress?: (topic: Topic) => void;
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
function buildByParentMap(topics: Topic[]): Map<string | null, Topic[]> {
  const byParent = new Map<string | null, Topic[]>();
  for (const topic of topics) {
    const siblings = byParent.get(topic.parentTopicId) ?? [];
    siblings.push(topic);
    byParent.set(topic.parentTopicId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return byParent;
}

function flattenTopicTree(topics: Topic[]): TopicNode[] {
  const byParent = buildByParentMap(topics);
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

// Groups the flat, depth-first node list back into one array per
// top-level (depth 0) topic — each becomes its own Card, with any
// subtopics nested inside it. flattenTopicTree's DFS order guarantees
// every node between one depth-0 node and the next belongs to it.
function groupByTopLevelTopic(nodes: TopicNode[]): TopicNode[][] {
  const sections: TopicNode[][] = [];
  for (const node of nodes) {
    if (node.depth === 0) {
      sections.push([node]);
    } else {
      sections[sections.length - 1]?.push(node);
    }
  }
  return sections;
}

// Topic Detail screen (Phase 8A.1): every id that should count as "part
// of this topic" when deriving relevant packages — the topic itself plus
// every descendant subtopic, regardless of which level real questions
// happen to be tagged at. Real production data has no subtopics today
// (all questions tag a top-level topic directly), so this currently
// always returns just [topicId] — that's the correct, honest answer for
// the data as it exists, not a special case.
export function collectTopicAndDescendantIds(topics: Topic[], topicId: string): string[] {
  const byParent = buildByParentMap(topics);
  const ids: string[] = [topicId];
  function visit(parentId: string) {
    for (const child of byParent.get(parentId) ?? []) {
      ids.push(child.id);
      visit(child.id);
    }
  }
  visit(topicId);
  return ids;
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
  if (normalized.includes('eğitim bilimleri')) return 'library-outline';
  if (normalized.includes('eğitim yönetimi') || normalized.includes('girişimcilik')) return 'briefcase-outline';
  if (normalized.includes('maarif')) return 'school-outline';
  if (normalized.includes('mevzuat')) return 'hammer-outline';
  return 'bookmark-outline';
}

// Card-per-topic treatment (Phase 8A.1): each top-level topic is its own
// Card, matching PackageList's already-established list-of-cards visual
// language directly below it, instead of one shared Card with internal
// rows. Loading/empty branching unchanged.
export function TopicList({ isLoading, topics, accuracyByTopicId, onTopicPress }: TopicListProps) {
  const nodes = topics ? flattenTopicTree(topics) : [];
  const sections = groupByTopLevelTopic(nodes);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="title3">Konular</AppText>
        {!isLoading && sections.length > 0 ? (
          <AppText variant="footnote" color="tertiary">
            {sections.length} Kategori
          </AppText>
        ) : null}
      </View>
      {isLoading ? (
        <Card style={styles.topicCard}>
          <View style={styles.topicCardHeader}>
            <Skeleton width={44} height={44} borderRadius={radii.sm} />
            <View style={styles.topicCardBody}>
              <Skeleton width="70%" height={16} style={styles.skeletonTitle} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        </Card>
      ) : sections.length > 0 ? (
        sections.map((section) => (
          <TopicSectionCard
            key={section[0].topic.id}
            section={section}
            accuracyByTopicId={accuracyByTopicId}
            onTopicPress={onTopicPress}
          />
        ))
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

function TopicSectionCard({
  section,
  accuracyByTopicId,
  onTopicPress,
}: {
  section: TopicNode[];
  accuracyByTopicId?: Map<string, number>;
  onTopicPress?: (topic: Topic) => void;
}) {
  const [{ topic }, ...subNodes] = section;
  const accuracy = accuracyByTopicId ? (accuracyByTopicId.get(topic.id) ?? 0) : null;
  const pressable = Boolean(onTopicPress);

  const content = (
    <Card style={styles.topicCard}>
      <View style={styles.topicCardHeader}>
        <IconChip icon={<Ionicons name={topicIcon(topic.name)} size={22} color={colors.accent} />} size={44} />
        <View style={styles.topicCardBody}>
          <View style={styles.topicCardTitleRow}>
            <AppText variant="headline" numberOfLines={2} style={styles.topicCardTitle}>
              {topic.name}
            </AppText>
            {pressable ? (
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            ) : null}
          </View>
          {accuracy !== null ? (
            <View style={styles.topicMasteryRow}>
              <TopicMasteryChip accuracy={accuracy} />
            </View>
          ) : null}
        </View>
      </View>
      {accuracy !== null ? (
        <View style={styles.topicProgressWrap}>
          <ProgressBar progress={accuracy} height={4} />
        </View>
      ) : null}
      {subNodes.length > 0 ? (
        <View style={styles.subtopicWrap}>
          {subNodes.map((node, index) => (
            <View
              key={node.topic.id}
              style={[
                styles.subtopicRow,
                index !== subNodes.length - 1 && styles.subtopicRowDivider,
                { paddingLeft: spacing.md * (node.depth - 1) },
              ]}
            >
              <AppText variant="body" color="secondary" numberOfLines={2}>
                {node.topic.name}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );

  if (!pressable) return content;

  return (
    <Pressable
      onPress={() => onTopicPress!(topic)}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${topic.name}${accuracy !== null ? `, ${topicMasteryLabel(accuracy)}` : ''}`}
    >
      {content}
    </Pressable>
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
  skeletonTitle: { marginBottom: spacing.xs },
  topicCard: { marginBottom: spacing.md },
  topicCardHeader: { flexDirection: 'row', gap: spacing.md },
  topicCardBody: { flex: 1, justifyContent: 'center' },
  topicCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topicCardTitle: { flex: 1 },
  topicMasteryRow: { marginTop: spacing.xs, alignItems: 'flex-start' },
  topicProgressWrap: { marginTop: spacing.md },
  subtopicWrap: { marginTop: spacing.md },
  subtopicRow: { paddingVertical: spacing.sm },
  subtopicRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { opacity: 0.7 },
});
