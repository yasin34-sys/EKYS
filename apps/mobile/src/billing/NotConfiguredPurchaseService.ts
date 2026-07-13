import type { PremiumPlanId } from './premiumPlans';
import type { PurchaseService } from './PurchaseService';

export class PurchaseNotConfiguredError extends Error {
  constructor() {
    super('Ödeme altyapısı henüz yapılandırılmadı.');
    this.name = 'PurchaseNotConfiguredError';
  }
}

// No store purchase SDK is installed yet (react-native-iap/RevenueCat —
// deliberately not added until it can be installed and built cleanly,
// with real keys kept out of the repo; see premium.tsx). Every method
// here throws rather than silently granting entitlement — there is no
// path in this class that ever marks a plan as purchased.
export class NotConfiguredPurchaseService implements PurchaseService {
  isConfigured(): boolean {
    return false;
  }
  async purchase(_planId: PremiumPlanId): Promise<void> {
    throw new PurchaseNotConfiguredError();
  }
  async restorePurchases(): Promise<void> {
    throw new PurchaseNotConfiguredError();
  }
  async openManageSubscription(): Promise<void> {
    throw new PurchaseNotConfiguredError();
  }
}
