export type PremiumPlanId = 'premium_3m' | 'premium_6m' | 'premium_9m' | 'premium_12m';

export interface PremiumPlan {
  id: PremiumPlanId;
  title: string;
  duration: string;
  durationMonths: number;
  price: string;
  note: string;
  featured?: boolean;
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'premium_3m',
    title: '3 Ay Premium',
    duration: 'Kısa dönem hazırlık',
    durationMonths: 3,
    price: '499 TL',
    note: 'Premium konu sınavları ve ücretli denemeler açılır.',
  },
  {
    id: 'premium_6m',
    title: '6 Ay Premium',
    duration: 'Düzenli çalışma dönemi',
    durationMonths: 6,
    price: '699 TL',
    note: 'Yoğun hazırlık süreci için süreli erişim.',
  },
  {
    id: 'premium_9m',
    title: '9 Ay Premium',
    duration: 'Uzun hazırlık takvimi',
    durationMonths: 9,
    price: '899 TL',
    note: 'Sınava yayılan çalışma planları için.',
  },
  {
    id: 'premium_12m',
    title: '12 Ay Premium',
    duration: 'En uzun erişim',
    durationMonths: 12,
    price: '1050 TL',
    note: 'Bir yıl boyunca tüm premium içeriklere erişim.',
    featured: true,
  },
];

export const DEFAULT_PREMIUM_PLAN_ID: PremiumPlanId = 'premium_12m';
