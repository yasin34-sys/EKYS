# Implementation Blueprint 11: UI Layer Blueprint

## Status
Accepted

## Purpose
UI katmanının Application Layer, State Management ve Design System ile nasıl ilişkileneceğini teknoloji bağımsız şekilde tanımlamak.

## 1. Purpose
(Yukarıdaki Purpose ile aynı.)

## 2. Relationship to ADR-010
ADR-010'daki Dependency Direction'da (UI → Application → State → Persistence → Backend) UI, **en üst, hiçbir katmanın bilmediği** katmandır — bu blueprint, UI'ın bu konumdan diğer katmanları nasıl (tek yönlü) "bildiğini" tanımlar.

## 3. Relationship to Application Layer Blueprint
UI, Application Layer Blueprint'teki use case'leri **tetikleyen** taraftır — UI, use case'lerin iç mantığını bilmez, sadece çağırır ve sonucunu gösterir.

## 4. Relationship to Design System Blueprint
UI, Design System Blueprint'teki ilkelerin (Component System Philosophy, Quiz UI Strategy, Dashboard/Statistics UI Strategy) **somutlaştığı** yerdir — bu blueprint o ilkelerin UI'ın mimari sorumluluklarıyla kesişimini tanımlar, Design System'i tekrar etmez.

## 5. UI Layer Philosophy
UI **"ne gösterileceğini" bilir, "neden/nasıl üretildiğini" bilmez** — Application Layer Philosophy'nin tersten aynası: UI sadece kendisine sunulan veriyi/sonucu render eder.

## 6. UI as Presentation Layer
UI'ın tek sorumluluğu **sunum ve kullanıcı etkileşimidir** — Separation of Concerns'ün UI seviyesindeki en temel uygulaması.

## 7. No Business Logic Rule
**UI business logic içermez** — bir hesaplama veya karar (örn. "bu cevap doğru mu", "bu kullanıcı erişebilir mi") UI içinde yapılmaz; bu mantık her zaman Application Layer veya Learning Engine'de yaşar.

## 8. State Consumption Rule
**UI, State Management katmanından veri tüketir** — ADR-010'daki üç katmanlı state modelini doğrudan değil, State katmanının sunduğu arayüz üzerinden kullanır; UI, verinin Zustand'da mı TanStack Query'de mi olduğunu bilmek zorunda değildir.

## 9. Use Case Invocation Rule
**UI, Application Layer use case'lerini tetikler** — bir kullanıcı etkileşimi ilgili use case'i çağırır; UI, use case'in içindeki adımları bilmez veya tekrarlamaz.

## 10. Component Responsibility
**Component'ler küçük ve tek sorumluluklu olmalıdır** — Component Size Principle ve Component System Philosophy'nin UI Layer'daki mimari karşılığı; bir component tek bir görsel/etkileşim birimini temsil eder ve State/Application katmanına doğrudan erişmez.

## 11. Screen Responsibility
**Screen'ler orchestration değil composition yapmalıdır** — bir screen kendi iş mantığı yürütmez, sadece component'leri State'ten aldığı veriyle **birleştirir/düzenler**. Bu ayrım, Business Flow Orchestration'ın (Application Layer Blueprint) yanlışlıkla UI'a sızmasını önler.

## 12. Navigation Boundary
Navigasyon UI Layer'ın kendi sorumluluğudur ama **iş akışı kararı değildir** — bir ekran geçişi bir use case'in sonucuna göre tetiklenebilir, ama geçişin kendisi UI'ın, geçişe neden olan iş mantığı Application Layer'ın sorumluluğudur.

## 13. Loading / Error / Empty State Handling
**Loading, error, empty state tasarım sistemiyle tutarlı olmalıdır** — Design System Blueprint'teki ilkeler, UI Layer'ın her ekranında **tutarlı bir şekilde** uygulanır; her ekran kendi loading/error deneyimini icat etmez.

## 14. Entitlement / Paywall UI Boundary
**Entitlement/paywall UI kararı entitlement logic üretmemelidir** — bir paywall ekranı, erişim durumunu State/Application katmanından aldığı bilgiye göre gösterir, kendisi bu kararı hesaplamaz (Application Layer Blueprint ile aynı "uygular, üretmez" ilkesi).

## 15. Quiz UI Boundary
**Quiz UI hızlı, sade ve dikkat dağıtmayan olmalıdır** — Design System Blueprint'teki ilke burada mimari bir kısıt olarak da geçerlidir: Quiz ekranı gereksiz state/use case çağrısı yapmaz, sadece soru gösterme ve cevap toplama akışına odaklanır.

## 16. Dashboard UI Boundary
**Dashboard, veriyi açıklanabilir şekilde göstermelidir** — Dashboard/Metrics Use Cases'in (Application Layer Blueprint) sağladığı "sunuma hazır" veriyi, ek bir yorum/hesaplama yapmadan görselleştirir.

## 17. Accessibility Relationship
UI Layer, Design System Blueprint'teki Accessibility ilkelerini **implementasyon seviyesinde** uygular — kontrast, dokunma hedefi boyutu gibi kararlar Design System'in, bunların her component/screen'de tutarlı uygulanması UI Layer'ın sorumluluğudur.

## 18. Design Token Relationship
UI Layer, Design System Blueprint'teki design token'ları (renk, tipografi, spacing) **tüketir**, kendi rastgele değerlerini icat etmez — Consistency Rules'un kod seviyesindeki garantisidir.

## 19. AI Generated UI Code Review
**AI tarafından önerilen UI kodları da insan review'undan geçmelidir** — AI, No Business Logic Rule'u ihlal eden bir component önerebilir veya Design Token Relationship'i atlayıp rastgele bir değer kullanabilir.

## 20. Risks
| Risk | Açıklama |
|---|---|
| Business logic'in UI'a sızması | No Business Logic Rule ihlali |
| Screen'in orchestration yapması | Application Layer'ın işinin UI'a taşınması |
| Entitlement kararının UI'da hesaplanması | Güvenlik açığı |
| Tutarsız loading/error/empty state | Design System Consistency Rules ihlali |
| Design token'ların atlanması | Görsel tutarsızlık |
| UI'ın doğrudan Repository/API/SQLite çağırması | Use Case Invocation Rule ve State Consumption Rule ihlali |

## 21. Mitigations
- Business logic sızması riski, No Business Logic Rule'un her component/screen review'unda kontrol edilmesiyle azaltılır.
- Screen'in orchestration yapması riski, "composition, orchestration değil" ayrımının bir review kriteri olmasıyla azaltılır.
- Entitlement kararının UI'da hesaplanması riski, "uygular, üretmez" ilkesiyle sınırlanmasıyla azaltılır.
- Tutarsız state gösterimi riski, Loading/Error/Empty State Handling'in Design System Consistency Rules ile birlikte uygulanmasıyla azaltılır.
- Design token atlanması riski, her yeni component'te referans alınmasıyla azaltılır.
- UI'ın doğrudan Repository/API/SQLite çağırması riski, Use Case Invocation Rule ve State Consumption Rule'un review sırasında kontrol edilmesiyle azaltılır.

## 22. Non-Goals
- UI kodu/component implementasyonu.
- Screen tasarımı (görsel çizim).
- Navigation implementasyonu.
- Somut dosya/klasör yapısı.
- State hook implementasyonu.
- Yeni teknoloji seçimi.

## 23. Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-001–ADR-013 (özellikle ADR-010) ile çelişmiyor.
- [x] Engineering Foundation 1–20 ile uyumlu.
- [x] Architecture v1.0 Freeze, Application Layer Blueprint, Design System Blueprint ile çelişmiyor.
- [x] Kod/component/screen/navigation/dosya/klasör içermiyor.
- [x] Yeni teknoloji seçilmedi.

## 24. Next Step
Onaylandıktan sonra sıradaki adım **Implementation Readiness Blueprint**'tir — dizinin son maddesi; bu noktaya kadar tanımlanan tüm kavramsal katmanların (Domain, Database, API Contract, Sync Contract, Repository, Application, UI) somut koda geçiş için hazır olup olmadığının son kontrolü yapılacaktır.

## See Also
- Implementation Blueprint 10 (Application Layer)
- Implementation Blueprint 04 (Design System)
- ADR-010
- Implementation Blueprint 12 (Implementation Readiness)
