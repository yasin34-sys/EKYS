import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { colors, spacing } from '../theme';
import type { Topic } from '../domain';

export interface TopicListProps {
  isLoading: boolean;
  topics: Topic[] | undefined;
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

// Extracted from Exam Detail — same loading/empty/loaded branching,
// unchanged, just moved into its own file.
export function TopicList({ isLoading, topics }: TopicListProps) {
  const nodes = topics ? flattenTopicTree(topics) : [];

  return (
    <View style={styles.section}>
      <AppText variant="title3" style={styles.sectionTitle}>
        Konular
      </AppText>
      {isLoading ? (
        <Card>
          <Skeleton width="80%" height={16} style={styles.skeletonRow} />
          <Skeleton width="60%" height={16} style={styles.skeletonRow} />
          <Skeleton width="70%" height={16} />
        </Card>
      ) : nodes.length > 0 ? (
        <Card>
          {nodes.map((node, index) => (
            <TopicRow key={node.topic.id} node={node} isLast={index === nodes.length - 1} />
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

function TopicRow({ node, isLast }: { node: TopicNode; isLast: boolean }) {
  const { topic, depth } = node;
  return (
    <View
      style={[
        styles.topicRow,
        !isLast && styles.topicRowDivider,
        depth > 0 && { paddingLeft: spacing.md * depth },
      ]}
    >
      <AppText variant={depth === 0 ? 'headline' : 'body'} color={depth === 0 ? 'primary' : 'secondary'}>
        {topic.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  skeletonRow: { marginBottom: spacing.sm },
  topicRow: { paddingVertical: spacing.sm },
  topicRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
