# Engineering Foundation 06: Git Workflow

## Status
Accepted

## Purpose
Geliştirme sürecinin gündelik iş akışını (PR, review, merge, rollback) tanımlamak.

## 1. Development Lifecycle
```
Değişiklik İhtiyacı → Branch (Madde 7) → Geliştirme → PR → Review → Merge → (gerekirse) Rollback
```

## 2. Working Principles
- **Small Increment:** Değişiklikler küçük, gözden geçirilebilir parçalar hâlinde yapılır.
- **Single Responsibility:** Bir PR, tek bir amaca hizmet eder.
- **Review First:** Hiçbir değişiklik review'dan geçmeden merge edilmez.
- **Reproducible History:** Commit geçmişi, neyin neden yapıldığını anlaşılır şekilde yansıtır.
- **No Direct Production Changes:** Production'a doğrudan, review'suz değişiklik yapılmaz.

## 3. PR Philosophy
Bir PR, sadece kod değişikliğini değil, **neden** yapıldığını da açıklar; büyük, karışık PR'lar küçük parçalara bölünür.

## 4. Code Review Philosophy
Review, hata bulmaktan ibaret değildir — mimari uyum (ADR'ler, Engineering Foundation), okunabilirlik ve sürdürülebilirlik de değerlendirilir.

## 5. Merge Principles
Merge, ancak review onayı ve (varsa) otomatik kontrollerin (Engineering Foundation Madde 18 — CI/CD Strategy) geçmesiyle yapılır.

## 6. Rollback Philosophy
Bir merge sorun çıkarırsa, hızlıca geri alınabilir (revert) olması öncelik; "ileri giderek düzeltme" değil "geri alıp yeniden düzgün yapma" tercih edilir.

## 7. Traceability
Her değişikliğin hangi ihtiyaçtan/karardan (ADR, issue) geldiği izlenebilir olmalıdır (Commit Convention, Madde 8 ile detaylandırılır).

## 8. Documentation Update Rule
Bir kod değişikliği, ilgili dokümantasyonu (varsa) etkiliyorsa, doküman güncellemesi aynı PR içinde yapılır — kod ve doküman birbirinden ayrışmaz.

## 9. Workflow Review Rule
Bu iş akışının kendisi, gerektiğinde (örn. ekip büyüdüğünde) gözden geçirilebilir; bu bir donmuş süreç değildir ama sessizce değişmez, açıkça güncellenir.

## 10. AI-Assisted Development Rule
**AI (örn. Claude) tarafından önerilen/üretilen hiçbir değişiklik, insan review sürecinden muaf değildir.** AI bir kod, test, doküman, commit mesajı, tip tanımı, isim veya release önerisi üretebilir — ama bunların hepsi aynı PR/review/merge sürecinden geçer. Sorumluluk her zaman değişikliği onaylayan insanda kalır.

**Netlik notu:** Bu kural, AI'nın **geliştirme aracı olarak** kullanımıyla ilgilidir. PROJECT_CHARTER.md Bölüm 2.1/6 ve ADR-008'deki "ürün hiçbir zaman AI'a bağımlı olmayacak" ilkesi ise **ürünün kendisinin** (Learning Engine, içerik üretimi) AI kullanmayacağı ile ilgilidir. Bu iki kavram birbirinden ayrıdır ve çelişmez: geliştirme sürecinde AI yardımcı araç olarak kullanılabilir (her zaman insan review'una tabi), ama üretilen ürünün çekirdek işlevleri (analiz, içerik) hiçbir zaman AI'a dayanmaz.

## Risks
| Risk | Açıklama |
|---|---|
| Review disiplininin gevşemesi | Zaman baskısıyla review'un yüzeysel yapılması |
| AI çıktısının sorgusuz kabulü | AI önerisinin "muhtemelen doğrudur" varsayımıyla incelenmeden onaylanması |

## Mitigations
- Review First ilkesi (Madde 2) hiçbir istisna kabul etmez.
- AI-Assisted Development Rule (Madde 10), AI çıktısının da normal review sürecine tabi olduğunu açıkça belirtir.

## Non-Goals
- Somut Git hosting platformu (GitHub vb.) seçimi — zaten GitHub kullanılacağı varsayılıyor, ayrı bir karar gerekmez.
- Branch adlandırma detayları — Branch Strategy (Madde 7).
- Commit mesaj formatı — Commit Convention (Madde 8).

## Acceptance Criteria
- [x] Repository Strategy ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; sadece süreç dokümante edildi.

## See Also
- Engineering Foundation 07 (Branch Strategy)
- Engineering Foundation 08 (Commit Convention)
- PROJECT_CHARTER.md (Bölüm 2.1/6) — AI-Assisted Development netlik notu (Madde 10) için karşılaştırma
- ADR-008 (Rule Based Learning Engine) — AI-Assisted Development netlik notu (Madde 10) için karşılaştırma
