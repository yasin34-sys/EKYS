// Separate from repositories/errors.ts and auth/errors.ts — sync is its
// own boundary. Named SyncEngineError/SyncRowError rather than
// SyncError specifically to avoid colliding with the existing
// repositories/errors.ts SyncError in files that import both.

export abstract class SyncEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SyncNotConfiguredError extends SyncEngineError {
  constructor() {
    super(
      'Supabase sync is not configured: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing.',
    );
  }
}

// One row's failure, not the whole sync operation's failure — pushing/
// pulling continues with the remaining rows.
export class SyncRowError extends SyncEngineError {
  constructor(
    public readonly table: string,
    public readonly rowId: string,
    public readonly cause: unknown,
  ) {
    super(`Failed to sync row ${rowId} in ${table}`);
  }
}
