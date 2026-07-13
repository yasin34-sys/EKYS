import type { PremiumPlanId } from './premiumPlans';

// Real store product IDs — created once in Play Console / App Store
// Connect, never renamed afterward (renaming a live product id orphans
// existing subscribers). Centralized here so premiumPlans.ts's
// app-facing plan ids and the store's actual product ids can never
// drift apart silently at a scattered call site. These exact strings
// (ekys_premium_3m / 6m / 9m / 12m) still need to be created in both
// consoles before any purchase call can succeed.
export const PURCHASE_PRODUCT_IDS: Record<PremiumPlanId, string> = {
  premium_3m: 'ekys_premium_3m',
  premium_6m: 'ekys_premium_6m',
  premium_9m: 'ekys_premium_9m',
  premium_12m: 'ekys_premium_12m',
};

export interface PurchaseService {
  // False until a real store/purchase SDK (RevenueCat, react-native-iap,
  // ...) is installed and wired in. Screens must check this before
  // offering "Satın al" as a live, tappable action — not only before
  // calling purchase() — so the UI itself stays honest about current
  // capability instead of showing a button that always throws.
  isConfigured(): boolean;

  purchase(planId: PremiumPlanId): Promise<void>;
  restorePurchases(): Promise<void>;
  openManageSubscription(): Promise<void>;
}
