# ADR-002: Supabase + PostgreSQL

## Status
Accepted

## Context
- İçerik modeli doğası gereği ilişkisel: konu → alt konu → soru → paket → zorluk seviyesi/paket tipi → kullanıcı → deneme/attempt → entitlement (PROJECT_CHARTER.md, Bölüm 9 — MVP 1 Kapsamı).
- Sunucunun rolü sınırlı ve nettir: auth, entitlement kontrolü, içerik güncelleme, paket dağıtımı, senkronizasyon, editoryal yönetim; ağır iş mantığı istemci tarafında (offline-first) çalışır (PROJECT_CHARTER.md, Bölüm 9).
- Entitlement modelinin, tek SKU'dan hibrit/paket bazlı modele geçişe izin verecek şekilde esnek tasarlanması gerekiyor (PROJECT_CHARTER.md, Bölüm 8 — Ücretsiz/Premium İş Modeli; Ek Notlar).
- İçerik paketleri asla uygulama binary'sine gömülmemeli, her zaman sunucudan dinamik dağıtılmalı (PROJECT_CHARTER.md, Ek Notlar).
- Küçük/orta ölçekli ekip; uzun ömürlü, düşük vendor lock-in riskli bir mimari önceliklidir (PROJECT_CHARTER.md, Bölüm 14 — Ürün Tasarım Prensipleri).

## Decision
- **PostgreSQL**, ana sunucu veritabanı olarak kullanılacaktır.
- **Supabase**, bu PostgreSQL'i yöneten BaaS (Backend-as-a-Service) katmanı olarak kullanılacaktır: Auth, Storage, otomatik REST/GraphQL API (PostgREST), Row-Level Security (RLS), Edge Functions.
- Entitlement ve içerik erişim kontrolü, istemci tarafı kontrolüne değil, **veritabanı seviyesinde RLS politikalarına** dayanacaktır.
- IAP doğrulaması istemci tarafında yapılmayacaktır. Sunucu tarafında güvenli bir doğrulama mekanizması kullanılacaktır. Kullanılacak yöntem **ADR-007 (Entitlement & Premium)** kapsamında belirlenecektir.

**PostgreSQL neden seçildi?** Konu/soru/paket/kullanıcı/entitlement ilişkileri doğası gereği ilişkisel bir modeldir; yabancı anahtar bütünlüğü, JOIN performansı ve şema disiplini bu tür bir veri yapısında NoSQL alternatiflerine göre daha güvenli ve tahmin edilebilirdir.

**Supabase neden seçildi?** Auth, Storage ve API katmanının hazır gelmesi, küçük ekip için sıfırdan backend yazma maliyetini ortadan kaldırıyor. RLS, entitlement kontrolünü doğrudan veritabanı seviyesinde uygulanabilir kılıyor — bu, istemci tarafı kontrolüne kıyasla kırılması çok daha zor bir güvenlik sınırı oluşturuyor. En kritik nokta: Supabase, sahiplenilmiş/kapalı bir veritabanı motoru değil, saf PostgreSQL üzerine kurulu olduğu için gerekirse self-host'a veya başka bir yönetilen Postgres sağlayıcısına geçiş mimariyi yeniden yazmadan mümkündür.

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Firebase (Firestore) | Hazır offline-sync altyapısı güçlü; ancak NoSQL veri modeli ilişkisel içerik yapımıza doğal uymuyor; kapalı, Google'a özel — self-host imkânı yok, yüksek vendor lock-in |
| Özel Backend (Node/NestJS) + Yönetilen Postgres | Tam kontrol sağlar; ancak auth/API/admin backend'inin sıfırdan yazılması küçük ekip için zaman/bakım maliyeti yüksek |
| Appwrite | Supabase'e benzer açık kaynak BaaS; daha küçük ekosistem/olgunluk, daha az üçüncü parti entegrasyon örneği |
| PocketBase | Tek dosyalı ve hızlı başlangıç sağlar; PostgreSQL tabanlı değildir; ilişkisel veri modeli ve uzun vadeli ölçeklenebilirlik ihtiyaçlarımız açısından uygun görülmemiştir |
| **Supabase (PostgreSQL)** | **Seçildi** |

## Consequences
- (+) İlişkisel model + RLS, entitlement ve içerik erişim kontrolünü doğal olarak destekliyor.
- (+) Auth/Storage/API hazır olduğu için MVP geliştirme hızı artıyor.
- (+) Saf Postgres temelli olması, self-host veya sağlayıcı değişikliği imkânını açık bırakıyor (düşük lock-in).
- (+) Offline-first mimari zaten sunucuya giden trafiği azaltıyor; bu da Supabase'in kullanım bazlı maliyet modeliyle uyumlu.
- (-) Yine yönetilen bir hizmet — fiyatlandırma/uptime bağımlılığı var.
- (-) RLS politikalarının doğru yazılması ayrı bir disiplin/test süreci gerektiriyor; yanlış yazılırsa güvenlik açığına dönüşebilir.

## Risks
| Risk | Açıklama |
|---|---|
| RLS politika hatası | Gevşek/yanlış yazılmış bir RLS politikası, entitlement'ı olmayan bir kullanıcının premium içeriğe erişmesine yol açabilir |
| IAP doğrulama zafiyeti | Doğrulama mekanizması yanlışlıkla istemci beyanına dayanırsa sahte/crack entitlement riski oluşur |
| Vendor bağımlılığı | Supabase'in fiyatlandırma politikası veya hizmet kesintisi projeyi doğrudan etkileyebilir |
| Sürüm/altyapı değişiklikleri | Supabase'in kendi platform güncellemeleri (API kırılmaları, deprecation) entegrasyonu bozabilir |
| Ölçeklendirme riski | PostgreSQL altyapısının gelecekte ölçeklendirilmesi gerekebilir (örn. çoklu sınav mimarisine genişleme ile) |

## Mitigations
- RLS politikaları için ayrı bir test/denetim süreci kurulacak (ADR-011 Security Strategy ile koordineli); her entitlement senaryosu için otomatik test yazılacak.
- IAP doğrulaması yalnızca sunucu tarafında yapılacak; istemci beyanı hiçbir zaman tek başına entitlement vermeyecek. Doğrulama mekanizmasının somut yöntemi ADR-007'de belirlenecek.
- Saf Postgres temelli mimari sayesinde self-host veya alternatif sağlayıcıya geçiş yolu açık tutulacak; bu geçiş maliyeti düzenli olarak (örn. yıllık) gözden geçirilecek.
- Supabase'in sürüm/deprecation duyuruları takip edilecek, kritik güncellemeler bir bakım görevi olarak planlanacak.
- Ölçeklendirme riski, offline-first mimarinin sunucu yükünü zaten minimize etmesiyle şimdilik düşük; büyüme metrikleri izlenecek, gerekirse read-replica/partitioning **Scalability Design Document (Future)** kapsamında değerlendirilecek.
- **Migration Strategy:** Supabase bağımlılığı minimum tutulacaktır. Mümkün olduğunca standart PostgreSQL özellikleri kullanılacak; Supabase'e özel özellikler (örn. belirli Edge Function/Realtime davranışları) yalnızca gerçek fayda sağladığında tercih edilecektir. Bu sayede gelecekte farklı bir PostgreSQL sağlayıcısına veya self-host ortama geçiş mümkün kalacaktır.

## Non-Goals
- Veritabanı tablo/şema tasarımı — Database Design Document (Future).
- RLS politikalarının tam detaylı yazımı — ADR-011 (Security Strategy) ve ilgili teknik tasarım dokümanı.
- IAP sağlayıcı seçimi (RevenueCat vs. doğrudan platform API) — ADR-007 (Entitlement & Premium).
- Authentication yöntemi detayları (email/OAuth vb.) — ADR-009 (Authentication Strategy).
- API endpoint/konvansiyon detayları — ileride operasyon/teknik tasarım dokümanı.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile çelişmiyor.
- [x] Offline-First mimarisini engellemiyor.
- [x] Dynamic Content Packages mimarisine uygun (içerik binary'ye gömülmüyor).
- [x] Entitlement modelini desteklemeye uygun (RLS ile paket bazlı erişim kontrolü mümkün).
- [x] Gelecekte çoklu sınav mimarisine (ADR-013) genişleyebilir.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-004 (SQLite Local Database)
- ADR-006 (Editorial CMS)
- ADR-007 (Entitlement & Premium)
- ADR-009 (Authentication Strategy)
- ADR-011 (Security Strategy)
- ADR-012 (Synchronization Strategy)
