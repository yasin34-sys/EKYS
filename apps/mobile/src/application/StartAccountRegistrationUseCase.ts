import type { AuthService } from '../auth/AuthService';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

export interface StartAccountRegistrationDeps {
  authService: AuthService;
  userProfileRepository: UserProfileRepository;
}

export interface StartAccountRegistrationParams {
  email: string;
}

export type StartAccountRegistrationResult =
  | { status: 'VERIFICATION_SENT' }
  | { status: 'REGISTERED' };

export class StartAccountRegistrationUseCase {
  constructor(private readonly deps: StartAccountRegistrationDeps) {}

  async execute(params: StartAccountRegistrationParams): Promise<StartAccountRegistrationResult> {
    const session = await this.deps.authService.requestEmailRegistration({
      email: params.email.trim(),
    });

    if (!session.isAnonymous) {
      await this.deps.userProfileRepository.updateAccountStatus('REGISTERED');
      return { status: 'REGISTERED' };
    }

    return { status: 'VERIFICATION_SENT' };
  }
}
