# Engineering Foundation 10: Coding Standards

## Status
Accepted

## Purpose
Kod yazımının genel felsefesini ve kalite standartlarını tanımlamak.

## 1. Clean Architecture / Dependency Direction
Kod, ADR-010'daki Dependency Direction'a (UI → Application → State → Persistence → Backend) uyar; alt katmanlar üst katmanları bilmez.

## 2. Separation of Concerns
Her modül/fonksiyon/bileşen, tek bir sorumluluğa odaklanır.

## 3. Readability First
Kodun okunabilirliği, kısalığından veya "akıllıca" olmasından önce gelir.

## 4. Single Responsibility Principle
Bir fonksiyon/bileşen/sınıf, tek bir değişim nedenine sahip olmalıdır.

## 5. YAGNI (You Aren't Gonna Need It)
Şu an ihtiyaç olmayan bir soyutlama/özellik önceden eklenmez.

## 6. Explicitness over Magic
Açık, izlenebilir kod; "sihirli" (implicit, gizli yan etkili) davranışlardan kaçınılır.

## 7. Error Handling Standard
Hatalar sessizce yutulmaz; her hata ele alınır veya açıkça yukarı iletilir.

## 8. Logging Standard
Loglar anlamlı, hassas veri içermeyen (Security Baseline, Madde 11) ve hata ayıklamaya yardımcı olacak şekilde yazılır.

## 9. Config Standard
Yapılandırma değerleri kod içine gömülü sabitler olarak değil, merkezi ve açık şekilde yönetilir (Environment Variable Strategy, Madde 3 ile ilişkili).

## 10. Function / Component / File Size
Fonksiyonlar, bileşenler ve dosyalar makul boyutta tutulur; aşırı büyüyen bir birim bölünmesi gereken bir sinyal olarak değerlendirilir.

## 11. Duplication Policy
Kod tekrarından kaçınılır, ama "her tekrar kötüdür" mantığıyla erken/gereksiz soyutlama da yapılmaz (YAGNI ile dengelenir).

## 12. Comments Policy
Yorumlar, kodun "ne yaptığını" değil, kodun kendisinden çıkarılamayan "neden"i açıklar.

## 13. AI-Generated Code Review Rule
AI tarafından üretilen kod, insan tarafından **aynı** standartlara göre review edilir; AI çıktısı olduğu için farklı/gevşek bir standarda tabi tutulmaz.

## 14. Refactoring Policy
Refactoring, davranış değişikliğiyle karıştırılmaz; bir refactor PR'ı davranış değiştirmemelidir.

## 15. Code Review Checklist
Review sırasında kontrol edilir: mimari uyum (ADR'ler), okunabilirlik, hata yönetimi, test kapsamı, güvenlik.

## 16. Backward Compatibility
Mevcut bir davranış/arayüz, gerekçesiz şekilde geriye uyumsuz değiştirilmez.

## 17. Public API Stability
Modüller arası paylaşılan (shared package) arayüzler, dikkatli ve kontrollü değiştirilir.

## 18. Technical Debt Rule
Bilinçli alınan teknik borç (örn. "şimdilik basit tut, sonra genişlet") açıkça not edilir, sessizce unutulmaz.

## Risks
| Risk | Açıklama |
|---|---|
| Standart gevşemesi | Zaman baskısıyla standartların atlanması |
| AI çıktısının düşük standartla kabulü | AI'nın ürettiği kodun daha az sıkı incelenmesi |

## Mitigations
- AI-Generated Code Review Rule (Madde 13), AI çıktısının aynı titizlikle incelenmesini garanti eder.
- Code Review Checklist (Madde 15) her PR'da tutarlı bir denetim sağlar.

## Non-Goals
- Somut lint kuralları/araç seçimi — Linting & Formatting Strategy (Madde 13).
- TypeScript'e özel kurallar — TypeScript Standards (Madde 11).

## Acceptance Criteria
- [x] ADR-010 ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- ADR-010 (State Management & Server State)
- Engineering Foundation 11 (TypeScript Standards)
- Engineering Foundation 13 (Linting & Formatting Strategy)
