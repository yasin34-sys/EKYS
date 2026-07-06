# Implementation Blueprint 10: Application Layer Blueprint

## Status
Accepted

## Purpose
Repository Pattern, Learning Engine ve State Management katmanlarının üstünde, uygulamanın iş akışlarını yöneten application/use-case katmanını teknoloji bağımsız şekilde tanımlamak.

## 1. Purpose
(Yukarıdaki Purpose ile aynı.)

## 2. Relationship to ADR-008
ADR-008'deki Rule Based Learning Engine, Application Layer'ın **çağırdığı** bir bileşendir — Application Layer, Learning Engine'in kendisini yeniden tanımlamaz, ürettiği sonuçları iş akışlarına entegre eder.

## 3. Relationship to ADR-010
ADR-010'daki Dependency Direction'da (UI → Application → State → Persistence → Backend) Application Layer, **UI'ın altında, State/Persistence'ın üstünde** yer alan katmandır.

## 4. Relationship to Repository Pattern Blueprint
Application Layer, veriye **her zaman Repository'ler üzerinden** erişir (Repository Dependency Rule) — Repository Pattern Blueprint'teki sınırlar burada da aynen geçerlidir.

## 5. Application Layer Philosophy
Application Layer, **"ne yapılacağını" bilir, "nasıl yapılacağını" bilmez** — bir iş akışının adımlarını sırayla yürütür, ama her adımın somut implementasyonu kendi katmanında (Repository, Learning Engine) kalır.

## 6. Use Case Philosophy
Bir **use case**, kullanıcının gerçekleştirdiği tek, anlamlı bir iş eylemini temsil eder — Single Responsibility Principle'ın use case seviyesindeki karşılığı: bir use case tek bir iş akışını yönetir.

## 7. Business Flow Orchestration
Application Layer, birden fazla Repository/Learning Engine çağrısını **doğru sırada, tutarlı bir şekilde** koordine eder — bu orkestrasyon mantığı hiçbir alt katmanda tekrarlanmaz.

## 8. UI Independence
Application Layer **hiçbir UI detayı bilmez** — bir use case, bir bileşenin nasıl render edileceğini değil, sadece "hangi verinin/sonucun üretildiğini" döndürür (Dependency Direction'ın ters yönde teyidi).

## 9. Repository Dependency Rule
Application Layer, veriye **yalnızca Repository abstraction'ları üzerinden** erişir — hiçbir use case doğrudan SQLite sorgusu veya API çağrısı içermez.

## 10. Learning Engine Relationship
Bir use case, Learning Engine'i (ADR-008) **girdi olarak Attempt/Exam Session verisini vererek** çağırır ve ürettiği sonucu kullanır — Learning Engine'in Rule Pipeline'ı Application Layer tarafından yeniden uygulanmaz.

## 11. Entitlement Relationship
Bir use case, işlem öncesi Entitlement Repository'yi sorgulayabilir — ama entitlement kararının kendisi her zaman sunucudan gelen veriye dayanır; Application Layer bu kararı **üretmez**, sadece **uygular**.

## 12. Quiz Flow Use Cases
Soru çözme akışı (gösterme, cevap kaydetme, geri bildirim), PROJECT_CHARTER.md Bölüm 9'daki çekirdek özelliktir — Attempt Repository (yazma) ve Learning Engine (analiz güncelleme) arasında Application Layer tarafından koordine edilir.

## 13. Exam Session Use Cases
Deneme sınavı akışı (başlatma, süre yönetimi, tamamlama, sonuç özeti), Exam Session entity'sinin yaşam döngüsünü yönetir — birden fazla Attempt'in bir oturum altında toplanması bu grubun sorumluluğudur.

## 14. Repeat Pool Use Cases
Tekrar havuzunu görüntüleme/çalışma akışı, Repeat Pool verisini sorgular ve kullanıcıya tekrar sorularını sunar — bir sorunun havuzdan çıkarılması (doğru çözülünce) Application Layer tarafından tetiklenir.

## 15. Dashboard / Metrics Use Cases
Dashboard use case'leri, Learning Metrics'ten (derived data) veri okur ve Design System Blueprint'teki ilkelerle tutarlı, açıklanabilir bir sonuç kümesi üretir — veri **üretmez**, sadece **sunuma hazırlar**.

## 16. Content Package Use Cases
Paket indirme/güncelleme akışı, Content Package Repository'yi kullanır ve Entitlement kontrolüyle birlikte, erişilebilir paketlerin indirilmesini yönetir.

## 17. Error Handling
Bir use case başarısız olduğunda hata **sessizce yutulmaz** — Error Handling Standard ve Repository'nin Error Handling Relationship'i ile tutarlı olarak, hata UI'ın anlayabileceği bir biçimde yukarı iletilir.

## 18. Transaction / Atomicity Relationship
Birden fazla Repository çağrısı içeren bir use case, Repository Pattern Blueprint'teki tutarlı birim ilkesiyle uyumlu yürütülür — bir adım başarısız olduğunda tutarsız bir ara durumda kalınmaz.

## 19. Testing Strategy
Use case'ler, Repository ve Learning Engine'in **sahte (mock/stub) versiyonlarıyla** test edilebilir olmalıdır — Application Layer'ın somut veri kaynaklarından bağımsız tasarımının doğal bir sonucudur.

## 20. AI Generated Application Logic Review
**AI tarafından önerilen bir use case/iş akışı değişikliği de insan review'undan geçmelidir** — AI, bir iş akışının adımlarını yanlış sıralayabilir veya Entitlement/Repository sınırlarını ihlal edebilir.

## 21. Risks
| Risk | Açıklama |
|---|---|
| UI mantığının Application Layer'a sızması | UI Independence ihlali |
| Repository'nin atlanması | Bir use case'in doğrudan veri kaynağına erişmesi |
| Learning Engine mantığının tekrarlanması | Application Layer'ın kendi analiz mantığını icat etmesi |
| Entitlement kararının Application Layer'da üretilmesi | Güvenlik açığı |
| Tutarsız ara durum | Transaction/Atomicity ihlali |

## 22. Mitigations
- UI mantığının sızması riski, UI Independence'ın her use case tanımında bir review kriteri olmasıyla azaltılır.
- Repository'nin atlanması riski, Repository Dependency Rule'un geçilemez bir kural olarak uygulanmasıyla azaltılır.
- Learning Engine mantığının tekrarlanması riski, "sadece çağırır, yeniden uygulamaz" ilkesiyle sınırlanmasıyla azaltılır.
- Entitlement kararının üretilmesi riski, "uygular, üretmez" ayrımının kontrol edilmesiyle azaltılır.
- Tutarsız ara durum riski, Transaction/Atomicity Relationship'in her çok adımlı use case'de doğrulanmasıyla azaltılır.

## 23. Non-Goals
- Use case/service kodu implementasyonu.
- TypeScript tip/interface tanımı.
- Somut dosya/klasör yapısı.
- UI implementasyonu.
- Yeni teknoloji seçimi.

## 24. Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-001–ADR-013 (özellikle ADR-008, ADR-010) ile çelişmiyor.
- [x] Engineering Foundation 1–20 ile uyumlu.
- [x] Architecture v1.0 Freeze ve Repository Pattern Blueprint ile çelişmiyor.
- [x] Kod/type/interface/dosya/klasör içermiyor.
- [x] Yeni teknoloji seçilmedi.

## 25. Next Step
Onaylandıktan sonra sıradaki adım **UI Layer Blueprint**'tir — bu use case'lerin UI tarafından nasıl tüketileceği, State Management (ADR-010) ve Design System Blueprint ile birlikte orada ele alınacaktır.

## See Also
- Implementation Blueprint 09 (Repository Pattern)
- ADR-008, ADR-010
- Implementation Blueprint 11 (UI Layer)
