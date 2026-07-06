# Implementation Blueprint 09: Repository Pattern Blueprint

## Status
Accepted

## Purpose
Mobil uygulama içinde domain/application katmanlarının API, SQLite ve sync detaylarına doğrudan bağımlı olmadan veri erişimini nasıl kullanacağını teknoloji bağımsız şekilde tanımlamak.

## 1. Purpose
(Yukarıdaki Purpose ile aynı.)

## 2. Relationship to ADR-010
ADR-010'daki Dependency Direction (UI → Application → State → Persistence → Backend) ve Single Source of Truth ilkeleri, Repository Pattern'ın temel gerekçesidir — Repository, State/Persistence katmanı ile Application katmanı arasındaki resmi sınırdır.

## 3. Relationship to Database Design Blueprint
Database Design Blueprint'teki Server vs Local Source of Truth ayrımı, Repository'nin **iç implementasyon detayıdır** — Repository'yi kullanan kod, verinin SQLite'tan mı Supabase'den mi geldiğini bilmez.

## 4. Relationship to API Contract Blueprint
API Contract Blueprint'teki sözleşmeler, Repository'nin **dış dünyayla** iletişim kurarken uyduğu sınırlardır — Repository, sözleşmeyi ihlal eden bir veri şekli üretmez/kabul etmez.

## 5. Relationship to Synchronization Contract Blueprint
Synchronization Contract Blueprint'teki Data Categories ve sync davranışları (idempotency, offline safety), Repository'nin **write** işlemlerinde uyguladığı kurallardır — Repository sync detaylarını (queue, retry) kendi içinde yönetir, çağıran kod bunları görmez.

## 6. Repository Pattern Philosophy
Repository, veri kaynağının **nereden ve nasıl** geldiğini/gittiğini gizleyen, sadece **ne** istendiğini ifade eden bir arayüzdür — ADR-010'daki Dependency Direction'ın somut bir uygulama desenidir.

## 7. Repository as Boundary
**UI, doğrudan SQLite veya API çağırmamalıdır** — Application/domain katmanı veriye her zaman **Repository abstraction üzerinden** erişir. Bu, Repository Boundary Rule'un kod seviyesindeki en somut karşılığıdır.

## 8. Domain vs Data Access Separation
**Repository, domain model ile DTO/database model arasındaki dönüşüm sınırıdır** — Domain Model Blueprint'teki entity'ler Repository'nin dışına temiz domain nesneleri olarak çıkar; API'nin DTO'su veya SQLite'ın satır yapısı Repository'nin sınırını geçemez.

## 9. Read Model Strategy
**Read işlemlerinde local-first yaklaşım değerlendirilmelidir** — bir Repository, veri okurken önce yereldeki mevcut veriyi döndürebilir, sunucu güncellemesi arka planda uygulanabilir. Somut önbellek/yenileme stratejisi implementasyon aşamasındadır.

## 10. Write Model Strategy
**Write işlemlerinde local write + sync queue yaklaşımı ADR-003/ADR-012 ile uyumlu olmalıdır** — bir Repository, Client Generated Data yazarken önce yerele yazar, sonra Sync Queue'ya ekler; çağıran kod bu iki adımı görmez.

## 11. Offline-First Repository Behavior
**Offline-first davranış repository seviyesinde açık olmalıdır** — bir Repository çağrısı bağlantı olmadan da başarıyla tamamlanabilmelidir; bu davranış Repository arayüzünün bir parçası olarak belgelenir.

## 12. Local SQLite Relationship
Repository, SQLite ile doğrudan etkileşen **tek** katmandır — Database Design Blueprint'teki Local Database Responsibility, Repository'nin implementasyonuna gömülür; bunun dışındaki hiçbir kod SQLite'ı doğrudan sorgulamaz.

## 13. Remote API Relationship
Repository, API Contract Blueprint'teki sözleşmelere uyan **tek** katmandır — sunucu iletişimi Repository içinde kapsüllenir; UI/Application katmanı doğrudan bir ağ isteği yapmaz.

## 14. Sync Queue Relationship
Repository, Synchronization Contract Blueprint'teki Queue Model'e veri ekleyen taraf olabilir — ama Queue'nun kendisinin işletilmesi Repository'nin bir iç detayı veya ayrı bir sync mekanizmasının sorumluluğu olabilir; bu sınır implementasyon aşamasında netleşir.

## 15. Entitlement Repository Boundary
**Entitlement server authoritative kalmalıdır** — bir Entitlement Repository sadece sunucudan gelen entitlement durumunu okur/senkronize eder; hiçbir Repository metodu entitlement'ı yerel olarak "üretmez" veya "değiştirmez".

## 16. Content Package Repository Boundary
**Content package client tarafından değiştirilemez** — bir Package Repository paketleri indirir/okur, ama hiçbir yazma metodu paket içeriğini değiştirmez.

## 17. Attempt / Exam Session Repository Boundary
**Attempt/Exam Session, client-generated data olarak Repository üzerinden yönetilir** — bir Attempt Repository yeni kayıt oluşturma (local write + sync queue) ve okuma işlemlerini destekler; idempotency, Repository'nin write metodunun bir garantisidir.

## 18. Learning Metrics Repository Boundary
**Learning Metrics, derived data olarak ele alınır** — bir Learning Metrics Repository bu veriyi hem yerel hesaplamadan (ADR-008) hem senkronize edilmiş sunucu kopyasından okuyabilir, ama bunun **ikincil bir doğruluk kaynağı** olduğunu unutturmaz.

## 19. Error Handling Relationship
**Hata yönetimi sessizce yutulmamalıdır** — bir Repository metodu başarısız olduğunda bu, Error Handling Standard ve Error Contract Philosophy ile tutarlı şekilde, çağıran kodun fark edebileceği bir şekilde iletilir.

## 20. Caching Relationship
Read Model Strategy'deki local-first yaklaşım bir önbellekleme davranışı içerir — ancak bu, ADR-010'daki Server State (TanStack Query) katmanının önbellekleme mantığıyla **karıştırılmaz**: Repository kalıcı yerel veri kaynağını yönetir; TanStack Query geçici server-state cache'ini yönetir.

## 21. Transaction Philosophy
Birden fazla veri değişikliğini içeren bir işlem, **tutarlı bir birim** olarak ele alınır — bir kısmı başarılı bir kısmı başarısız kalan bir ara durum oluşmamalıdır (Sync Atomicity, ADR-012 ile aynı ilke, Repository seviyesinde). Somut transaction mekanizması implementasyon aşamasındadır.

## 22. Testing Strategy
**Repository'ler test edilebilir olmalıdır** — bir Repository'nin gerçek SQLite/API'ye bağımlı olmadan (Mocking/Stubbing Philosophy) test edilebilmesi, Repository'nin bir arayüz olarak tasarlanmasının doğal bir sonucudur.

## 23. AI Generated Repository Review
**AI tarafından önerilen repository değişiklikleri de insan review'undan geçmelidir** — AI, Repository Boundary'yi ihlal eden bir kısayol önerebilir veya Entitlement/Content Package sınırlarını yanlış uygulayabilir.

## 24. Risks
| Risk | Açıklama |
|---|---|
| Repository sınırının atlanması | UI/Application katmanının doğrudan SQLite/API çağırması |
| Domain/DTO karışıklığı | Repository'nin domain model yerine ham DTO/database satırı döndürmesi |
| Entitlement'ın yerel üretilmesi | Güvenlik açığı |
| Write/Sync ayrımının bulanıklaşması | Local write + sync queue akışının tutarsız uygulanması |
| Test edilemez Repository | Gerçek SQLite/API'ye sıkı bağımlı bir implementasyon |

## 25. Mitigations
- Repository sınırının atlanması riski, Repository as Boundary'nin Import Rules ile birlikte bir review kriteri olmasıyla azaltılır.
- Domain/DTO karışıklığı riski, Domain vs Data Access Separation'ın her yeni Repository metodunda kontrol edilmesiyle azaltılır.
- Entitlement'ın yerel üretilmesi riski, Entitlement Repository Boundary'nin geçilemez bir kural olarak uygulanmasıyla azaltılır.
- Write/Sync ayrımının bulanıklaşması riski, Write Model Strategy'nin Synchronization Contract Blueprint ile tutarlı uygulanmasıyla azaltılır.
- Test edilemez Repository riski, Testing Strategy'nin Repository tasarımının bir kabul kriteri olarak kullanılmasıyla azaltılır.

## 26. Non-Goals
- Repository kodu/interface/type implementasyonu.
- Database adapter/API client implementasyonu.
- Somut klasör/dosya yapısı.
- Sync Queue'nun işletilme mekanizması.
- Yeni teknoloji seçimi.

## 27. Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-001–ADR-013 (özellikle ADR-010) ile çelişmiyor.
- [x] Engineering Foundation 1–20 ile uyumlu.
- [x] Architecture v1.0 Freeze, Database Design, API Contract, Synchronization Contract Blueprint'leriyle çelişmiyor.
- [x] Kod/interface/type/dosya/klasör/adapter/API client içermiyor.
- [x] Yeni teknoloji seçilmedi.

## 28. Next Step
Onaylandıktan sonra sıradaki adım **Application Layer Blueprint**'tir — Repository'lerin, Learning Engine (ADR-008) ve State Management (ADR-010) katmanı tarafından nasıl kullanılacağı orada ele alınacaktır.

## See Also
- Implementation Blueprint 08 (Synchronization Contract)
- ADR-010
- Implementation Blueprint 10 (Application Layer)
