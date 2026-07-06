import type { SyncResult } from './types';

// attempts, exam_sessions, learning_metrics — client-generated/computed
// data pushed from SQLite to Supabase.
export interface PushSync {
  push(): Promise<SyncResult>;
}
