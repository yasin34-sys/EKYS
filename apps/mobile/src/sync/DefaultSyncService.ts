import type { PushSync } from './PushSync';
import type { PullSync } from './PullSync';
import type { SyncService } from './SyncService';
import type { SyncResult } from './types';

export class DefaultSyncService implements SyncService {
  constructor(
    private readonly pushSync: PushSync,
    private readonly pullSync: PullSync,
  ) {}

  async push(): Promise<SyncResult> {
    return this.pushSync.push();
  }

  async pull(): Promise<SyncResult> {
    return this.pullSync.pull();
  }
}
