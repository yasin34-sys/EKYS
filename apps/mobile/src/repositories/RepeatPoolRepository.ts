import type { RepeatPoolEntry } from '../domain';

// Read-only: Repeat Pool is derived data, never written to directly.
export interface RepeatPoolRepository {
  getForUser(userId: string, examId: string): Promise<RepeatPoolEntry[]>;
}
