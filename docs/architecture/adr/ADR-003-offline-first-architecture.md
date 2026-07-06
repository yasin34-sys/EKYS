# ADR-003: Offline First Architecture

## Status
Accepted

## Context
- EKYS adayları her zaman kararlı bir internet bağlantısına sahip olmayabilir (toplu taşımada çalışma, okul içi zayıf bağlantı, kırsal bölge gibi durumlar); bağlantı kesintisi çalışmayı kesintiye uğratmamalıdır (PROJECT_CHARTER.md, Bölüm 9).
- PROJECT_CHARTER.md'deki temel motivasyonlardan biri sunucu maliyetini azaltmaktır — 5000+ sorunun her testte sunucudan okunmaması hedefi (PROJECT_CHARTER.md, Bölüm 8/9).
- Rekabet analizinde tespit edilen boşluklardan biri: rakip çözümler (YouTube, Telegram, PDF, web tabanlı test siteleri) süreklilik ve tutarlı bir çalışma deneyimi sunmuyor; bağlantısız güvenilir çalışma bir farklılaşma noktasıdır (PROJECT_CHARTER.md, Bölüm 7).
- "Düzenli Çalışma" ve "Profesyonel Kullanıcı Deneyimi" ilkeleri (PROJECT_CHARTER.md, Bölüm 2.1), kullanıcının bağlantı durumundan bağımsız kesintisiz çalışabilmesini gerektirir.

## Decision
- Kullanıcı **online** olduğunda: paket indirme, kimlik doğrulama, entitlement kontrolü, içerik güncelleme kontrolü, senkronizasyon (yerel sonuçların sunucuya gönderilmesi) gerçekleşir.
- Bir paket indirildikten sonra, o paketle ilgili **tüm işlemler istemci üzerinde, tamamen offline** çalışır: soru gösterme, cevap kontrolü, tekrar havuzu yönetimi, analiz/istatistik hesaplama.
- Sunucu, sistemin **otoritatif veri kaynağı** olarak kalır; istemci ise çevrimdışı çalışmayı mümkün kılan yerel bir çalışma kopyası tutar. Senkronizasyon bu iki durumu uyumlu hâle getirir.

## Offline Capabilities
| Yetenek | Offline Çalışır mı? | Not |
|---|---|---|
| Soru çözme (indirilen paket) | ✅ Tamamen offline | Paket cihazda mevcutsa |
| Deneme sınavı çözme | ✅ Tamamen offline | Deneme paketi önceden indirilmiş olmalı |
| Analiz görüntüleme | ✅ Tamamen offline | Kural tabanlı analiz cihaz üzerinde hesaplanır |
| Tekrar havuzu | ✅ Tamamen offline | Yanlış/doğru durumu yerel veritabanında tutulur |
| İstatistikler (kişisel ilerleme) | ✅ Tamamen offline | Cihazda hesaplanır, bağlantı gelince senkronize edilir |
| Yeni paket indirme | ❌ İnternet gerekli | Paket sunucudan/depolama katmanından çekilir |
| İlk kez Premium doğrulama | ❌ İnternet gerekli | Entitlement sunucu tarafında doğrulanır (ADR-007) |
| Sonuçların sunucuya senkronizasyonu | ❌ İnternet gerekli | Bağlantı geldiğinde otomatik gerçekleşir |
| İçerik güncelleme kontrolü | ❌ İnternet gerekli | Yeni paket versiyonu var mı kontrolü |

## Synchronization Principles
*(Genel prensipler — detay algoritma ADR-012'de)*

Senkronizasyon şu durumlarda tetiklenir: uygulama açılışında (bağlantı varsa), kullanıcının manuel yenileme işleminde, yeni paket güncellemesi kontrolünde, satın alma/entitlement doğrulamasında, oturum açma/kapatma anlarında.

Genel prensip: senkronizasyon **arka planda, kullanıcının çalışmasını kesmeden** gerçekleşir; başarısız olursa sessizce yeniden denenir, kullanıcı deneyimini bloklamaz. Senkronizasyon "iyimser" (optimistic) çalışır — yerel veri her zaman kullanılabilir kabul edilir, sunucuyla uyum arka planda sağlanır.

## Conflict Strategy
Bu ADR sadece genel yaklaşımı tanımlar: bir çakışma oluşursa (örn. aynı kullanıcının verisi birden fazla kaynaktan güncellenmiş), sistem **kullanıcının çalışmasını asla engellemez** ve veri kaybını en aza indirecek bir yaklaşım izler. Çakışma çözümünün teknik algoritması **ADR-012 (Synchronization Strategy)** kapsamında tanımlanacaktır.

## Alternatives Considered
| Yaklaşım | Değerlendirme |
|---|---|
| Online First | Her işlem sunucuya bağımlı olur; bağlantı kesintisinde kullanıcı çalışamaz — temel problem tanımıyla doğrudan çelişir |
| Cache First | Sunucudan veri çekilir, yerel önbelleğe alınır; önbellek mantığı geçici/tazeleme önceliklidir — bizim ihtiyacımız kalıcı, kullanıcı kontrolünde bir yerel veri seti (paket), geçici bir önbellek değil |
| Always Online | Sürekli bağlantı gerektirir; UX ve sunucu maliyeti hedefleriyle doğrudan çelişir |
| **Offline First** | **Seçildi** — paket indirildikten sonra tüm işlevsellik cihazda çalışır, sunucu sadece senkronizasyon/dağıtım noktasıdır |

**Neden Offline First seçildi?** Hem kullanıcı deneyimi (bağlantı kesintisinde çalışmanın durmaması) hem sunucu maliyeti hedefi aynı anda sadece bu yaklaşımla karşılanabiliyor; diğer üç alternatif ikisinden birini feda ediyor.

## Consequences
**Avantajlar**
- Kullanıcı bağlantısız ortamda kesintisiz çalışabilir.
- Sunucu yükü/maliyeti önemli ölçüde azalır.
- Analiz/tekrar sistemi anlık, ağ gecikmesi olmadan çalışır.

**Dezavantajlar**
- İstemci tarafında daha karmaşık bir veri yönetim katmanı (yerel veritabanı + senkronizasyon mantığı) gerekir.
- Sunucu sistemin otoritatif veri kaynağı olmaya devam eder. İstemci ise çevrimdışı çalışmayı mümkün kılan yerel çalışma kopyasını tutar. Senkronizasyon bu iki durumu uyumlu hâle getirir — ancak bu uyumun her zaman anlık olmaması, geçici tutarsızlık pencerelerinin kabul edilmesi gerektiği anlamına gelir.
- Test edilmesi gereken senaryo sayısı artar (offline, online, senkronizasyon esnasında kesinti vb.).

## Risks
| Risk | Açıklama |
|---|---|
| Offline veri tutarlılığı | Kullanıcının cihazındaki veri, sunucudaki otoritatif kayıtla geçici olarak uyumsuz olabilir |
| Paket sürümü farklılıkları | Kullanıcı eski bir paket sürümünü offline kullanırken sunucuda güncel sürüm yayınlanmış olabilir |
| Bozuk senkronizasyon | Senkronizasyon yarıda kesilirse (bağlantı koparsa) kısmi/bozuk veri durumu oluşabilir |
| Veri kaybı | Cihaz değişimi, uygulama silinmesi gibi durumlarda henüz senkronize olmamış veri kaybolabilir |

## Mitigations
- **Offline veri tutarlılığı:** Senkronizasyon iyimser ve arka planda çalışır; kullanıcıya her zaman en güncel bilinen yerel durum gösterilir, sunucudaki otoritatif kayıtla uyum arka planda sağlanır. Teknik çakışma çözümü → ADR-012.
- **Paket sürümü farklılıkları:** Her paket bir versiyon numarası taşır; bağlantı geldiğinde güncel sürüm kontrolü yapılır ve kullanıcıya bildirim gösterilir (PROJECT_CHARTER.md, Ek Notlar). Bayat içerikle offline çalışmaya izin verilir ama kullanıcı bilgilendirilir.
- **Bozuk senkronizasyon:** Senkronizasyon işlemleri idempotent (tekrar çalıştırılabilir) tasarlanacak; kesinti durumunda son başarılı noktadan devam edilecek. Teknik detay → ADR-012.
- **Veri kaybı:** Kritik kullanıcı verisi (çözüm geçmişi, entitlement) bağlantı geldiği anda öncelikli senkronize edilecek; senkronize edilmemiş veri miktarını sınırlamak için sık senkronizasyon tetikleyicileri kullanılacak.

## Non-Goals
- SQLite tablo yapısı — ADR-004 (SQLite Local Database).
- Senkronizasyon algoritmaları (çakışma çözümü, zaman damgası mantığı) — ADR-012 (Synchronization Strategy).
- API endpoint detayları — ileride teknik tasarım dokümanı.
- RLS politikaları — ADR-002 / ADR-011 (Security Strategy).
- Veritabanı şeması — Database Design Document (Future).

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-004 (SQLite Local Database) ile çelişmiyor.
- [x] ADR-007 (Entitlement & Premium) ile çelişmiyor.
- [x] ADR-012 (Synchronization Strategy) ile çelişmiyor.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-004 (SQLite Local Database)
- ADR-007 (Entitlement & Premium)
- ADR-012 (Synchronization Strategy)
