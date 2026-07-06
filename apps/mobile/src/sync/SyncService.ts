import type { SyncResult } from './types';

// Thin composition of PushSync + PullSync into one entry point. Not
// called by any use case or screen yet — nothing currently triggers
// sync (no app-foreground/reconnect/timer wiring exists), per scope.
export interface SyncService {
  push(): Promise<SyncResult>;
  pull(): Promise<SyncResult>;
}
