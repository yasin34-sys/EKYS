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
}
