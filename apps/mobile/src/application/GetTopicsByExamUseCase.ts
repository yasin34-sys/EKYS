import type { Topic } from '../domain';
import type { TopicRepository } from '../repositories/TopicRepository';

export interface GetTopicsByExamDeps {
  topicRepository: TopicRepository;
}

export class GetTopicsByExamUseCase {
  constructor(private readonly deps: GetTopicsByExamDeps) {}

  async execute(examId: string): Promise<Topic[]> {
    return this.deps.topicRepository.getByExam(examId);
  }
}
