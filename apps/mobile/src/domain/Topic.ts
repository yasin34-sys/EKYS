export type TopicStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Topic {
  id: string;
  examId: string;
  parentTopicId: string | null;
  name: string;
  displayOrder: number;
  status: TopicStatus;
  createdAt: string;
  updatedAt: string;
}
