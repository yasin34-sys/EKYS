import type { Package } from '../domain';

export interface PackageRepository {
  getByExam(examId: string): Promise<Package[]>;
  getById(id: string): Promise<Package | null>;
  // All published packages across every exam — needed for the Packages
  // tab's cross-exam browse view.
  getAll(): Promise<Package[]>;
  // Packages whose own topic_id is one of the given topic ids (Topic
  // Detail screen, Phase 8A.1, corrected 8A.2). Callers pass a topic's
  // own id plus any descendant subtopic ids so a package is found
  // regardless of which level of the hierarchy it was tagged at.
  // Deliberately queries packages.topic_id directly rather than joining
  // through package_questions/questions: that join only ever sees
  // content rows already visible under this client's RLS, which would
  // silently hide a topic's locked premium packages from a user who
  // doesn't have access to their questions yet — exactly the packages
  // Topic Detail most needs to show, so the user can see what's locked
  // and unlock it.
  getByTopicIds(topicIds: string[]): Promise<Package[]>;
}
