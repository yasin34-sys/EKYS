import type { UserProfile } from '../domain';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

export interface GetCurrentUserProfileDeps {
  userProfileRepository: UserProfileRepository;
}

export class GetCurrentUserProfileUseCase {
  constructor(private readonly deps: GetCurrentUserProfileDeps) {}

  async execute(): Promise<UserProfile | null> {
    return this.deps.userProfileRepository.getCurrent();
  }
}
