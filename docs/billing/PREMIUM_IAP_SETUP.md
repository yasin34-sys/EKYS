# Premium IAP Setup

This document is the product and store setup contract for EKYSCEPTE Premium.
The mobile app may show these plans, but it must not grant Premium locally.
The server remains the source of truth and writes `entitlements.expires_at`.

## Product Model

EKYSCEPTE uses prepaid timed access, not lifetime access and not an external
mobile payment button.

| Plan ID | User-facing name | Duration | Price |
|---|---:|---:|---:|
| `premium_3m` | 3 Ay Premium | 3 months | 499 TL |
| `premium_6m` | 6 Ay Premium | 6 months | 699 TL |
| `premium_9m` | 9 Ay Premium | 9 months | 899 TL |
| `premium_12m` | 12 Ay Premium | 12 months | 1050 TL |

The same plan IDs are used in `apps/mobile/src/billing/premiumPlans.ts`.
Do not rename them after products are created in the stores unless a migration
plan is written first.

## iOS / App Store Connect

Use App Store in-app purchase for digital content. For this prepaid model,
configure four non-renewing subscription products:

| Product ID | Type | Access duration to grant server-side |
|---|---|---:|
| `premium_3m` | Non-Renewing Subscription | 3 months |
| `premium_6m` | Non-Renewing Subscription | 6 months |
| `premium_9m` | Non-Renewing Subscription | 9 months |
| `premium_12m` | Non-Renewing Subscription | 12 months |

Important: Apple non-renewing subscriptions do not by themselves maintain the
app's access period for us. After purchase validation, EKYSCEPTE's backend must
create or extend the user's entitlement and set `expires_at`.

## Android / Google Play Console

Use Google Play Billing for digital content. Configure prepaid access through
Google Play subscription/prepaid-plan products. The app must not add a separate
Google Pay or external checkout button for this mobile digital content.
Google Pay may appear as a payment method inside the Google Play purchase sheet.

Preferred setup:

| Internal Plan ID | Google Play setup | Access duration to grant server-side |
|---|---|---:|
| `premium_3m` | Prepaid subscription/base plan | 3 months |
| `premium_6m` | Prepaid subscription/base plan | 6 months |
| `premium_9m` | Prepaid subscription/base plan | 9 months |
| `premium_12m` | Prepaid subscription/base plan | 12 months |

If Google Play Console requires a separate subscription product structure, keep
the internal plan IDs above and document the final Google product/base-plan IDs
here before wiring the app.

## Backend Entitlement Rule

After a purchase is verified by the backend:

1. Resolve the authenticated app user.
2. Resolve the purchased plan ID.
3. Compute the new expiry:
   - If the user has active Premium with future `expires_at`, extend from that
     future timestamp.
   - Otherwise start from server `now()`.
4. Create or update `entitlements` as `status = 'ACTIVE'`.
5. Create `package_access` rows for all current Premium packages covered by the
   plan.
6. Set `entitlements.expires_at` to the computed expiry.

The client only receives the resulting entitlement through normal sync.

## Restore Purchases

Restore must verify store purchase history server-side and then reconcile
`entitlements` and `package_access`. The client must not unlock Premium only
because a local SDK reports a purchase.

## Implementation Order

1. Create the products/plans in App Store Connect and Google Play Console.
2. Choose and configure the purchase SDK path.
   - RevenueCat can simplify cross-platform purchase UI and webhooks.
   - Direct StoreKit/Google Play Billing is possible but requires more backend
     validation plumbing.
3. Add the mobile purchase SDK and replace the disabled Premium button.
4. Add server validation/webhook handling that writes `expires_at`.
5. Add restore purchases.
6. Test sandbox purchases on both stores before production submission.
