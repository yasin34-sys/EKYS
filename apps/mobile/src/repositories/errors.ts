// Repository boundary error taxonomy: raw database errors (Postgres
// exceptions, SQLite RAISE(ABORT, ...) messages) never leak past a
// Repository method. Application/UI code handles these types, never
// parses SQL error strings.

export abstract class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends RepositoryError {
  constructor(
    public readonly entityName: string,
    public readonly id: string,
  ) {
    super(`${entityName} not found: ${id}`);
  }
}

// Wraps a same-exam/state-machine/uniqueness violation raised by a
// database trigger or constraint (see docs/database/sqlite_schema.sql
// and the PostgreSQL migrations) into a typed, non-SQL-specific error.
export class IntegrityViolationError extends RepositoryError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

export class EntitlementDeniedError extends RepositoryError {
  constructor(
    public readonly userId: string,
    public readonly packageId: string,
  ) {
    super(`User ${userId} does not have access to package ${packageId}`);
  }
}

export class SyncError extends RepositoryError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
