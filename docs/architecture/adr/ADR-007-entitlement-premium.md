# ADR-007: Entitlement & Premium

## Status
Accepted

## Context
- PROJECT_CHARTER.md Bölüm 8: MVP'de tek seferlik satın alma, ömür boyu erişim (abonelik yok); paywall motive edici olmalı.
- PROJECT_CHARTER.md Ek Notlar: kullanıcı → paket bazlı haklar (entitlement) veri modeli, tek SKU'dan hibrit modele geçişe izin verecek şekilde esnek tasarlanmalı.
- ADR-002: entitlement kontrolü istemci tarafında değil, veritabanı seviyesinde (RLS) yapılacak; IAP doğrulaması sunucu tarafında olacak.
- ADR-005: paket erişimi entitlement modeliyle ilişkilendirilir.
- ADR-003/ADR-009: offline çalışma ve anonim/misafir kullanım senaryolarında entitlement'ın nasıl davranacağı netleşmeli.

## Decision
- Entitlement, **kullanıcı → paket bazlı haklar** şeklinde modellenir; MVP'de tek/evrensel bir Premium hakkı sunulsa da veri modeli paket bazlı esnekliğe izin verir (PROJECT_CHARTER.md Ek Notlar ile tam uyumlu).
- Entitlement'ın **tek doğruluk kaynağı (source of truth) sunucudur.** İstemci hiçbir zaman kendi başına entitlement üretemez veya değiştiremez.
- IAP doğrulaması sunucu tarafında yapılır; istemci beyanı tek başına entitlement vermez (ADR-002 ile tutarlı).
- Restore Purchases (satın alımları geri yükleme) desteklenir; bu, entitlement'ın cihaza değil **hesaba bağlı** olmasının doğal sonucudur.
- Offline kullanım sırasında entitlement kontrolü için bir **Grace Period (tolerans süresi)** prensibi benimsenir: kullanıcı offline'ken, son doğrulanmış entitlement durumu geçerliliğini bir süre korur. Somut süre implementasyon aşamasında belirlenecektir (öneri niteliğinde, bkz. Architecture Notes).

## Source of Truth Hierarchy
```
Apple / Google (satın alma olayının gerçek kaynağı)
   → Server (entitlement'ın doğrulanmış, kalıcı kaydı)
      → Client (yerel, offline kullanım için "çalışma kopyası")
```
- **Apple/Google:** Bir satın alma işleminin gerçekten olup olmadığının nihai kaynağı.
- **Server:** Apple/Google'dan doğrulanan satın almanın kalıcı, sorgulanabilir kaydı; RLS ile korunur.
- **Client:** Sunucudan senkronize edilen, offline kullanım için geçerli olan **yerel bir kopya** — asla bağımsız bir doğruluk kaynağı değildir.

## Content vs. Entitlement Independence
İçerik (paketler, ADR-005) ile entitlement (kullanıcının o içeriğe erişim hakkı) **birbirinden bağımsız veri kategorileridir.** Bir paketin var olması, kullanıcının ona erişebileceği anlamına gelmez; erişim her zaman ayrı bir entitlement kaydına bağlıdır. Bu ayrım, gelecekte paket bazlı/promosyonel/kurumsal lisans gibi modellerin, içerik modelini değiştirmeden eklenebilmesini sağlar.

## Restore Purchases
- Kullanıcı, hesabıyla giriş yaptığı herhangi bir cihazda "Satın Alımları Geri Yükle" işlemini gerçekleştirebilir.
- Bu işlem, Apple/Google'daki satın alma geçmişini sunucudaki entitlement kaydıyla yeniden eşler.
- Entitlement'ın hesaba bağlı olması (cihaza değil), bu işlemi doğal ve güvenilir kılar.

## Grace Period (Offline Tolerance)
- Kullanıcı offline durumdayken, cihazındaki en son doğrulanmış entitlement bilgisi kullanılmaya devam eder.
- Bu tolerans süresiz değildir; bir noktada yeniden sunucu doğrulaması gerekir.
- **Somut süre ve teknik mekanizma bu ADR'nin kapsamı dışındadır** — güvenlik boyutuyla birlikte **ADR-011 (Security Strategy)** kapsamında ayrıca netleştirilecektir (bkz. Non-Goals).

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Cihaz bazlı entitlement | Restore Purchases ve çoklu cihaz senaryolarını doğal desteklemiyor; kullanıcı cihaz değiştirince erişimini kaybeder |
| İstemci tarafı entitlement doğrulama (yalnızca receipt kontrolü, sunucu doğrulaması yok) | Hızlı ama güvenilmez; crack/sahte receipt riski yüksek; ADR-002'nin "istemci tarafı kontrolüne dayanmaz" ilkesiyle çelişir |
| Abonelik modeli | PROJECT_CHARTER.md Bölüm 8'deki tek seferlik/ömür boyu erişim kararıyla doğrudan çelişir |
| **Hesap bazlı, sunucu doğrulamalı, paket bazlı esnek entitlement modeli** | **Seçildi** |

## Consequences
- (+) Restore Purchases ve çoklu cihaz kullanımı doğal olarak desteklenir.
- (+) Sunucu tarafı doğrulama, sahte/crack entitlement riskini azaltır.
- (+) Paket bazlı veri modeli, gelecekte hibrit/promosyonel lisanslama modellerine geçişi kolaylaştırır.
- (-) Offline entitlement kontrolü için bir tolerans (Grace Period) mekanizması gerekir — bu, ek bir güvenlik/tasarım kararı gerektirir (ADR-011'e bırakıldı).
- (-) Sunucu bağımlılığı: entitlement doğrulaması tamamen offline yapılamaz, en azından periyodik senkronizasyon gerekir.

## Risks
| Risk | Açıklama |
|---|---|
| Offline entitlement kötüye kullanımı | Grace Period süresi çok uzun tutulursa süresi geçmiş/iptal edilmiş bir entitlement offline'da uzun süre geçerli kalabilir |
| Sahte receipt/IAP dolandırıcılığı | Sunucu doğrulaması atlatılmaya çalışılabilir |
| Restore Purchases karmaşıklığı | Farklı platformlarda (iOS/Android) satın alma geçmişinin doğru eşlenmesi teknik karmaşıklık taşır |
| Paket bazlı modelin MVP'de gereksiz karmaşıklık yaratması | Esnek veri modeli, basit "tek Premium" senaryosunu gereksiz yere karmaşıklaştırabilir |

## Mitigations
- Grace Period süresi, güvenlik riskini kabul edilebilir seviyede tutacak şekilde belirlenecek; bu karar ADR-011 kapsamında güvenlik uzmanlığıyla netleştirilecek.
- IAP doğrulaması yalnızca sunucu tarafında, platformun resmi doğrulama API'leri üzerinden yapılacak.
- Restore Purchases akışı, platform bazlı farklılıklar için ayrı test senaryolarıyla doğrulanacak.
- Paket bazlı veri modeli MVP'de tek bir "evrensel Premium paketi" ile basitleştirilerek kullanılacak; karmaşıklık sadece veri modelinde saklı kalacak, kullanıcı deneyiminde görünmeyecek.

## Non-Goals
- Grace Period'ın somut süresi ve teknik doğrulama mekanizması — ADR-011 (Security Strategy).
- IAP sağlayıcısının seçimi (RevenueCat vs. doğrudan platform API) — henüz kararlaştırılmadı (bkz. Architecture Notes).
- RLS politikalarının SQL implementasyonu — Database Design Document (Future) / ADR-011.
- Fiyatlandırma, kampanya/indirim mantığı.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu (tek seferlik/ömür boyu erişim, esnek paket bazlı model).
- [x] ADR-002 (Supabase + PostgreSQL) ile uyumlu (sunucu tarafı doğrulama, RLS).
- [x] ADR-003 (Offline First) ile uyumlu (Grace Period prensibi).
- [x] ADR-005 (Dynamic Content Packages) ile uyumlu (Content vs. Entitlement Independence).
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-002 (Supabase + PostgreSQL)
- ADR-003 (Offline First Architecture)
- ADR-005 (Dynamic Content Packages)
- ADR-009 (Authentication Strategy)
- ADR-011 (Security Strategy)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- IAP sağlayıcı olarak RevenueCat gibi bir üçüncü parti çözüm, platform bazlı receipt doğrulama karmaşıklığını azaltabilir; alternatif olarak Apple/Google'ın doğrudan sunucu API'leri kullanılabilir. Nihai seçim PO/CTO ile birlikte yapılacaktır.
- Gelecekte değerlendirilebilecek genişletme senaryoları: paket bazlı lisans, promosyonel lisans, kurumsal/toplu lisans, hediye Premium, aile paylaşımı, farklı sınavlar için ayrı entitlement (ADR-013 ile ilişkili). Bunların hiçbiri MVP kapsamında değildir.
