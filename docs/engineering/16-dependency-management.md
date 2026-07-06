# Engineering Foundation 16: Dependency Management

## Status
Accepted

## Purpose
Üçüncü parti bağımlılıkların (npm paketleri) seçim, güncelleme ve kaldırma felsefesini tanımlamak.

## 1. Dependency Approval Rule
Yeni bir bağımlılık eklenmeden önce gerçekten gerekli olup olmadığı sorgulanır (Madde 2 ile ilişkili); rastgele/gerekçesiz bağımlılık eklenmez.

## 2. Minimal Dependency Principle
Az sayıda, iyi seçilmiş bağımlılık; her küçük ihtiyaç için ayrı bir paket eklenmez (YAGNI ile tutarlı).

## 3. Active Maintenance / Security / License Review
Bir bağımlılık eklenmeden önce: aktif bakım görüp görmediği, bilinen güvenlik açığı taşıyıp taşımadığı, lisansının proje ile uyumlu olup olmadığı değerlendirilir.

## 4. Native Dependency Risk
Native modül gerektiren bağımlılıklar (SQLite erişimi, ADR-004 gibi), Expo/RN Compatibility (Madde 5) açısından ekstra dikkatle değerlendirilir — Custom Development Client (ADR-001) gereksinimini artırabilir.

## 5. Expo / RN Compatibility
Her bağımlılık, ADR-001'deki React Native + Expo (Custom Development Client + EAS Build) yapılandırmasıyla uyumluluğu kontrol edilerek seçilir.

## 6. Lockfile Policy
Bağımlılık sürümleri bir lockfile ile kilitlenir; "aynı ortam, aynı sonuç" ilkesi (Development Environment, Madde 4) bununla desteklenir.

## 7. Update Policy
Bağımlılık güncellemeleri düzenli ama kontrollü yapılır; büyük sürüm sıçramaları (breaking change riski taşıyanlar) ayrıca test edilir.

## 8. Deprecation / Replacement Policy
Artık bakım görmeyen bir bağımlılık tespit edildiğinde, alternatifi değerlendirilir ve planlı bir şekilde değiştirilir.

## 9. AI-Suggested Dependency Rule
AI'nın önerdiği bir bağımlılık, Madde 1-3'teki aynı onay/inceleme sürecinden geçer; AI önerisi olması otomatik kabul anlamına gelmez.

## 10. Dependency Ownership
Kritik kategorilerdeki (native, security, persistence, build) bağımlılıkların bir sahibi (owner) olması şarttır — bu paketlerin güncellenmesi/kaldırılması sahibinin onayından geçer.

## 11. Dependency Removal Policy
Kullanılmayan bir bağımlılık tespit edildiğinde kaldırılır (Linting & Formatting Strategy, Madde 13 — Dead Code/Unused Dependency Policy ile ilişkili).

## 12. Dependency Review Rule
Bağımlılık listesi periyodik olarak (örn. güvenlik taraması, Security Baseline Madde 10) gözden geçirilir.

## Risks
| Risk | Açıklama |
|---|---|
| Bakımsız bağımlılık | Güvenlik açığı yamaları alamayan, terk edilmiş bir paket |
| Native uyumsuzluk | Expo/RN ile uyumsuz bir native modülün Bare Workflow gereksinimini tetiklemesi (ADR-001, Risks) |

## Mitigations
- Active Maintenance/Security Review (Madde 3), bakımsız paketlerin eklenmesini önler.
- Native Dependency Risk (Madde 4) ve Expo/RN Compatibility (Madde 5) kontrolü, ADR-001'deki riskleri azaltır.

## Non-Goals
- Somut paket yöneticisi seçimi (npm/yarn/pnpm) — Package Strategy Blueprint.
- Belirli bağımlılıkların (SQLite kütüphanesi, IAP sağlayıcı vb.) seçimi — ilgili ADR'lerin Architecture Notes bölümleri.

## Acceptance Criteria
- [x] ADR-001, ADR-004 ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; bağımlılık eklenmedi.

## See Also
- ADR-001 (React Native + Expo)
- ADR-004 (SQLite Local Database)
- Engineering Foundation 09 (Development Environment)
