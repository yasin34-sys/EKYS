import type { DB } from '@op-engineering/op-sqlite';
import type { AccountStatus, NewUserProfile, UserProfile } from '../../domain';
import type { UserProfileRepository } from '../UserProfileRepository';
import { IntegrityViolationError, NotFoundError } from '../errors';

interface UserProfileRow {
  id: string;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

function mapUserProfileRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteUserProfileRepository implements UserProfileRepository {
  constructor(private readonly db: DB) {}

  // Exactly one row exists locally: the current device session's own
  // user, per the sqlite_schema.sql comment on user_profiles.
  async getCurrent(): Promise<UserProfile | null> {
    const result = await this.db.execute(`SELECT * FROM user_profiles LIMIT 1;`);
    const row = (result.rows as unknown as UserProfileRow[])[0];
    return row ? mapUserProfileRow(row) : null;
  }

  async create(profile: NewUserProfile): Promise<UserProfile> {
    try {
      await this.db.execute(`INSERT INTO user_profiles (id, account_status) VALUES (?, ?);`, [
        profile.id,
        profile.accountStatus,
      ]);
    } catch (cause) {
      throw new IntegrityViolationError('Failed to create user profile', cause);
    }
    const result = await this.db.execute(`SELECT * FROM user_profiles WHERE id = ?;`, [
      profile.id,
    ]);
    return mapUserProfileRow((result.rows as unknown as UserProfileRow[])[0]);
  }

  async updateAccountStatus(status: AccountStatus): Promise<void> {
    const current = await this.getCurrent();
    if (!current) {
      throw new NotFoundError('UserProfile', '(current)');
    }
    await this.db.execute(`UPDATE user_profiles SET account_status = ? WHERE id = ?;`, [
      status,
      current.id,
    ]);
  }

  // FK-safe delete order (see sqlite_schema.sql): attempts/
  // learning_metrics/trial_access/entitlements/exam_sessions all
  // reference user_profiles(id) ON DELETE RESTRICT, so every one of them
  // must be gone before user_profiles itself can be deleted.
  // package_access has no user_id column of its own — it's scoped via
  // the entitlements this user owns, so it's deleted by subquery before
  // those entitlements. Global content tables (exams/topics/packages/
  // questions/question_options/package_questions/content_sync_state)
  // are never touched here — they carry no user_id and are shared cache,
  // not this user's data. One transaction: either every row is cleared
  // or none are, so a mid-way failure never leaves a partially-cleared
  // local user behind.
  async clearLocalUserData(userId: string): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        await tx.execute(`DELETE FROM attempts WHERE user_id = ?;`, [userId]);
        await tx.execute(`DELETE FROM learning_metrics WHERE user_id = ?;`, [userId]);
        await tx.execute(`DELETE FROM trial_access WHERE user_id = ?;`, [userId]);
        await tx.execute(
          `DELETE FROM package_access
           WHERE entitlement_id IN (SELECT id FROM entitlements WHERE user_id = ?);`,
          [userId],
        );
        await tx.execute(`DELETE FROM entitlements WHERE user_id = ?;`, [userId]);
        await tx.execute(`DELETE FROM exam_sessions WHERE user_id = ?;`, [userId]);
        await tx.execute(`DELETE FROM user_profiles WHERE id = ?;`, [userId]);
      });
    } catch (cause) {
      throw new IntegrityViolationError('Failed to clear local user data', cause);
    }
  }
}
