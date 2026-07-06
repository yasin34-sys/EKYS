# ADR-004: SQLite Local Database

## Status
Accepted

## Context
- Offline-first mimari (ADR-003) gereği, indirilen paket içeriği ve kullanıcı ilerleme verisi cihaz üzerinde saklanmalı ve tamamen offline sorgulanabilir olmalıdır.
- İçerik modeli ilişkiseldir: konu → alt konu → soru → paket → zorluk seviyesi/paket tipi → kullanıcı → deneme/attempt → tekrar havuzu kaydı (PROJECT_CHARTER.md, Bölüm 9).
- Yerel veride ilişkisel sorgulama ihtiyacı var (örn. "bu konudaki yanlış yapılan sorular", "bu paketteki çözülmemiş sorular") — basit key-value depolama bunu doğal karşılamıyor.
- Yerel veritabanının şifrelenmesi bir gereksinim olarak belirlenmiş durumda (PROJECT_CHARTER.md, Ek Notlar; içerik sızıntı riski, Bölüm 12) — somut şifreleme mekanizması **ADR-011 (Security Strategy)** kapsamında kararlaştırılacak, bu ADR'nin kapsamı dışında.
- React Native + Expo (ADR-001), Custom Development Client + EAS Build yapılandırmasıyla native modül gerektiren bir yerel veritabanı çözümünü destekliyor.

## Decision
- **SQLite**, yerel/gömülü ilişkisel veritabanı motoru olarak kullanılacaktır.
- Paket içerikleri (sorular, konular, medya referansları) ve kullanıcı ilerleme verisi (çözüm geçmişi, tekrar havuzu, istatistik özetleri) SQLite'da saklanacaktır.
- Veritabanının şifrelenmesi bir gereksinimdir; şifreleme mekanizmasının somut seçimi **ADR-011**'e bırakılmıştır — bu ADR sadece "şifrelenmesi gerektiği"ni, "nasıl şifrelendiğini" değil karara bağlar.
- Spesifik React Native/Expo SQLite erişim kütüphanesi (npm paketi) seçimi bu ADR'nin ilk kabulünde açık bırakılmış, sonradan **`@op-engineering/op-sqlite`** olarak çözülmüştür (bkz. SQLite Access Library Decision).

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Realm | Kendi obje-tabanlı senkronizasyon servisiyle gelir; ADR-002/003/012'de zaten kararlaştırılan Supabase-merkezli senkronizasyon yaklaşımıyla çakışıyor; ilişkisel sorgular (JOIN) SQL'e göre daha az doğal |
| WatermelonDB | React Native'e özel, büyük veri setlerinde reaktif okuma için güçlü; ancak SQLite üzerine ek bir abstraction katmanı — MVP ölçeğinde ihtiyaç duyulmayan bir karmaşıklık |
| AsyncStorage / MMKV (key-value) | Basit ayar/tercih verisi için uygun; ilişkisel sorgu (konu/paket/attempt filtreleme) yeteneği yok |
| **SQLite** | **Seçildi** — ilişkisel model, SQL sorgu gücü, olgun ve yaygın React Native/Expo desteği |

## Consequences
- (+) İlişkisel sorgular (konu bazlı filtreleme, tekrar havuzu, istatistik hesaplama) doğal ve performanslı şekilde yapılabilir.
- (+) Sunucudaki (PostgreSQL, ADR-002) ile aynı ilişkisel paradigma — şema ve senkronizasyon mantığı zihinsel model olarak tutarlı.
- (+) Olgun, geniş topluluk desteğine sahip bir teknoloji.
- (-) Şifreleme SQLite'ın standart hâlinde yerleşik değildir; bu ihtiyaç ADR-011'de ayrıca çözülmesi gereken bir bağımlılık oluşturuyor.
- (-) Şema migration'ları (uygulama güncellemesinde yerel DB yapısının değişmesi) yönetilmesi gereken bir operasyonel detay.

## Risks
| Risk | Açıklama |
|---|---|
| Şifreleme bağımlılığı netleşmeden güvenlik boyutu açık kalır | Şifreleme mekanizması ADR-011'e bırakıldığı için, o tamamlanana kadar bu ADR'nin güvenlik boyutu eksik sayılmalı |
| Yerel şema migration hataları | Uygulama güncellemesinde şema değişikliği yanlış yönetilirse kullanıcı verisi bozulabilir/kaybolabilir |
| Büyük veri hacminde performans | Çok büyük soru paketleri yerel depolama/sorgu performansını etkileyebilir |
| Platformlar arası davranış farkı | iOS/Android'de native SQLite sürümleri küçük davranış farklılıkları gösterebilir |

## Mitigations
- Şifreleme mekanizması ADR-011 kapsamında öncelikli ele alınacak; bu ADR o tamamlanmadan güvenlik açısından eksiksiz sayılmaz.
- **Migration'lar backward compatible olacak şekilde tasarlanacaktır. Hiçbir uygulama güncellemesi kullanıcı verisinin kaybolmasına neden olmamalıdır.** Şema değişiklikleri için versiyonlu, sıralı bir migration mekanizması kullanılacak; her migration'ın geriye dönük veri bütünlüğünü koruduğu doğrulanacaktır. Detay ileride bir teknik tasarım dokümanında ele alınacak.
- Performans riski MVP ölçeğinde düşük görülüyor; paket bazlı indirme (ADR-005) veri hacmini zaten sınırlıyor. Büyüme izlenecek.
- Aktif bakım gören, geniş topluluk desteğine sahip bir SQLite erişim kütüphanesi seçildi (bkz. SQLite Access Library Decision); platform farklılıkları bu kütüphane tarafından abstrakte edilir.

## Non-Goals
- Şifreleme mekanizmasının somut seçimi — ADR-011 (Security Strategy).
- ~~Spesifik SQLite erişim kütüphanesi/npm paketi seçimi~~ — **Çözüldü: `@op-engineering/op-sqlite`** (PO/CTO onayı, 2026-07-02; bkz. SQLite Access Library Decision).
- Veritabanı şema/tablo tasarımı — Database Design Document (Future).
- Senkronizasyon algoritması — ADR-012 (Synchronization Strategy).

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile çelişmiyor.
- [x] ADR-001 (React Native + Expo) ile uyumlu.
- [x] ADR-003 (Offline First) ile uyumlu.
- [x] ADR-011 (Security Strategy) ile çelişmiyor (şifreleme kararı ona bırakılıyor).
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-001 (React Native + Expo)
- ADR-003 (Offline First Architecture)
- ADR-011 (Security Strategy)
- ADR-012 (Synchronization Strategy)

## SQLite Access Library Decision
**Karar (2026-07-02):** Yerel SQLite erişimi için **`@op-engineering/op-sqlite`** kullanılacaktır (PO/CTO onayı). Gerekçe: SQLCipher tabanlı şifreleme desteğinin olgun ve üçüncü parti (PowerSync) tarafından üretimde doğrulanmış olması, aktif 2025 bakım kaydı, ve orijinal aday `react-native-quick-sqlite`'ın kendi bakımcısı tarafından deprecated ilan edilip `react-native-nitro-sqlite`'a yönlendirilmiş olması.

Bu karar **yalnızca SQLite access library'sini** (erişim kütüphanesini) kapsar — bir şifreleme stratejisi kararı değildir. Şifreleme anahtarı yönetimi, SQLCipher etkinleştirme stratejisi, güvenli anahtar saklama ve anahtar rotasyonu/kurtarma stratejisi tamamen **ADR-011'in sorumluluğunda, bağımsız ve hâlâ açık** bir mimari konudur; bu kararla çözülmemiştir.
