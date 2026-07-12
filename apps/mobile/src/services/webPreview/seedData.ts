// ============================================================================
// Web Preview Seed Data — DEV/QA HARNESS ONLY
// ============================================================================
// @op-engineering/op-sqlite is a native-only module (no browser bundle path
// through Metro in this project's configuration) and Supabase credentials
// are not configured in this environment. Since ADR-001 targets iOS/Android
// only, Expo Web was never meant to run against real data — but it is the
// only way to visually inspect screens with Playwright in this environment
// (no device/simulator available).
//
// This file — and the rest of src/services/webPreview/ — is wired in
// exclusively for Platform.OS === 'web' (see app/_layout.tsx) and is never
// reached on iOS/Android, where the real SqliteXRepository classes and real
// Supabase-backed AuthService continue to run completely unmodified. It
// implements the exact same Repository interfaces the real app uses — no
// screen or use case has any awareness this exists.
// ============================================================================

import type {
  Exam,
  Topic,
  Question,
  Package,
  UserProfile,
  Entitlement,
  Attempt,
  LearningMetric,
} from '../../domain';

const now = new Date().toISOString();

export const SEED_USER_ID = 'web-preview-user-0001';

export const seedUserProfile: UserProfile = {
  id: SEED_USER_ID,
  accountStatus: 'ANONYMOUS',
  createdAt: now,
  updatedAt: now,
};

export const seedExam: Exam = {
  id: 'exam-ekys-2026',
  name: 'EKYS 2026',
  status: 'PUBLISHED',
  questionCount: 80,
  durationMinutes: 150,
  passingScore: 60,
  supersedesExamId: null,
  createdAt: now,
  updatedAt: now,
};

function topic(
  id: string,
  parentTopicId: string | null,
  name: string,
  displayOrder: number,
): Topic {
  return {
    id,
    examId: seedExam.id,
    parentTopicId,
    name,
    displayOrder,
    status: 'PUBLISHED',
    createdAt: now,
    updatedAt: now,
  };
}

export const seedTopics: Topic[] = [
  topic('t-mevzuat', null, 'Eğitim Mevzuatı', 1),
  topic('t-mevzuat-mek', 't-mevzuat', 'Milli Eğitim Temel Kanunu', 1),
  topic('t-mevzuat-yon', 't-mevzuat', 'Yönetmelikler', 2),
  topic('t-yonetim', null, 'Yönetim Bilimi', 2),
  topic('t-yonetim-lider', 't-yonetim', 'Liderlik ve Motivasyon', 1),
  topic('t-yonetim-karar', 't-yonetim', 'Karar Verme Süreçleri', 2),
  topic('t-genel', null, 'Genel Yetenek', 3),
  topic('t-genel-turkce', 't-genel', 'Türkçe', 1),
  topic('t-genel-matematik', 't-genel', 'Matematik', 2),
];

interface QuestionSeed {
  id: string;
  topicId: string;
  body: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

const questionSeeds: QuestionSeed[] = [
  // Milli Eğitim Temel Kanunu
  {
    id: 'q-mek-1',
    topicId: 't-mevzuat-mek',
    body: 'Milli Eğitim Temel Kanunu\'na göre Türk Milli Eğitiminin genel amaçlarından biri aşağıdakilerden hangisidir?',
    options: [
      'Atatürk ilke ve inkılaplarına bağlı, milli değerleri benimseyen bireyler yetiştirmek',
      'Yalnızca mesleki bilgi ve beceri kazandırmak',
      'Yalnızca üniversiteye hazırlık sağlamak',
      'Belirli bir meslek grubuna öncelik tanımak',
    ],
    correctIndex: 0,
  },
  {
    id: 'q-mek-2',
    topicId: 't-mevzuat-mek',
    body: 'Türk Milli Eğitim Sistemi kaç temel bölümden oluşur?',
    options: ['Örgün ve yaygın eğitim', 'Yalnızca örgün eğitim', 'Yalnızca uzaktan eğitim', 'Yalnızca yaygın eğitim'],
    correctIndex: 0,
  },
  {
    id: 'q-mek-3',
    topicId: 't-mevzuat-mek',
    body: 'Milli Eğitim Temel Kanunu\'nda yer alan "fırsat ve imkan eşitliği" ilkesi neyi ifade eder?',
    options: [
      'Eğitimde hiçbir ayrım yapılmaksızın herkese eşit imkan sağlanmasını',
      'Yalnızca şehir merkezlerine öncelik verilmesini',
      'Yalnızca maddi durumu iyi olan ailelerin çocuklarına öncelik verilmesini',
      'Eğitimin isteğe bağlı olmasını',
    ],
    correctIndex: 0,
  },
  {
    id: 'q-mek-4',
    topicId: 't-mevzuat-mek',
    body: 'Milli eğitim hizmetinin bir bütün olarak yürütülmesinden hangi bakanlık sorumludur?',
    options: ['Milli Eğitim Bakanlığı', 'Hazine ve Maliye Bakanlığı', 'İçişleri Bakanlığı', 'Adalet Bakanlığı'],
    correctIndex: 0,
  },

  // Yönetmelikler
  {
    id: 'q-yon-1',
    topicId: 't-mevzuat-yon',
    body: 'Okul müdürü görevlendirmelerinde adayların başvuru şartlarını düzenleyen temel yönetmelik hangisidir?',
    options: [
      'Millî Eğitim Bakanlığı Eğitim Kurumları Yöneticilerinin Görevlendirilmesine Dair Yönetmelik',
      'Millî Eğitim Bakanlığı Rehberlik Hizmetleri Yönetmeliği',
      'Millî Eğitim Bakanlığı Ortaöğretim Kurumları Sınıf Geçme Yönetmeliği',
      'Kamu Görevlileri Etik Davranış İlkeleri Yönetmeliği',
    ],
    correctIndex: 0,
  },
  {
    id: 'q-yon-2',
    topicId: 't-mevzuat-yon',
    body: 'Eğitim kurumu müdür yardımcılığı için aranan asgari kıdem şartı kaç yıldır?',
    options: ['2 yıl', '4 yıl', '6 yıl', '8 yıl'],
    correctIndex: 0,
  },
  {
    id: 'q-yon-3',
    topicId: 't-mevzuat-yon',
    body: 'Yöneticilik görevlendirmesinde sözlü sınav komisyonu kaç üyeden oluşur?',
    options: ['Yönetmelikte belirtilen sayıda, il milli eğitim müdürünün başkanlığında', 'Tek üyeden', 'Yalnızca okul müdüründen', 'Yalnızca velilerden'],
    correctIndex: 0,
  },
  {
    id: 'q-yon-4',
    topicId: 't-mevzuat-yon',
    body: 'Görevlendirme süresi dolan bir müdürün yeniden görevlendirilebilmesi için ne gereklidir?',
    options: [
      'Yönetmelikte tanımlanan değerlendirme ve başvuru sürecinin yeniden işletilmesi',
      'Hiçbir işlem yapılmadan otomatik uzatma',
      'Sadece bir dilekçe vermesi',
      'Yalnızca il müdürünün sözlü onayı',
    ],
    correctIndex: 0,
  },

  // Liderlik ve Motivasyon
  {
    id: 'q-lider-1',
    topicId: 't-yonetim-lider',
    body: 'Durumsallık (contingency) liderlik kuramına göre etkili liderlik tarzı neye göre değişir?',
    options: ['İçinde bulunulan durumun koşullarına göre', 'Yalnızca liderin kişiliğine göre', 'Yalnızca astların yaşına göre', 'Kurumun büyüklüğüne göre'],
    correctIndex: 0,
  },
  {
    id: 'q-lider-2',
    topicId: 't-yonetim-lider',
    body: 'Herzberg\'in Çift Faktör Kuramı\'na göre "hijyen faktörleri" eksik olduğunda ne olur?',
    options: ['Çalışan memnuniyetsizliği ortaya çıkar', 'Çalışan motivasyonu otomatik olarak artar', 'Kurum verimliliği kesin olarak yükselir', 'Hiçbir etkisi olmaz'],
    correctIndex: 0,
  },
  {
    id: 'q-lider-3',
    topicId: 't-yonetim-lider',
    body: 'Dönüşümcü (transformasyonel) liderlik yaklaşımının temel özelliği nedir?',
    options: [
      'Ortak bir vizyon etrafında astları ilham vererek harekete geçirmek',
      'Yalnızca kural ve cezaya dayalı yönetim',
      'Kararları tamamen astlara bırakmak',
      'Hiçbir geri bildirim vermemek',
    ],
    correctIndex: 0,
  },
  {
    id: 'q-lider-4',
    topicId: 't-yonetim-lider',
    body: 'Maslow\'un İhtiyaçlar Hiyerarşisi\'nde en üst düzey ihtiyaç hangisidir?',
    options: ['Kendini gerçekleştirme', 'Fizyolojik ihtiyaçlar', 'Güvenlik ihtiyacı', 'Ait olma ihtiyacı'],
    correctIndex: 0,
  },

  // Karar Verme Süreçleri
  {
    id: 'q-karar-1',
    topicId: 't-yonetim-karar',
    body: 'Rasyonel karar verme sürecinin ilk adımı genellikle hangisidir?',
    options: ['Problemin tanımlanması', 'Alternatiflerin uygulanması', 'Sonuçların değerlendirilmesi', 'Kararın duyurulması'],
    correctIndex: 0,
  },
  {
    id: 'q-karar-2',
    topicId: 't-yonetim-karar',
    body: 'Grupla karar vermenin en sık eleştirilen risklerinden biri hangisidir?',
    options: ['Grup düşüncesi (groupthink)', 'Kararın çok hızlı alınması', 'Bireysel sorumluluğun artması', 'Verinin fazla analiz edilmesi'],
    correctIndex: 0,
  },
  {
    id: 'q-karar-3',
    topicId: 't-yonetim-karar',
    body: 'Sınırlı rasyonellik (bounded rationality) kavramı neyi ifade eder?',
    options: [
      'Karar vericilerin sınırlı bilgi ve zamanla "yeterince iyi" bir çözüm aramasını',
      'Kararların her zaman mükemmel bilgiyle alınabileceğini',
      'Kararların yalnızca sezgiyle alınması gerektiğini',
      'Karar vermenin hiçbir sınırı olmadığını',
    ],
    correctIndex: 0,
  },
  {
    id: 'q-karar-4',
    topicId: 't-yonetim-karar',
    body: 'Acil olmayan ama önemli işler, zaman yönetimi matrisinde hangi çeyrekte yer alır?',
    options: ['İkinci çeyrek (önemli, acil değil)', 'Birinci çeyrek (önemli ve acil)', 'Üçüncü çeyrek (önemsiz, acil)', 'Dördüncü çeyrek (önemsiz, acil değil)'],
    correctIndex: 0,
  },

  // Türkçe
  {
    id: 'q-turkce-1',
    topicId: 't-genel-turkce',
    body: '"Öğretmenin sınıfa girmesiyle birlikte öğrenciler sessizleşti." cümlesinde altı çizili öge hangi cümle ögesidir?',
    options: ['Zarf tümleci', 'Özne', 'Nesne', 'Yüklem'],
    correctIndex: 0,
  },
  {
    id: 'q-turkce-2',
    topicId: 't-genel-turkce',
    body: 'Aşağıdakilerden hangisi bir söz sanatı (mecaz) örneğidir?',
    options: ['"Yüreği yanıyordu."', '"Saat üçte toplantı var."', '"Kitap masanın üzerinde."', '"Bugün hava soğuk."'],
    correctIndex: 0,
  },
  {
    id: 'q-turkce-3',
    topicId: 't-genel-turkce',
    body: 'Aşağıdaki cümlelerin hangisinde yazım yanlışı vardır?',
    options: ['"Yalnış anlaşılma olmasın."', '"Yanlış anlaşılma olmasın."', '"Doğru bildiğini yap."', '"Bugün okula gitmedim."'],
    correctIndex: 0,
  },
  {
    id: 'q-turkce-4',
    topicId: 't-genel-turkce',
    body: 'Bir metnin ana düşüncesi genellikle nasıl belirlenir?',
    options: [
      'Metindeki yardımcı düşünceler bir araya getirilerek çıkarılan temel yargıyla',
      'Yalnızca ilk cümle okunarak',
      'Yalnızca başlığa bakılarak',
      'Metindeki en uzun cümle bulunarak',
    ],
    correctIndex: 0,
  },

  // Matematik
  {
    id: 'q-mat-1',
    topicId: 't-genel-matematik',
    body: 'Bir sınavda 80 sorudan 52 tanesi doğru cevaplanmıştır. Doğru cevap yüzdesi kaçtır?',
    options: ['%65', '%60', '%70', '%52'],
    correctIndex: 0,
  },
  {
    id: 'q-mat-2',
    topicId: 't-genel-matematik',
    body: '3 sayının aritmetik ortalaması 12 ise bu sayıların toplamı kaçtır?',
    options: ['36', '24', '12', '48'],
    correctIndex: 0,
  },
  {
    id: 'q-mat-3',
    topicId: 't-genel-matematik',
    body: 'Bir işi 6 günde bitiren bir kişi, günde işin kaçta kaçını yapar?',
    options: ['1/6', '1/3', '6', '1/2'],
    correctIndex: 0,
  },
  {
    id: 'q-mat-4',
    topicId: 't-genel-matematik',
    body: '150 dakikalık bir sınavın %40\'ı geçtiğinde kaç dakika kalmıştır?',
    options: ['90 dakika', '60 dakika', '100 dakika', '75 dakika'],
    correctIndex: 0,
  },
];

const optionLabels = ['A', 'B', 'C', 'D'] as const;

export const seedQuestions: Question[] = questionSeeds.map((seed) => ({
  id: seed.id,
  examId: seedExam.id,
  topicId: seed.topicId,
  questionType: 'SINGLE_CHOICE',
  body: seed.body,
  revision: 1,
  status: 'PUBLISHED',
  createdAt: now,
  updatedAt: now,
  options: seed.options.map((body, index) => ({
    id: `${seed.id}-opt-${optionLabels[index]}`,
    questionId: seed.id,
    label: optionLabels[index],
    body,
    isCorrect: index === seed.correctIndex,
    displayOrder: index + 1,
  })),
}));

function questionIdsForTopics(topicIds: string[]): string[] {
  return seedQuestions.filter((q) => topicIds.includes(q.topicId)).map((q) => q.id);
}

export const seedPackages: Package[] = [
  {
    id: 'pkg-free-kolay',
    examId: seedExam.id,
    packageType: 'TEMEL_CALISMA',
    difficultyLevel: 'KOLAY',
    version: 1,
    checksum: null,
    isFreeTier: true,
    status: 'PUBLISHED',
    title: null,
    description: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'pkg-yogun-orta',
    examId: seedExam.id,
    packageType: 'YOGUN_TEKRAR',
    difficultyLevel: 'ORTA',
    version: 1,
    checksum: null,
    isFreeTier: false,
    status: 'PUBLISHED',
    title: null,
    description: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'pkg-deneme-orta',
    examId: seedExam.id,
    packageType: 'ZORLAYICI_DENEME',
    difficultyLevel: 'ORTA',
    version: 1,
    checksum: null,
    isFreeTier: false,
    status: 'PUBLISHED',
    title: null,
    description: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'pkg-deneme-zor',
    examId: seedExam.id,
    packageType: 'ZORLAYICI_DENEME',
    difficultyLevel: 'ZOR',
    version: 1,
    checksum: null,
    isFreeTier: false,
    status: 'PUBLISHED',
    title: null,
    description: null,
    createdAt: now,
    updatedAt: now,
  },
];

// package_id -> question_id[], mirroring the package_questions join table.
export const seedPackageQuestions: Record<string, string[]> = {
  'pkg-free-kolay': questionIdsForTopics(['t-genel-turkce', 't-genel-matematik']),
  'pkg-yogun-orta': questionIdsForTopics(['t-mevzuat-mek', 't-mevzuat-yon', 't-yonetim-lider']),
  'pkg-deneme-orta': questionIdsForTopics([
    't-mevzuat-mek',
    't-mevzuat-yon',
    't-yonetim-lider',
    't-yonetim-karar',
    't-genel-turkce',
    't-genel-matematik',
  ]),
  'pkg-deneme-zor': questionIdsForTopics(['t-yonetim-karar', 't-genel-matematik']),
};

// Only pkg-yogun-orta and pkg-deneme-orta are entitled; pkg-free-kolay needs
// no entitlement (isFreeTier), and pkg-deneme-zor is deliberately left
// locked so the paywall/"Kilidi Aç" state remains inspectable.
export const seedEntitlements: Entitlement[] = [
  {
    id: 'ent-1',
    userId: SEED_USER_ID,
    examId: seedExam.id,
    status: 'ACTIVE',
    source: 'PROMOTION',
    packageIds: ['pkg-yogun-orta', 'pkg-deneme-orta'],
    grantedAt: now,
    createdAt: now,
    updatedAt: now,
  },
];

// Represents a candidate who has already been studying for a few days —
// gives Repeat Pool and Statistics/Learning Progress real, non-empty data
// to render on first load, instead of only ever showing empty states.
// question_type is SINGLE_CHOICE-only and every seed question's correct
// option is always "A" (see seedQuestions above), so a "wrong" attempt
// deterministically selects "B".
interface AttemptSeed {
  questionId: string;
  isCorrect: boolean;
  daysAgo: number;
}

const attemptSeeds: AttemptSeed[] = [
  // t-mevzuat-mek: 3 correct, 1 wrong
  { questionId: 'q-mek-1', isCorrect: false, daysAgo: 6 },
  { questionId: 'q-mek-2', isCorrect: true, daysAgo: 6 },
  { questionId: 'q-mek-3', isCorrect: true, daysAgo: 5 },
  { questionId: 'q-mek-4', isCorrect: true, daysAgo: 5 },
  // t-yonetim-lider: 2 correct, 2 wrong
  { questionId: 'q-lider-1', isCorrect: false, daysAgo: 4 },
  { questionId: 'q-lider-2', isCorrect: false, daysAgo: 4 },
  { questionId: 'q-lider-3', isCorrect: true, daysAgo: 3 },
  { questionId: 'q-lider-4', isCorrect: true, daysAgo: 3 },
  // t-genel-turkce: 4 correct, 0 wrong
  { questionId: 'q-turkce-1', isCorrect: true, daysAgo: 2 },
  { questionId: 'q-turkce-2', isCorrect: true, daysAgo: 2 },
  { questionId: 'q-turkce-3', isCorrect: true, daysAgo: 1 },
  { questionId: 'q-turkce-4', isCorrect: true, daysAgo: 1 },
];

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export const seedAttempts: Attempt[] = attemptSeeds.map((seed, index) => {
  const answeredAt = daysAgoIso(seed.daysAgo);
  return {
    id: `seed-attempt-${index + 1}`,
    userId: SEED_USER_ID,
    examId: seedExam.id,
    questionId: seed.questionId,
    examSessionId: null,
    sequence: null,
    selectedOptionId: `${seed.questionId}-opt-${seed.isCorrect ? 'A' : 'B'}`,
    isCorrect: seed.isCorrect,
    serverVerifiedCorrect: null,
    serverVerifiedAt: null,
    answeredAt,
    createdAt: answeredAt,
    updatedAt: answeredAt,
    syncedAt: null,
  };
});

// Topic accuracy per (topicId), matching computeTopicAccuracy's exact
// formula (correct / total) — mirrors what SubmitAnswerUseCase would have
// produced had these attempts been made through the real flow.
function topicAccuracy(topicId: string): number {
  const relevant = attemptSeeds.filter((s) => seedQuestions.find((q) => q.id === s.questionId)?.topicId === topicId);
  if (relevant.length === 0) return 0;
  return relevant.filter((s) => s.isCorrect).length / relevant.length;
}

const seededTopicIds = ['t-mevzuat-mek', 't-yonetim-lider', 't-genel-turkce'];

export const seedLearningMetrics: LearningMetric[] = seededTopicIds.map((topicId, index) => ({
  id: `seed-metric-${index + 1}`,
  userId: SEED_USER_ID,
  examId: seedExam.id,
  topicId,
  metricType: 'TOPIC_ACCURACY',
  value: topicAccuracy(topicId),
  computedFrom: null,
  computedTo: null,
  computedAt: now,
  createdAt: now,
  updatedAt: now,
  syncedAt: null,
}));
