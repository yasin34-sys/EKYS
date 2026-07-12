import { open, type DB } from '@op-engineering/op-sqlite';
import { SQLITE_SCHEMA_SQL } from './schema';

const DATABASE_NAME = 'ekys_cepte.db';

let db: DB | null = null;

export function getDatabase(): DB {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Splits a multi-statement SQL script into individual statements.
 *
 * A naive split on every ';' would corrupt this schema: several
 * CREATE TRIGGER ... BEGIN ... END; blocks contain multiple
 * semicolon-terminated statements inside their body (see
 * trg_attempts_check_integrity). This tracks BEGIN/END nesting and
 * only treats a trailing ';' as a statement boundary when depth is 0,
 * so trigger bodies are never split apart.
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let depth = 0;

  for (const line of sql.split('\n')) {
    const codePart = line.replace(/--.*$/, '');

    if (/\bBEGIN\b/i.test(codePart)) depth++;
    if (/\bEND\b/i.test(codePart)) depth = Math.max(0, depth - 1);

    current += line + '\n';

    if (depth === 0 && /;\s*$/.test(codePart.trim())) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
    }
  }

  const remainder = current.trim();
  if (remainder.length > 0) statements.push(remainder);

  return statements;
}

/**
 * Additive local schema upgrade guard for packages.title/description
 * (Phase 7A.3.2.1). CREATE TABLE IF NOT EXISTS never alters a table
 * that already exists, so a device that installed the app before
 * these columns were added would otherwise keep an old `packages`
 * table forever and fail on the first INSERT that names them (see
 * SupabasePullSync.pullPackages). PRAGMA table_info makes the check
 * (and therefore the whole guard) safe to run unconditionally on every
 * launch, against both fresh and pre-existing databases: ADD COLUMN
 * only runs when the column is actually missing.
 *
 * Deliberately narrow and column-specific rather than a general
 * migration framework — see initializeDatabase()'s own comment for why
 * that's still the right call.
 */
async function upgradePackagesTableColumns(database: DB): Promise<void> {
  const result = await database.execute('PRAGMA table_info(packages);');
  const existingColumns = new Set((result.rows ?? []).map((row) => row.name as string));

  if (!existingColumns.has('title')) {
    await database.execute('ALTER TABLE packages ADD COLUMN title TEXT;');
  }
  if (!existingColumns.has('description')) {
    await database.execute('ALTER TABLE packages ADD COLUMN description TEXT;');
  }
}

/**
 * Opens the local database connection and applies the schema.
 *
 * Every statement in SQLITE_SCHEMA_SQL uses CREATE ... IF NOT EXISTS,
 * so re-running the whole script on every launch is safe and
 * idempotent — that part still needs no versioned migration runner
 * (YAGNI). Columns added to an already-shipped table are a different
 * case CREATE ... IF NOT EXISTS can't cover on its own, so those get a
 * small additive upgrade guard run right after (see
 * upgradePackagesTableColumns above) instead of a full migration
 * framework.
 */
export async function initializeDatabase(): Promise<DB> {
  db = open({ name: DATABASE_NAME });

  // SQLite disables foreign key enforcement by default per connection.
  // Every ON DELETE RESTRICT/CASCADE/SET NULL clause in the schema
  // depends on this being explicitly enabled here.
  await db.execute('PRAGMA foreign_keys = ON;');

  for (const statement of splitSqlStatements(SQLITE_SCHEMA_SQL)) {
    await db.execute(statement);
  }

  await upgradePackagesTableColumns(db);

  return db;
}

export interface IntegrityCheckResult {
  ok: boolean;
  foreignKeyViolations: unknown[];
  integrityErrors: string[];
}

/**
 * Runs after initializeDatabase() and before any Repository is handed
 * the connection, per the approved bootstrap sequence: the app must
 * never trust a local database it hasn't verified is consistent.
 *
 * Result-shape access (`.rows`, a plain array of row objects) matches
 * op-sqlite's documented QueryResult type as of the installed version,
 * but hasn't been exercised against a real device/simulator yet —
 * worth re-verifying the first time this actually runs.
 */
export async function verifyIntegrity(): Promise<IntegrityCheckResult> {
  const database = getDatabase();

  const fkResult = await database.execute('PRAGMA foreign_key_check;');
  const integrityResult = await database.execute('PRAGMA integrity_check;');

  const foreignKeyViolations = fkResult.rows ?? [];
  const integrityErrors = (integrityResult.rows ?? [])
    .map((row) => row.integrity_check as string | undefined)
    .filter((message): message is string => Boolean(message) && message !== 'ok');

  return {
    ok: foreignKeyViolations.length === 0 && integrityErrors.length === 0,
    foreignKeyViolations,
    integrityErrors,
  };
}
