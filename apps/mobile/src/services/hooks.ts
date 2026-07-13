import { useQuery } from '@tanstack/react-query';
import { useServices } from './ServiceProvider';
import { GetCurrentUserProfileUseCase } from '../application/GetCurrentUserProfileUseCase';

// Thin convenience wrappers over useServices() — no logic of their own.
export const useAuthService = () => useServices().authService;
export const useSyncService = () => useServices().syncService;
export const useTrialGrantSync = () => useServices().trialGrantSync;
export const useExamRepository = () => useServices().examRepository;
export const useTopicRepository = () => useServices().topicRepository;
export const useQuestionRepository = () => useServices().questionRepository;
export const usePackageRepository = () => useServices().packageRepository;
export const useUserProfileRepository = () => useServices().userProfileRepository;
export const useEntitlementRepository = () => useServices().entitlementRepository;
export const useAttemptRepository = () => useServices().attemptRepository;
export const useExamSessionRepository = () => useServices().examSessionRepository;
export const useLearningMetricsRepository = () => useServices().learningMetricsRepository;
export const useRepeatPoolRepository = () => useServices().repeatPoolRepository;
export const useTrialAccessRepository = () => useServices().trialAccessRepository;
export const usePurchaseService = () => useServices().purchaseService;

// The current user profile is fetched with this exact query (same key,
// same use case) from nearly every screen — centralized here instead of
// repeated inline in each one.
export function useCurrentUserProfile() {
  const userProfileRepository = useUserProfileRepository();
  return useQuery({
    queryKey: ['userProfile', 'current'],
    queryFn: () => new GetCurrentUserProfileUseCase({ userProfileRepository }).execute(),
  });
}
