import type { Topic } from '../domain';

export interface TopicRepository {
  getByExam(examId: string): Promise<Topic[]>;
}
