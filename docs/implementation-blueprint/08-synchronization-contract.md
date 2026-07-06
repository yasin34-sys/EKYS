# Implementation Blueprint 08: Synchronization Contract Blueprint

## Status
Accepted

## Purpose
ADR-003 Offline First Architecture ve ADR-012 Synchronization Strategy kararlarının, client/server arasında nasıl bir senkronizasyon sözleşmesine dönüşeceğini teknoloji bağımsız şekilde tanımlamak.

## 1. Purpose
(Yukarıdaki Purpose ile aynı.)

## 2. Relationship to ADR-003
ADR-003'teki "sunucu otoritatif kaynak, istemci offline çalışma kopyası" ilkesi bu sözleşmenin temel varsayımıdır — sync contract bu ilkeyi ihlal eden hiçbir mekanizma önermez, sadece onu somutlaştırır.

## 3. Relationship to ADR-012
Bu blueprint, ADR-012'de zaten karara bağlanmış ilkeleri (Data Categories, Sync Triggers, Conflict Strategy, Idempotency, Queue Model, Failure Handling) **yeniden tartışmaz** — onları client/server arasındaki sözleşme diline çevirir.

## 4. Relationship to API Contract Blueprint
API Contract Blueprint (Contract as Boundary) genel sözleşme felsefesini kurdu; bu blueprint onun **özel bir alt alanıdır** — sync sözleşmeleri de aynı genel ilkelere (DTO Strategy, Validation Boundary, Error Contract Philosophy) tabidir, ama kendi özel kurallarını (Idempotency, Conflict Strategy) taşır.

## 5. Sync Contract Philosophy
**Sync contract, API Contract'ın özel bir alt alanıdır** — genel sözleşme kurallarından bağımsız değildir, onun üzerine ek, senkronizasyona özgü garantiler ekler.

## 6. Data Categories
ADR-012'deki dört kategori sözleşme seviyesinde teyit edilir: **Client Generated Data** (Attempt, Exam Session), **Server Authoritative Data** (Entitlement, User, content metadata), **Static Package Content** (indirilen paket içeriği), **Derived Data** (Learning Metrics, Repeat Pool). Her kategori kendi sözleşme davranışına sahiptir (Madde 8-11).

## 7. Sync Direction Rules
ADR-012'deki Sync Directions sözleşme seviyesinde uygulanır: Server → Client (Entitlement, paket meta verisi), Client → Server (Attempt, Exam Session). Bir kategori, doğal yönünün tersine veri almaz/göndermez.

## 8. Client Generated Data Contract
**Attempt ve Exam Session**, istemcinin ürettiği ve sunucuya **ilettiği** veridir — sözleşme, bu verinin sunucu tarafında doğrulandığını ve idempotent şekilde işlendiğini garanti eder.

## 9. Server Authoritative Data Contract
**Entitlement, User, content metadata** — sözleşme, bu verinin **sadece sunucudan istemciye** aktığını garanti eder. **Entitlement istemciden yazılamaz** — bu, ihlal edilemez bir kuraldır (ADR-007, ADR-011 Trust Model).

## 10. Static Package Content Contract
İndirilen paket içeriği sözleşme üzerinden **sadece okunur** şekilde istemciye ulaşır — **paket içeriği istemciden değiştirilemez.** Bütünlük doğrulaması (ADR-005) bu sözleşmenin bir parçasıdır.

## 11. Derived Data Contract
**Learning Metrics ve Repeat Pool**, sözleşme üzerinden taşınabilir ama sözleşme bunların **ikincil bir doğruluk kaynağı** olduğunu açıkça yansıtır — sunucu bu veriyi asla Client Generated Data'nın yerine geçecek şekilde ele almaz.

## 12. Queue Model Relationship
ADR-012'deki Queue Model sözleşme tarafında karşılık bulur: istemci offline'da ürettiği veriyi bir kuyrukta biriktirir; sözleşme bu kuyruktaki öğelerin **hangi sırayla ve hangi formatta** iletileceğini tanımlar — somut kuyruk implementasyonu kapsam dışıdır.

## 13. Idempotency Requirement
**Attempt ve Exam Session senkronizasyonu idempotent olmalıdır** — ADR-012'deki ilkenin sözleşme seviyesindeki zorunlu koşulu: aynı veri birden fazla kez gönderilirse sonuç bozulmaz, veri tekrarlanmaz.

## 14. Conflict Strategy Relationship
**Conflict strategy, ADR-012 ile uyumlu olmalıdır** — bu blueprint yeni bir çakışma çözüm algoritması önermez; timestamp bazlı yaklaşımın sözleşme üzerinde nasıl temsil edileceğini (her kayıt bir zaman damgası/versiyon taşır) tanır.

## 15. Version Compatibility
**Version compatibility korunmalıdır** — eski bir istemci sürümü, sözleşmenin yeni bir alanını/formatını anlamasa bile bozulmamalıdır (geriye uyumlu genişleme).

## 16. Offline Safety
**Offline-first mimaride client geçici olarak çalışabilir ama server authoritative kalır** — sözleşme, istemcinin offline ürettiği verinin sunucuyla senkronize olana kadar "geçici" kabul edildiğini yansıtır.

## 17. Retry / Failure Handling Philosophy
**Sync hataları sessizce yutulmamalıdır** — bir sync isteği başarısız olursa sözleşme bu durumu açıkça bildirir, istemci sessizce "başarılı" varsaymaz.

## 18. Partial Sync Philosophy
Bir senkronizasyon turunda bazı veriler başarılı, bazıları başarısız olabilir — sözleşme bu **kısmi başarı durumunu** açıkça temsil eder, "hepsi ya da hiçbiri" gibi yanıltıcı bir basitleştirme yapmaz.

## 19. Sync Status / Observability
**Sync status kullanıcıya gerektiğinde görünür olmalıdır** — ADR-012'deki Sync Observability ilkesi (Last Sync Time, Sync Status, Pending/Failed Operations) sözleşme üzerinden taşınabilir hâle getirilir; somut UI gösterimi Design System Blueprint'in konusudur.

## 20. Security / Entitlement Relationship
Sync sözleşmesi, Entitlement'ın server authoritative kalmasını hiçbir durumda bozmaz — bir senkronizasyon isteği entitlement durumunu değiştirmek için kullanılamaz; entitlement değişikliği sadece kendi sözleşmesi (API Contract Blueprint) üzerinden gerçekleşir.

## 21. Local SQLite Relationship
Senkronizasyon sözleşmesi, SQLite'ın yerel çalışma kopyası rolüyle uyumludur — sözleşme üzerinden gelen/giden veri yerelde SQLite'a yazılır/okunur; sözleşmenin kendisi SQLite'ın şemasını bilmez.

## 22. Background Sync Philosophy
ADR-012'deki Background Sync ilkesi teyit edilir — senkronizasyon çağrıları kullanıcı etkileşimini bloklamadan arka planda gerçekleştirilebilecek şekilde tasarlanır.

## 23. Error Contract Relationship
Sync'e özel hatalar, API Contract Blueprint'teki genel hata yapısını kullanır — sync için ayrı, tutarsız bir hata formatı icat edilmez.

## 24. AI Generated Sync Review
**AI tarafından önerilen sync değişiklikleri de insan review'undan geçmelidir** — AI, idempotency veya server authoritative gibi ihlali kolay fark edilemeyen ince kuralları yanlış uygulayabilir.

## 25. Risks
| Risk | Açıklama |
|---|---|
| Idempotency ihlali | Aynı verinin tekrar gönderilmesi sonucu bozması |
| Entitlement'ın sync yoluyla yazılması | Madde 9/20 ihlali, güvenlik açığı |
| Sessiz sync başarısızlığı | Madde 17 ihlali, kullanıcının veri kaybından habersiz kalması |
| Version uyumsuzluğunun fark edilmemesi | Madde 15 ihlali, eski istemcinin bozulması |
| Sync detaylarının API Contract'a geri sızması | API Contract Blueprint'in kasıtlı sınırının bozulması |

## 26. Mitigations
- Idempotency ihlali riski, Madde 13'ün her Client Generated Data sözleşmesinde zorunlu bir koşul olarak tanımlanmasıyla azaltılır.
- Entitlement'ın sync yoluyla yazılması riski, Madde 9/20'nin "sadece sunucudan istemciye" kuralının geçilemez olmasıyla azaltılır.
- Sessiz sync başarısızlığı riski, Madde 17/19'un birlikte uygulanmasıyla azaltılır.
- Version uyumsuzluğu riski, Madde 15'in her sözleşme değişikliğinde kontrol edilmesiyle azaltılır.
- Sync detaylarının geri sızması riski, bu blueprint'in API Contract Blueprint'e referans vererek net bir sınır çizmesiyle azaltılır.

## 27. Non-Goals
- Sync kodu/implementasyonu.
- Queue implementasyonu.
- SQL/migration.
- API endpoint listesi.
- TypeScript tipi.
- Conflict resolution algoritmasının kodu.
- Yeni teknoloji seçimi.

## 28. Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-001–ADR-013 (özellikle ADR-003, ADR-012) ile çelişmiyor.
- [x] Engineering Foundation 1–20 ile uyumlu.
- [x] Architecture v1.0 Freeze, API Contract Blueprint, Database Design Blueprint ile çelişmiyor.
- [x] Kod/SQL/endpoint/TypeScript tipi/queue implementasyonu içermiyor.
- [x] Yeni teknoloji seçilmedi.

## 29. Next Step
Onaylandıktan sonra sıradaki adım **Repository Pattern Blueprint**'tir — burada tanımlanan sözleşmelerin, istemci tarafında (mobil app, ADR-010 State Management ile) hangi erişim/soyutlama deseniyle kullanılacağı ele alınacaktır.

## 30. Sync Ownership
Senkronizasyon sözleşmesinin bir **sahibi** olmalıdır. Owner şunlardan sorumludur:
- Idempotency kurallarının korunması
- Version compatibility'nin korunması
- Conflict strategy ile uyum
- Offline safety ilkesinin korunması
- Sync failure davranışlarının izlenebilir kalması

## 31. Sync Review Rule
Sync contract değişmeden önce şu sorular kontrol edilmelidir:
- Data category doğru mu?
- Sync direction doğru mu?
- Server authoritative data istemciden yazılıyor mu?
- Attempt / Exam Session idempotent mi?
- Version compatibility korunuyor mu?
- Error contract tutarlı mı?
- Offline safety bozuluyor mu?

## See Also
- Implementation Blueprint 07 (API Contract)
- ADR-003, ADR-012
- Implementation Blueprint 09 (Repository Pattern)
