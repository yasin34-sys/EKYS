import type { AccountStatus, NewUserProfile, UserProfile } from '../domain';

export interface UserProfileRepository {
  getCurrent(): Promise<UserProfile | null>;
  create(profile: NewUserProfile): Promise<UserProfile>;
  updateAccountStatus(status: AccountStatus): Promise<void>;
}
