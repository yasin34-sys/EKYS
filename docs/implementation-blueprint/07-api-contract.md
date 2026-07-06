# Implementation Blueprint 07: API Contract Blueprint

## Status
Accepted

## Purpose
Mobil uygulama, admin/ECMS, Supabase backend ve local app katmanları arasında kullanılacak veri sözleşmelerini, sınırları ve sorumlulukları teknoloji bağımsız şekilde tanımlamak.

## 1. Purpose
(Yukarıdaki Purpose ile aynı.)

## 2. Relationship to Domain Model Blueprint
Domain Model Blueprint'teki entity'ler, API Contract'ın **içeriğini** belirler ama API Contract, Domain Model'in kendisi değildir — bir entity'nin domain'deki tanımı ile API üzerinden taşınan temsili (DTO, Madde 17) farklı amaçlara hizmet edebilir.

## 3. Relationship to Database Design Blueprint
**API contract, domain model ile database arasında bir köprü değildir; client/server sınırıdır.** Database Design Blueprint, sunucu/yerel veri katmanının kendi içindeki temsilini planladı — bu blueprint, o katmanların **dışarıya, istemciye ne gösterdiğini** planlar. İkisi farklı sınırlardır.

## 4. API Contract Philosophy
Bir sözleşme, iki tarafın (istemci, sunucu) birbirinden **ne bekleyebileceğini** açıkça tanımlar — taraflardan biri diğerinin iç implementasyonunu bilmeden, sadece sözleşmeye güvenerek çalışabilmelidir.

## 5. Contract as Boundary
Bu sözleşme, ADR-011'deki Trust Boundary'nin somut uygulamasıdır — istemci ile sunucu sınırı arasında geçen her veri bu sözleşmeden geçer; sözleşme dışı, "gizli" bir veri akışı olmaz.

## 6. Client vs Server Responsibility
**UI doğrudan database modeline bağımlı olmamalıdır** — istemci, Database Design Blueprint'teki tabloları değil, bu blueprint'teki sözleşmeyi bilir. Sunucu, sözleşmeyi karşılamak için kendi iç veri modelini istediği gibi düzenleyebilir; istemci bundan etkilenmez.

## 7. Mobile App API Needs
Mobil uygulama, kendi ihtiyaç duyduğu sözleşmeleri (Authentication, Entitlement, Content Package, Attempt/Exam Session, Learning Metrics) tüketir — bu ihtiyaçlar Shared Packages üzerinden paylaşılan tanımlarla ifade edilebilir.

## 8. Admin / ECMS API Needs
Admin panel/ECMS (ADR-006), içerik yönetimi için farklı bir sözleşme setine ihtiyaç duyar — içerik oluşturma/onaylama/versiyonlama akışları, mobil uygulamanın tükettiği sözleşmelerden **ayrı** bir API yüzeyi oluşturur.

## 9. Authentication Contract
Kimlik doğrulama sözleşmesi, ADR-009'daki ilkelerle tutarlı, Supabase Auth (ADR-002) üzerinden çalışır — sözleşme, hangi kimlik bilgisinin (Provider bağımsızlığı) sunucuya nasıl iletileceğini tanımlar; somut token formatı burada yazılmaz.

## 10. Entitlement Contract
**Entitlement, server authoritative olmalıdır** — sözleşme, istemcinin entitlement durumunu **sorguladığını**, hiçbir zaman **belirlediğini** göstermez. ADR-007'deki "istemci entitlement üretemez" ilkesinin sözleşme seviyesindeki karşılığıdır.

## 11. Content Package Contract
**Content Package erişimi de server authoritative olmalıdır** — sözleşme, istemcinin hangi paketleri listeleyebileceğini/indirebileceğini sunucunun (Entitlement'a göre, RLS ile) belirlediğini yansıtır. Paket bütünlük doğrulaması (ADR-005) sözleşmenin bir parçasıdır.

## 12. Attempt / Exam Session Contract
**Attempt ve Exam Session, client-generated data olarak gönderilir** — sözleşme, istemcinin bu veriyi sunucuya ilettiğini, sunucunun doğruladığını/kabul ettiğini tanımlar (ADR-012, Client → Server). Idempotency bu sözleşmenin bir gereğidir.

## 13. Learning Metrics Contract
Learning Metrics, sözleşme üzerinden hem gönderilebilir hem sorgulanabilir — ama sözleşme, bu verinin **ikincil bir doğruluk kaynağı** olduğunu yansıtacak şekilde tasarlanır; sunucu bu veriyi "kesin gerçek" gibi ele almaz.

## 14. Sync Contract Relationship
**Sync contract, ADR-012 ile ayrıca detaylandırılacaktır** — bu blueprint senkronizasyonun genel veri akışını (Madde 12-13) sözleşme seviyesinde tanır, ama Conflict Strategy/Queue Model/Retry Policy gibi detaylar burada tekrar edilmez; Synchronization Contract Blueprint bunu ele alacaktır.

## 15. Error Contract Philosophy
**Error response yapısı tutarlı olmalıdır** — sözleşme, bir hatanın hangi genel biçimde döneceğini tanımlar; Error Message Security (ADR-011) ile tutarlı olarak, hata yanıtı iç sistem detayı sızdırmaz.

## 16. Validation Boundary
**Dış dünyadan gelen/verilen veri güven sınırında doğrulanmalıdır** — TypeScript Standards'taki ilkenin API seviyesindeki karşılığı: veri, sözleşmeye uyduğu varsayılmadan açıkça doğrulanır.

## 17. DTO Strategy
**DTO ile domain model aynı şey değildir** — TypeScript Standards'taki ilke teyit edilir: API üzerinden taşınan veri şekli, Domain Model'deki entity tanımıyla bire bir örtüşmek zorunda değildir; ikisi arasındaki dönüşüm açıkça yapılır.

## 18. Backward Compatibility
**Backward compatibility korunmalıdır** — bir sözleşme değişikliği, mevcut istemcileri (henüz güncellenmemiş uygulama sürümleri) kırmayacak şekilde tasarlanır.

## 19. Versioning Relationship
API sözleşmesindeki bir değişiklik, Versioning Strategy'deki ilkeyle ilişkilidir — sözleşmeyi kıran bir değişiklik breaking change olarak işaretlenir ve uygulama sürümüne yansır.

## 20. Security / RLS Relationship
Sözleşme, RLS'in **arkasında çalıştığını** varsayar — sözleşmenin kendisi güvenliği sağlamaz, güvenlik RLS/entitlement doğrulamasından gelir; sözleşme sadece "bu veri bu şekilde istenir/alınır" biçimini tanımlar.

## 21. Offline-First Relationship
Sözleşme, ADR-003'teki offline-first mimariyle uyumlu tasarlanır — istemci sözleşmeyi her zaman anlık çağırmak zorunda değildir; bağlantı olmadığında çağrılar kuyruğa alınır (ADR-012, Queue Model) ve bağlantı geldiğinde yerine getirilir.

## 22. API Documentation Rule
Her API contract dokümante edilmelidir. Sözleşmenin amacı, hangi taraflar arasında kullanıldığı, hangi domain/entity ile ilişkili olduğu ve backward compatibility etkisi açık olmalıdır. Bu, Documentation Strategy (API Documentation Philosophy) ile uyumlu olmalıdır.

## 23. AI Generated Contract Review
AI tarafından önerilen API contract değişiklikleri insan review'undan geçmelidir. AI, DTO/domain/database ayrımını veya security/RLS sınırlarını yanlış yorumlayabilir.

## 24. Risks
| Risk | Açıklama |
|---|---|
| UI'ın database modeline sızması | İstemcinin sunucunun iç yapısına bağımlı hâle gelmesi |
| DTO/Domain Model karışıklığı | DTO Strategy ihlali |
| Entitlement'ın istemci tarafında "belirlenmesi" | Güvenlik açığı |
| Tutarsız hata yapısı | İstemcinin hataları güvenilir şekilde ele alamaması |
| Breaking change'in fark edilmemesi | Eski istemcilerin kırılması |
| Sync detaylarının API Contract içine taşınması | Sync Contract Relationship (Madde 14) ihlali — Conflict Strategy/Queue Model gibi detaylar bu blueprint'e sızarsa Synchronization Contract Blueprint'in kapsamı bulanıklaşır |

## 25. Mitigations
- UI'ın database modeline sızması riski, Client vs Server Responsibility ve Repository Boundary Rule'un review sırasında kontrol edilmesiyle azaltılır.
- DTO/Domain Model karışıklığı riski, DTO Strategy'nin her yeni sözleşme tanımında referans alınmasıyla azaltılır.
- Entitlement riski, Entitlement Contract ve RLS Relationship'in birlikte doğrulanmasıyla azaltılır.
- Tutarsız hata yapısı riski, Error Contract Philosophy'nin tek bir standart olarak tüm sözleşmelere uygulanmasıyla azaltılır.
- Breaking change riski, Versioning Relationship'in her sözleşme değişikliğinde kontrol edilmesiyle azaltılır.
- Sync detaylarının API Contract'a sızması riski, Sync Contract Relationship'in (Madde 14) sınırının review sırasında kontrol edilmesiyle azaltılır.

## 26. Non-Goals
- Endpoint listesi.
- JSON schema.
- TypeScript tipi implementasyonu.
- RLS policy SQL'i.
- Somut Sync Contract detayları — Synchronization Contract Blueprint.
- Yeni teknoloji seçimi.

## 27. Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-001–ADR-013 ile çelişmiyor.
- [x] Engineering Foundation 1–20 ile uyumlu.
- [x] Architecture v1.0 Freeze, Domain Model Blueprint, Database Design Blueprint ile çelişmiyor.
- [x] Endpoint/JSON schema/TypeScript tipi/RLS policy/kod içermiyor.
- [x] Yeni teknoloji seçilmedi.

## 28. Next Step
Onaylandıktan sonra sıradaki adım **Synchronization Contract Blueprint**'tir — Madde 14'te sadece tanınan senkronizasyon detayları, ADR-012 ile birlikte orada tam olarak ele alınacaktır.

## See Also
- Implementation Blueprint 06 (Database Design)
- ADR-002, ADR-003, ADR-005, ADR-007, ADR-009, ADR-011, ADR-012
- Implementation Blueprint 08 (Synchronization Contract)
