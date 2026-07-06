# ADR-009: Authentication Strategy

## Status
Accepted

## Context
- ADR-002: Supabase Auth, kimlik doğrulama sağlayıcısı olarak seçildi.
- ADR-007: Entitlement, hesaba bağlıdır (cihaza değil) — bu, tutarlı bir kullanıcı kimliği kavramı gerektirir.
- PROJECT_CHARTER.md Bölüm 9: uygulama ücretsiz katmanla (misafir/anonim kullanım dahil olabilir) başlar, Premium hesap bazlı bir haktır.
- Offline-first mimari (ADR-003): kimlik doğrulama durumu, offline oturumlarda da bir şekilde tutarlı davranmalıdır.

## Decision
- **Supabase Auth'un `user_id`'si, sistemin tek gerçek kimlik kaynağıdır** — kullanıcı hangi sağlayıcıyla (email, OAuth vb.) giriş yaparsa yapsın, uygulama içi tüm veri modeli bu `user_id`'ye bağlanır.
- **Anonim (misafir) kullanım desteklenir**, ancak anonim kullanım **hiçbir premium hak veya bulut senkronizasyonu** sağlamaz — bu haklar sadece kayıtlı (registered) bir hesapla mümkündür.
- Anonim bir kullanıcı kayıt olduğunda (**anonymous-to-registered migration**), **kullanıcı kimliği (user identifier) değişmez** — anonim oturum ile kayıtlı hesap aynı kimliği paylaşır. Bu mimari bir gerekliliktir: yerel (SQLite) kullanıcı verisi, yaşam döngüsü boyunca **aynı kimliğe bağlı kalır** ve bu geçiş sırasında **hiçbir yeniden anahtarlama (re-keying) veya veri taşıma işlemi gerekmez** — kullanıcının cihaz üzerindeki çalışması, kimliğin sürekliliği sayesinde zaten kesintisizdir.
- Offline oturum sırasında kimlik doğrulama durumunun ne kadar süre "geçerli" kabul edileceği (bağlantı olmadan uygulamanın ne kadar süre kullanılabileceği) genel bir tolerans ilkesidir; bu, **ADR-007'deki Grace Period ile aynı kavram değildir** — entitlement'ın offline toleransı ayrı, oturumun offline toleransı ayrı bir konudur. Bu oturum toleransının somut süresi ve mekanizması **ADR-011 (Security Strategy)**'ye bırakılmıştır.

## Provider Ownership
Kimlik doğrulama sağlayıcısı (Supabase Auth) tek bir noktadan yönetilir; hangi giriş yöntemlerinin (email/şifre, OAuth sağlayıcıları vb.) sunulacağı ürün kararıdır ve bu ADR'nin kapsamı dışındadır (bkz. Non-Goals). Mimari olarak önemli olan, sağlayıcı/yöntem ne olursa olsun **tek bir `user_id`** etrafında birleşilmesidir.

## Guest / Anonymous Usage Boundary
- Misafir kullanım, PROJECT_CHARTER.md Bölüm 9'daki ücretsiz katmanın (ilk 100 soru + 1 örnek deneme) değerlendirilmesine izin verir.
- Misafir kullanım **entitlement (ADR-007) veya bulut senkronizasyonu (ADR-012) sağlamaz.**
- Kullanıcı kayıt olmadan Premium satın alamaz — satın alma işlemi kayıtlı bir hesap gerektirir (entitlement'ın hesaba bağlı olması ilkesiyle, ADR-007, tutarlı).

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Cihaz kimliği (device ID) bazlı kimlik | Restore Purchases ve çoklu cihaz senaryolarını desteklemez; ADR-007'nin hesap bazlı entitlement kararıyla çelişir |
| Zorunlu kayıt (misafir kullanım yok) | Kullanıcının uygulamayı denemeden karar vermesini zorlaştırır; PROJECT_CHARTER.md Bölüm 9'daki ücretsiz katman deneyimiyle uyumsuz |
| Her sağlayıcı için ayrı kimlik kaydı (email ve OAuth ayrı kullanıcı sayılır) | Aynı kişinin farklı giriş yöntemleriyle farklı hesaplar oluşturmasına yol açar; veri/entitlement parçalanması riski |
| **Supabase Auth `user_id` tek kimlik kaynağı + desteklenen anonim kullanım** | **Seçildi** |

## Consequences
- (+) Tüm veri modeli tek, tutarlı bir kimlik (`user_id`) etrafında birleşiyor.
- (+) Misafir kullanım, kullanıcının kayıt olmadan ürünü değerlendirmesine izin veriyor.
- (+) Anonim→kayıtlı geçişte veri kaybı yaşanmıyor.
- (-) Anonim-to-registered migration mantığı, ekstra bir geçiş senaryosu olarak test edilmesi gereken bir karmaşıklık ekliyor.
- (-) Offline oturum toleransının ADR-011'e bırakılması, bu ADR'nin güvenlik boyutunun ADR-011 tamamlanana kadar eksik kalması anlamına geliyor.

## Risks
| Risk | Açıklama |
|---|---|
| Anonim veri kaybı | Migration akışı hatalı çalışırsa anonim kullanıcının yerel verisi kayıtlı hesaba doğru taşınmayabilir |
| Kimlik karışıklığı | Aynı kişinin birden fazla `user_id` ile sisteme kaydolması (örn. farklı email'lerle) |
| Offline oturum toleransı netleşmeden güvenlik açığı | Süre/mekanizma ADR-011'e bırakıldığı için, o tamamlanana kadar bu risk açık kalır |
| Misafir kullanımın kötüye kullanılması | Anonim hesaplar üzerinden tekrar tekrar ücretsiz katman hakkının "sıfırlanması" denenebilir |

## Mitigations
- Anonim-to-registered migration akışı için ayrı test senaryoları tanımlanacak; veri taşıma işlemi atomik olacak şekilde tasarlanacak.
- Kimlik karışıklığı riski, tek bir `user_id` kaynağına (Supabase Auth) sıkı bağlılıkla ve provider bazlı hesap birleştirme senaryolarının ayrıca değerlendirilmesiyle azaltılacak.
- Offline oturum toleransı, ADR-011 tamamlanana kadar bu ADR'nin bilinen bir açık noktası olarak kayda geçirilmiştir.
- Misafir kullanımın kötüye kullanılması riski, cihaz bazlı bir sınırlama (implementasyon detayı) ile MVP ölçeğinde kabul edilebilir seviyede tutulacaktır; bu düşük öncelikli bir risktir.

## Non-Goals
- Hangi OAuth sağlayıcılarının (Google, Apple vb.) destekleneceği — ürün kararı, bu ADR'nin kapsamı dışında.
- Offline oturum toleransının somut süresi/mekanizması — ADR-011 (Security Strategy).
- Hesap silme/veri saklama politikası (KVKK/GDPR uyumu) — ileride ayrı bir compliance dokümanı.
- Şifre sıfırlama/e-posta doğrulama akışlarının UI detayları.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-002 (Supabase + PostgreSQL) ile uyumlu.
- [x] ADR-007 (Entitlement & Premium) ile çelişmiyor (Grace Period kavramı ayrıştırıldı).
- [x] ADR-003 (Offline First) ile uyumlu.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-002 (Supabase + PostgreSQL)
- ADR-003 (Offline First Architecture)
- ADR-007 (Entitlement & Premium)
- ADR-011 (Security Strategy)
- ADR-012 (Synchronization Strategy)
