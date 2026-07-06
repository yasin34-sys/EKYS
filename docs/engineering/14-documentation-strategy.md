# Engineering Foundation 14: Documentation Strategy

## Status
Accepted

## Purpose
Dokümantasyonun hiyerarşisini, yaşam döngüsünü ve tek doğruluk kaynağı (Single Source of Truth) ilkesini tanımlamak.

## 1. Documentation Hierarchy
```
PROJECT_CHARTER.md (en üst, değişmez temel)
   → ADR (mimari kararlar)
      → Engineering Foundation (süreç/standartlar)
         → Implementation Blueprint / Technical Docs (uygulama detayı)
            → Code (kodun kendisi ve kod içi dokümantasyon)
```
Alt seviyedeki bir doküman, üst seviyedeki bir dokümanla çelişemez. Bir çelişki tespit edilirse, üst seviye doküman geçerlidir ve alt seviye düzeltilir.

## 2. Source of Truth Rule
Her bilgi parçası için **tek bir doğruluk kaynağı** vardır; aynı bilgi birden fazla dokümanda çelişkili şekilde tekrarlanmaz. Bir konu birden fazla dokümanı ilgilendiriyorsa, asıl doküman içeriği taşır, diğerleri ona **referans verir** (kopyalamaz).

## 3. Documentation Lifecycle
```
Taslak → Tartışma/Revizyon → Onaylandı (Accepted) → (gerekirse) Deprecated → Arşivlendi
```
Onaylanmamış bir doküman, başka bir dokümanın veya kodun temeli olarak kullanılmaz.

## 4. Documentation Ownership
Her doküman kategorisinin (PROJECT_CHARTER, ADR, Engineering Foundation, Blueprint) bir sahibi/onay mercii vardır — nihai onay Product Owner + CTO'dadır (Architecture Freeze Declaration ile tutarlı).

## 5. Documentation Review Rule
Bir doküman değişikliği, ilgili üst seviye dokümanlarla çelişip çelişmediği kontrol edilerek onaylanır.

## 6. Documentation Update Rule
Kod değişikliği, ilgili dokümantasyonu etkiliyorsa doküman güncellemesi aynı PR içinde yapılır (Git Workflow, Madde 8 ile aynı ilke).

## 7. AI Generated Documentation Review
AI tarafından üretilen/önerilen doküman içeriği de insan review'undan geçer (Git Workflow, Madde 10 ile tutarlı).

## 8. Deprecation Policy
Kullanımdan kaldırılan bir doküman/madde, sessizce silinmez; deprecated olarak işaretlenir.

## 9. Archive Policy
**Deprecated dokümanlar silinmez, arşivlenir.** Geçmişte alınan bir kararın "neden" alındığı, sonradan değiştirilse bile kaybolmaz.

## 10. Cross-Reference Rule
Bir doküman başka bir dokümana referans verirken, o dokümanın **güncel, standart adını** kullanır (örn. "PROJECT_CHARTER.md", "ADR-00X", "Database Design Document (Future)"). Tutarsız/eski isimlendirme (örn. bir dokümana bazı yerlerde "Doküman 08", bazı yerlerde farklı bir İngilizce ad verilmesi) Architecture Consistency Review kapsamında tespit edilip standardize edilmiştir — bundan sonra yeni bir referans eklenirken de bu standart adlar kullanılır.

## 11. Documentation Review Rule (Freeze İlişkisi)
Architecture v1.0 Freeze sonrası, PROJECT_CHARTER.md/ADR/Engineering Foundation dokümanları Architecture Freeze Declaration'daki governance kurallarına tabidir; bu doküman o kuralları tekrar etmez, ona referans verir.

## Risks
| Risk | Açıklama |
|---|---|
| Çelişkili bilgi tekrarı | Aynı bilginin birden fazla dokümanda farklı şekilde tekrarlanması |
| Tutarsız referans adlandırma | Aynı dokümana farklı yerlerde farklı adlarla atıfta bulunulması (Architecture Consistency Review'da tespit edilen bir sorun sınıfı) |

## Mitigations
- Source of Truth Rule (Madde 2), bilginin tek yerde tutulup diğerlerinin referans vermesini zorunlu kılar.
- Cross-Reference Rule (Madde 10), Architecture Consistency Review'da standardize edilen adlandırmanın korunmasını sağlar.

## Non-Goals
- Doküman yönetim aracının (wiki, Notion vb.) seçimi.
- Somut dosya adlandırma formatı — Implementation Blueprint aşamasında (Repository Initialization/Physical Folder Structure Blueprint) ele alındı.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md, ADR'ler ve Architecture Freeze Declaration ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; sadece strateji dokümante edildi.

## See Also
- Architecture Freeze Declaration
- Engineering Foundation 06 (Git Workflow)
- Engineering Foundation 20 (Development Roadmap)
