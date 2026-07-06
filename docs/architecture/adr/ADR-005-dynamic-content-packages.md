# ADR-005: Dynamic Content Packages

## Status
Accepted

## Context
- İçerik paketleri asla uygulama binary'sine gömülmemeli, her zaman sunucudan dinamik dağıtılmalıdır (PROJECT_CHARTER.md, Ek Notlar).
- İçerik sürekli büyüyecek ve güncellenecektir; yazılım geliştirme süreci içerik üretim sürecini beklemeyecektir (PROJECT_CHARTER.md, Bölüm 13).
- MVP kapsamında zorluk seviyesi (Kolay/Orta/Zor) ve paket tipi (Temel Çalışma/Yoğun Tekrar/Zorlayıcı Deneme) bazlı bir içerik yapısı tanımlanmıştır (PROJECT_CHARTER.md, Bölüm 9).
- Entitlement modelinin paket bazlı haklar üzerine kurulması gerekiyor (PROJECT_CHARTER.md, Bölüm 8; Ek Notlar).
- Offline-first mimari (ADR-003) gereği, paket indirildikten sonra tüm işlemler cihazda, SQLite üzerinde (ADR-004) çalışır.
- Mevzuat güncellemesi gibi durumlarda içeriğin hızlı ve mağaza incelemesine bağlı olmadan güncellenebilmesi gerekiyor (PROJECT_CHARTER.md, Bölüm 12).

## Decision
- İçerik, **Dynamic Content Package** birimleri hâlinde sunucudan (Supabase Storage/API, ADR-002) dağıtılacaktır — hiçbir soru/paket uygulama binary'sine gömülmeyecektir.
- Her paket bir **versiyon numarası** taşıyacaktır.
- İstemci, bağlantı olduğunda mevcut paket versiyonlarını sunucuyla karşılaştırır (ADR-003'teki Synchronization Principles ile aynı mekanizma); yeni/güncel bir paket varsa kullanıcıya bildirilir ve indirilebilir hâle gelir.
- **Bir paket güncellendiğinde yalnızca ilgili paket güncellenir; diğer paketler yeniden indirilmez.** Bu yaklaşım bant genişliği kullanımını azaltır ve kullanıcı deneyimini iyileştirir.
- Paket indirme sonrası, bir **bütünlük doğrulaması** (checksum/hash tabanlı) yapılacaktır; doğrulama başarısız olursa paket bozuk kabul edilip yeniden indirilecektir.
- Paket erişimi **entitlement modeliyle (ADR-007)** ilişkilendirilir: kullanıcının hangi paketlere erişebileceği sunucu tarafında (RLS, ADR-002) kontrol edilir — istemci sadece erişim hakkı olan paketleri indirip açabilir.
- İndirilen paket içeriği **SQLite'a (ADR-004)** yazılır; paket, yerel veritabanının veri kaynağı birimidir.
- Bu mimarinin doğal sonucu: **yeni soru/paket eklemek veya güncellemek için App Store/Play Store güncellemesi gerekmez.**

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| İçeriği uygulama binary'sine gömme (static bundling) | Her içerik değişikliği mağaza güncellemesi/inceleme süreci gerektirir; PROJECT_CHARTER.md Ek Notlar ile doğrudan çelişir |
| Her soruyu tek tek API'den çekme (paketsiz, granüler) | Offline-first mimariyle (ADR-003) uyumsuz; senkronizasyon/versiyon kontrolü soru bazında çok karmaşıklaşır |
| Tüm içeriği tek seferde, tek parça indirme (monolitik paket) | Kullanıcı ihtiyacı olmayan içeriği de indirmek zorunda kalır; paket bazlı entitlement modeliyle uyumsuz; her güncellemede tüm içerik yeniden inmesi gerekir |
| **Dynamic Content Packages (versiyonlu, parçalı, sunucudan dinamik dağıtılan)** | **Seçildi** |

## Consequences
- (+) Yeni soru/paket eklemek mağaza güncellemesi gerektirmez.
- (+) Kullanıcı sadece ihtiyacı/erişim hakkı olan paketleri indirir.
- (+) Sadece güncellenen paket yeniden indirilir — bant genişliği tasarrufu.
- (+) Mevzuat güncellemesi hızlı şekilde dağıtılabilir.
- (+) Entitlement modeliyle doğal uyum (paket bazlı erişim kontrolü).
- (-) Paket versiyonlama, indirme ve bütünlük doğrulama için ayrı bir istemci-sunucu protokolü yönetilmesi gerekir.
- (-) Paket çeşitliliği (zorluk seviyesi × paket tipi) arttıkça paket organizasyonu karmaşıklaşabilir.

## Risks
| Risk | Açıklama |
|---|---|
| Bozuk/kısmi indirme | Ağ kesintisi paketin yarım inmesine, bozuk veriye yol açabilir |
| Versiyon uyumsuzluğu | Kullanıcı eski paket versiyonunu offline kullanırken sunucuda yeni versiyon yayınlanmış olabilir (ADR-003 ile ortak risk) |
| Entitlement kontrolünün atlatılması | Paket indirme uç noktası doğru korunmazsa erişim hakkı olmayan kullanıcı pakete ulaşabilir |
| Paket şişmesi | Paket sayısı/boyutu arttıkça depolama ve indirme süresi kullanıcı deneyimini olumsuz etkileyebilir |

## Mitigations
- Paket bütünlüğü checksum/hash doğrulaması ile kontrol edilir.
- Bozuk veya eksik paketler yeniden indirilir.
- Paket versiyonları senkronizasyon sırasında kontrol edilir.
- Entitlement doğrulaması yalnızca sunucu tarafında yapılır.
- Paket boyutları ve organizasyonu MVP ölçeğinde kontrollü tutulur.
- Gelecekte ölçek ihtiyacı doğarsa **Scalability Design Document (Future)** kapsamında değerlendirilir.

## Non-Goals
- Paket formatının detaylı JSON/SQL şeması.
- Paket import mekanizması.
- Checksum algoritmasının seçimi.
- Editorial CMS iş akışı.
- Entitlement'ın teknik implementasyonu.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile çelişmiyor.
- [x] ADR-001 (React Native + Expo) ile çelişmiyor.
- [x] ADR-002 (Supabase + PostgreSQL) ile çelişmiyor.
- [x] ADR-003 (Offline First) ile uyumlu.
- [x] ADR-004 (SQLite) ile uyumlu.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-002 (Supabase + PostgreSQL)
- ADR-003 (Offline First Architecture)
- ADR-004 (SQLite Local Database)
- ADR-006 (Editorial CMS)
- ADR-007 (Entitlement & Premium)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- Paket bütünlük doğrulaması için yaygın kullanılan hash algoritmaları (örn. SHA-256) değerlendirilebilir; somut seçim PO/CTO ile birlikte, Content Package Specification hazırlanırken yapılacaktır.
- İleride delta (yalnızca değişen içerik) güncellemeleri değerlendirilebilir. Ancak MVP kapsamında tam paket güncellemesi yeterli görülmektedir. Bu bir öneridir, karar değildir.
