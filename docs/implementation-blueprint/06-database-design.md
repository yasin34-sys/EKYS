# Implementation Blueprint 06: Database Design Blueprint

## Status
Accepted

## Purpose
Domain Model Blueprint'te tanımlanan on entity'nin, Supabase PostgreSQL (sunucu) ve SQLite (yerel) tarafında **kavramsal olarak** nasıl temsil edileceğini planlamak.

## 1. Purpose
(Yukarıdaki Purpose ile aynı.)

## 2. Relationship to Domain Model Blueprint
Bu blueprint, Domain Model Blueprint'teki on entity'yi (Exam, Topic, Question, Package, User, Entitlement, Attempt, Exam Session, Repeat Pool, Learning Metric) **yeniden tanımlamaz** — onların fiziksel katmana (Domain Boundary Rule, Domain Model Blueprint) nasıl yansıyacağını planlar.

## 3. Database Design Philosophy
Fiziksel veri tasarımı, Domain Model'in **doğal bir uzantısı** olmalıdır — veritabanı şeması, domain kavramlarını bulanıklaştıran veya onlarla çelişen bir yapıya sahip olmamalıdır.

## 4. Server Database Responsibility
**PostgreSQL (Supabase, ADR-002), sistemin otoritatif kaynağıdır (source of truth)** — Server Authoritative Data (ADR-012) burada yaşar: Exam, Topic, Package (meta), Entitlement ve versiyonlanmış Question içeriği.

## 5. Local Database Responsibility
**SQLite (ADR-004), offline çalışmayı mümkün kılan bir çalışma kopyasıdır** — sunucudan indirilen içerik (Static Package Content) ve kullanıcının offline ürettiği veri (Attempt, Exam Session) burada, senkronize edilene kadar kalıcı olarak tutulur.

## 6. Shared Conceptual Model
Sunucu ve yerel veritabanı **aynı domain kavramlarını** temsil eder — iki farklı şema değil, aynı kavramsal modelin iki farklı fiziksel yansımasıdır. Single Source of Truth ilkesinin (ADR-010) veritabanı seviyesindeki karşılığıdır.

## 7. Exam Context Isolation
Domain Model Blueprint'teki ilke burada fiziksel bir zorunluluğa dönüşür: **her kullanıcı verisi (Entitlement, Attempt, Exam Session, Repeat Pool, Learning Metric) bir exam kimliğiyle izole edilmelidir** — hem sunucu hem yerel şemada. Somut alan adı/tipi belirtilmeden, bir **tasarım zorunluluğu** olarak kayda geçer.

## 8. Content Tables Strategy
Exam, Topic, Question, Package — **içerik verisi** olarak, Editorial CMS'in (ADR-006) yaşam döngüsüne ve Package Versioning'e (Madde 14) tabi, sunucu tarafında otoritatif tutulur; yerel tarafta indirilen paketin içeriği olarak (salt okunur bir kopya gibi) bulunur.

## 9. User Data Tables Strategy
User (kimlik, ADR-009) sunucu tarafında otoritatif; Entitlement, Attempt, Exam Session gibi kullanıcı verisi **Content Tables'dan (Madde 8) açıkça ayrı** tutulur (Content vs. User-Generated separation, ADR-012).

## 10. Entitlement Tables Strategy
**Entitlement server-side authoritative olmalıdır** — istemci tarafında hiçbir zaman üretilmez, sadece sunucudan senkronize edilen bir kopyası (ADR-003, ADR-007) yerelde bulunur. RLS (Madde 16) ile korunur.

## 11. Attempt / Exam Session Strategy
**Attempt ve Exam Session, kullanıcı tarafından üretilen veri (Client Generated Data, ADR-012) olarak modellenir** — önce yerelde üretilir, sonra sunucuya senkronize edilir (ADR-012 Sync Directions: Client → Server). Exam Session, birden fazla Attempt'i gruplayan üst kavram olarak her iki tarafta da aynı ilişkiyi korur.

## 12. Repeat Pool Strategy
Repeat Pool'un kalıcı bir tablo mu, yoksa Attempt kayıtlarından türetilmiş bir görünüm mü olacağı burada **kavramsal olarak** değerlendirilir, SQL yazılmaz:
- **Kalıcı tablo yaklaşımı:** Kendi kaydı olur, her Attempt bu kaydı günceller. Avantaj: sorgu basitliği. Dezavantaj: Attempt ile senkronize tutulması gereken ikinci bir veri kaynağı.
- **Türetilmiş görünüm yaklaşımı:** Attempt kayıtlarından (en son sonucu yanlış olan Question'lar) her sorgulandığında hesaplanır. Avantaj: tek doğruluk kaynağı. Dezavantaj: sorgu karmaşıklığı.

**Karar (2026-07-02):** Repeat Pool, **türetilmiş veri (derived data) olarak modellenecektir ve kalıcı bir doğruluk kaynağı (persistent source of truth) değildir** (PO/CTO onayı). Gerekçe: Repeat Pool Derived Data'dır (ADR-012); Attempt geçmişi tek otoritatif kaynak olarak kalır; dual-source-of-truth ve gereksiz sync/conflict yüzeyi riskleri önlenir (ADR-010/ADR-012 ve Madde 22 — Derived Data Policy ile tutarlı); performans riski uygun indeksleme ile kabul edilebilir görülmüştür.

**Güncel mimari yön**, bunun bir türetilmiş görünüm (derived view) veya eşdeğer bir hesaplanmış temsil (equivalent computed representation) üzerinden uygulanmasıdır — ancak **somut SQL implementasyonu hâlâ bu Blueprint'in kapsamı dışındadır** (Non-Goals, Madde 28). Pool'a özel metadata (öncelik, erteleme vb.) ihtiyacı ileride gerçekten doğarsa, bu yaklaşımı bozmadan ayrı bir companion table ile eklenebilir.

## 13. Learning Metrics Strategy
**Learning Metrics, Derived Data (ADR-012) olarak ele alınır** — Rule Based Learning Engine'in (ADR-008) Attempt/Exam Session'dan hesapladığı özet veridir; sunucuya senkronize edilebilir ama istemci tarafında yeniden hesaplanabilir olduğundan **ikincil bir doğruluk kaynağıdır.**

## 14. Package Versioning Strategy
Package (ve içerdiği Question'lar), ADR-005'teki versiyonlama ilkesiyle uyumlu şekilde her değişiklikte **yeni bir versiyon numarası** taşır — eski versiyon silinmez (ADR-006 rollback ilerleyen versiyon numarasıyla). Somut versiyon alanı/tipi burada belirlenmez.

## 15. Sync-Relevant Data Strategy
ADR-012'deki Data Categories, veritabanı tasarımının hangi tablo/verinin senkronize edileceğini, hangisinin edilmeyeceğini belirleyen ayrım noktasıdır — Local-only UI state (ADR-010) hiçbir zaman veritabanı şemasının bir parçası olmaz (Zustand'da yaşar, SQLite'ta değil).

## 16. RLS Relationship
**RLS detayları burada SQL olarak yazılmaz** — sadece hangi tabloların (Entitlement, User verisi, Content'in Premium kısımları) RLS ile korunması **gerektiği** ilişkisi kurulur (ADR-002, ADR-007, ADR-011). Somut politika implementasyon aşamasında yazılır.

**Karar (2026-07-02) — Mimari ilke:** Korunan veya kullanıcıya ait veri içeren her sunucu tarafı veri kaynağı, ilk tanıtıldığı andan itibaren **fail-closed** durumda oluşturulmalıdır — açık bir politika/kural tanımlanana kadar hiçbir erişime izin verilmez (PO/CTO onayı).

**Güncel mimari için uygulama (Supabase/PostgreSQL):** Bu ilke, her tablonun **ilk migration'ından itibaren PostgreSQL Row Level Security (RLS) etkinleştirilerek** oluşturulmasıyla uygulanır. PostgreSQL'in kendi davranışı gereği, RLS etkin ve politika tanımlanmamış bir tabloya hiçbir erişim verilmez — bu, ilkeyi teknik olarak fail-closed kılar. Politikalar, ilgili Repository metodu/erişim deseni fiilen geliştirildiğinde, **kademeli olarak (Small Increment ilkesiyle tutarlı)** eklenir — tüm politikaların ilk migration'da tam olarak yazılması beklenmez.

Bu yaklaşım, ADR-011'in Secure by Default, Fail Secure, Trust Model ve Least Privilege ilkeleriyle, ADR-002'nin Server Authoritative felsefesiyle ve Git Workflow'un Small Increment ilkesiyle (Madde 2) tutarlıdır. Somut politika SQL'i hâlâ bu Blueprint'in kapsamı dışındadır.

## 17. Migration Philosophy
Migration yaklaşımı **versiyonlu ve geri uyumluluk gözeten** olmalıdır — Coding Standards'daki ve ADR-004 Mitigations'daki ("kullanıcı verisi kaybolmaz") ilke tekrar teyit edilir. Somut migration aracı/formatı burada seçilmez.

**Karar (2026-07-02):** Migration aracı olarak **Supabase CLI** kullanılacaktır (PO/CTO onayı). Bu karar, migration *içeriğinin* (SQL/şema) hâlâ bu Blueprint'in kapsamı dışında kalmasını değiştirmez — sadece hangi *araçla* yazılıp uygulanacağını belirler. Migration dosyaları standart PostgreSQL SQL olarak kalır; Supabase'e özel bir şema dili kullanılmaz (ADR-002 Migration Strategy ile tutarlı). Yerel geliştirme, Docker gerektiren `supabase start` ile tam ortam emülasyonu üzerinden yapılacaktır — bu, kabul edilmiş bir geliştirme ortamı bağımlılığıdır.

## 18. Indexing Philosophy
Sık sorgulanan alanlar (örn. exam/user referansları) üzerinde indeksleme **düşünülmelidir** — ama erken optimizasyon değildir; somut indeks kararı gerçek kullanım verisiyle (Performance Optimization Phase, Development Roadmap) netleşir.

## 19. Data Ownership
Domain Model Ownership'in fiziksel veri seviyesindeki karşılığı: her tablo/veri grubunun bir sahibi olmalıdır — Content Tables muhtemelen ECMS sorumluluğunda, User Data Tables muhtemelen backend/entitlement sorumluluğunda.

## 20. Data Lifecycle
Content verisi Editorial CMS yaşam döngüsüne (ADR-006) tabidir; User verisi kullanıcı etkileşimiyle oluşur ve Deprecation ilkeleriyle yönetilir — bu iki yaşam döngüsü (Domain Model Blueprint) burada da ayrı tutulur.

## 21. Server vs Local Source of Truth
**Sunucu (PostgreSQL) otoritatif kaynaktır; SQLite offline çalışma kopyasıdır** (ADR-003 ile tam tutarlı). Hiçbir yerel veri, sunucudaki karşılığından daha "doğru" kabul edilmez, sadece bağlantı gelene kadar geçerli bir çalışma durumu temsil eder.

## 22. Derived Data Policy
Learning Metrics ve Repeat Pool (türetilmiş veri olarak modellenmesi kararlaştırıldı, bkz. Madde 12) gibi türetilmiş veri, hem sunucuda hem yerelde saklanabilir ama **hiçbir zaman birincil doğruluk kaynağı olarak görülmez** — kaynak veri (Attempt/Exam Session) her zaman yeniden hesaplama için mevcuttur.

## 23. Soft Delete / Archiving Philosophy
İçerik verisi (Exam, Package, Question) hiçbir zaman **sert silme** ile kaldırılmaz — arşivlenir/deprecated işaretlenir (Exam Lifecycle'daki "Archived" durumu, ADR-013). Kullanıcı verisi için silme politikası, gelecekte bir Privacy/Compliance dokümanının (ADR-009 Architecture Notes) konusudur — burada karara bağlanmaz.

## 24. Audit Trail Relationship
**Audit trail, özellikle Editorial CMS ve içerik değişiklikleri için önemlidir** (ADR-006) — kim, ne zaman, neyi değiştirdi bilgisi Content Tables için bir tasarım gereksinimidir. Güvenlik olayları için Audit Trail (ADR-011) ayrı bir kapsamdır, burada sadece içerik audit trail'i ile ilişkisi not edilir.

## 25. Backup / Restore Relationship
Security Baseline'daki ilke teyit edilir: yedekleme/geri yükleme stratejisi Critical/Sensitive veri sınıflandırmasına (ADR-011) duyarlı tasarlanmalıdır — somut mekanizma bu blueprint'in kapsamı dışındadır.

## 26. Risks
| Risk | Açıklama |
|---|---|
| Exam izolasyonunun unutulması | Bir tablonun exam kimliği taşımadan tasarlanması |
| Content/User verisi karışması | İçerik ve kullanıcı verisinin aynı tabloda/mantıkta karışması |
| Repeat Pool'da erken/yanlış karar | İki yaklaşımdan birinin gerçek performans verisi olmadan aceleyle kesinleştirilmesi |
| RLS'siz Entitlement erişimi | Entitlement'ın sunucu tarafında RLS ile korunmadan bırakılması |
| Audit trail eksikliği | İçerik değişikliklerinin izlenebilir olmaması |

## 27. Mitigations
- Exam izolasyonu riski, Madde 7'nin implementasyon öncesi zorunlu bir kontrol noktası olmasıyla azaltılır.
- Content/User karışması riski, Madde 8-9'daki ayrımın şema tasarımında açık bir sınır olarak korunmasıyla azaltılır.
- Repeat Pool erken kararı riski, Madde 12'nin bilinçli olarak "öneri var, nihai karar implementasyonda" şeklinde bırakılmasıyla azaltılır.
- RLS'siz erişim riski, Madde 16'nın implementasyon aşamasında ADR-011 ile birlikte zorunlu bir adım olarak işaretlenmesiyle azaltılır.
- Audit trail eksikliği riski, Madde 24'ün Content Tables tasarımının bir gereksinimi olarak açıkça belirtilmesiyle azaltılır.

## 28. Non-Goals
- SQL/migration yazımı.
- Supabase/SQLite şemasının somut tablo/alan listesi.
- TypeScript tipi implementasyonu.
- RLS politikalarının somut SQL implementasyonu.
- ~~Repeat Pool'un nihai (kalıcı tablo vs. türetilmiş görünüm) kararı~~ — **Çözüldü: Repeat Pool türetilmiş veri olarak modellenir, kalıcı doğruluk kaynağı değildir** (PO/CTO onayı, 2026-07-02; bkz. Madde 12). Güncel mimari yön: derived view veya eşdeğer hesaplanmış temsil; somut SQL implementasyonu hâlâ kapsam dışıdır.
- İndeksleme kararları.
- Yeni teknoloji seçimi.

## 29. Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-001–ADR-013 ile çelişmiyor.
- [x] Engineering Foundation 1–20 ile uyumlu.
- [x] Architecture v1.0 Freeze ile çelişmiyor.
- [x] Domain Model Blueprint ile uyumlu.
- [x] SQL/migration/tablo alanı/TypeScript tipi içermiyor.
- [x] Yeni teknoloji seçilmedi.

## 30. Next Step
Bu blueprint onaylandıktan sonra, Mode Transition (Repository Initialization Blueprint) gerçekleştiğinde, somut şema tasarımı (tablo/alan listesi, RLS politikaları, migration dosyaları) implementasyon aşamasında bu blueprint'in ilkeleri doğrultusunda yazılabilir.

## 31. Entity Ownership
Her ana veri grubunun (Content, User Data, Derived Data, Entitlement) bir **sahibi** olmalıdır. Owner şunlardan sorumludur:
- Şema değişikliklerinin değerlendirilmesi
- Domain Model ile uyumluluğun korunması
- Backward compatibility'nin korunması
- Migration etkisinin incelenmesi
- Gereksiz alan veya tablo eklenmesinin engellenmesi

Bu ilke, Domain Ownership'in (Domain Model Blueprint) fiziksel veri seviyesindeki karşılığıdır.

## 32. Database Review Rule
Bir şema değişikliği yapılmadan önce şu sorular kontrol edilmelidir:
- Domain Model ile uyumlu mu?
- Exam Context Isolation korunuyor mu?
- Content Data ile User Data ayrımı korunuyor mu?
- Source of Truth ilkesi bozuluyor mu?
- Migration geriye uyumlu mu?
- RLS etkileniyor mu?
- Derived Data yanlışlıkla authoritative hâle geliyor mu?

## 33. Future Extensibility
Veritabanı tasarımı, yeni sınavların (KPSS, YKS, ALES vb.) eklenmesini mümkün kılacak şekilde genişleyebilir olmalıdır. Yeni bir exam eklemek; mevcut kullanıcı verisini, mevcut entitlement yapısını, mevcut senkronizasyon mekanizmasını, mevcut içerik modelini **bozmadan** gerçekleştirilebilmelidir. Bu ilke, ADR-013'teki Multi-Exam Architecture kararının veritabanı seviyesindeki karşılığıdır.

## See Also
- Implementation Blueprint 05 (Domain Model)
- ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-011, ADR-012, ADR-013
- Implementation Blueprint 07 (API Contract)
