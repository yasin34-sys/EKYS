# Engineering Foundation 13: Linting & Formatting Strategy

## Status
Accepted

## Purpose
Kod tutarlılığının otomatik araçlarla nasıl korunacağının felsefesini tanımlamak — somut araç seçimi (ESLint/Prettier/Biome vb.) bu dokümanın kapsamı dışındadır.

## 1. Consistency First
Kod stili, bireysel tercihe değil, otomatik ve tutarlı bir standarda dayanır.

## 2. Automatic Formatting / Linting
Format ve stil kontrolü, elle değil, otomatik araçlarla uygulanır — bir geliştiricinin "stil tercihi" tartışması gereksiz hâle gelir.

## 3. Human vs. Tool Responsibility
Araçlar stil/format/basit hata sınıflarını yakalar; mimari uyum, iş mantığı doğruluğu gibi konular insan review'unun sorumluluğunda kalır (araçlar bunun yerini tutmaz).

## 4. Architecture / Security / Naming / Type Safety / Import Rule Enforcement
Mümkün olduğunca, Coding Standards (Madde 10), Security Baseline (Madde 1), Naming Conventions (Madde 12), TypeScript Standards (Madde 11) ve Repository Folder Structure'daki (Madde 5) Import Rules, otomatik araçlarla denetlenir hedeflenir.

## 5. Dead Code / Unused Dependency Policy
Kullanılmayan kod/bağımlılık, otomatik araçlarla tespit edilip temizlenmesi hedeflenir.

## 6. Warning vs. Error Philosophy
Kritik ihlaller (güvenlik, mimari sınır) **error** seviyesindedir ve merge'ü engeller; stilistik tercihler **warning** seviyesinde kalabilir.

## 7. IDE Independence
Lint/format kuralları, belirli bir IDE'ye bağımlı olmadan, komut satırından da çalıştırılabilir olmalıdır.

## 8. AI Generated Code Validation
AI tarafından üretilen kod da aynı otomatik kontrollerden geçer; istisna tanınmaz.

## 9. Rule Evolution Policy
Kurallar zamanla (yeni ihtiyaçlar doğdukça) güncellenebilir; bu güncellemeler açıkça dokümante edilir.

## 10. Quality Gate Rule
**Kritik ihlaller, merge öncesi bir kapı (gate) oluşturur** — bu kapının somut CI/CD implementasyonu, Engineering Foundation Madde 18 (CI/CD Strategy) kapsamında detaylandırılacaktır.

## Risks
| Risk | Açıklama |
|---|---|
| Kural gevşemesi | Zaman baskısıyla warning'lerin/error'ların göz ardı edilmesi |
| Araç seçimi netleşmeden tutarsızlık | Somut araç kararı gecikirse manuel stil tutarsızlığı birikebilir |

## Mitigations
- Quality Gate Rule (Madde 10), kritik ihlallerin merge'ü engellemesini garanti eder.
- Araç seçimi, kod yazımına geçilmeden önce netleştirilecek bir öncelikli implementasyon görevi olarak işaretlenmiştir.

## Non-Goals
- Somut lint/format aracının seçimi (ESLint, Prettier, Biome vb.).
- Kural setinin somut (satır satır) tanımı.

## Acceptance Criteria
- [x] Coding Standards ve Security Baseline ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; araç seçilmedi.

## See Also
- Engineering Foundation 10 (Coding Standards)
- Engineering Foundation 18 (CI/CD Strategy)
