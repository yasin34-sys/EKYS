export type AccountStatus = 'ANONYMOUS' | 'REGISTERED';

export interface UserProfile {
  id: string;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

// id must be a real Supabase auth user id — never a locally-fabricated
// one. Created only after a real auth session exists.
export interface NewUserProfile {
  id: string;
  accountStatus: AccountStatus;
}
