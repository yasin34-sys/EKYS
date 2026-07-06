# ADR-012: Synchronization Strategy

## Status
Accepted

## Context
- ADR-003: Offline First mimarisi, senkronizasyonun genel prensiplerini tanımladı, teknik algoritmayı bu ADR'ye bıraktı.
- ADR-004: yerel veri (SQLite) ile sunucu (PostgreSQL) arasındaki uyumu sağlayacak bir mekanizma gerekiyor.
- ADR-007/ADR-009: entitlement ve kimlik doğrulama verisinin senkronizasyon önceliği yüksek olmalı.
- ADR-008: Learning Engine, hem yerel hem (gerekiyorsa) senkronize edilmiş veriyle çalışabilmeli.
- ADR-010: State Management katmanındaki Server State (TanStack Query), senkronizasyonun istemci tarafı yansımasıdır.

## Decision
## Sync Scope
Her veri senkronize edilmez. Senkronize edilen ve edilmeyen veri açıkça ayrılır — **Local-only UI state (ADR-010, Zustand) hiçbir zaman senkronize edilmez.**

## Source of Truth
Sunucu (PostgreSQL/Supabase) sistemin otoritatif veri kaynağıdır (ADR-003 ile tutarlı).

## Data Categories
| Kategori | Örnek | Senkronizasyon Yönü |
|---|---|---|
| Server Authoritative | Entitlement, içerik meta verisi | Server → Client |
| Client Generated | Attempt (çözüm kaydı), Exam Session | Client → Server |
| Derived | Learning Metrics, Repeat Pool | Hesaplanabilir, senkronizasyonu ikincil öncelik |
| Static Package Content | İndirilen paket içeriği | Server → Client (ADR-005) |
| Local-only UI State | Modal açık/kapalı, form taslağı | Senkronize edilmez |

## Conflict Strategy
Çakışma çözümü **timestamp bazlı "Last-Write-Wins" (son yazan kazanır)** ilkesiyle, deterministik şekilde yapılır. Bu, MVP ölçeği için uygun, basit ve öngörülebilir bir yaklaşımdır (PROJECT_CHARTER.md'de daha önce informal olarak benimsenen yaklaşımın bu ADR ile resmî hâle gelmesidir).

## Idempotency
Senkronizasyon işlemleri **idempotent** olacak şekilde tasarlanır — aynı senkronizasyon isteği birden fazla kez gönderilse bile (örn. ağ kesintisi sonrası tekrar deneme), sonuç değişmez; veri tekrarlanmaz veya bozulmaz.

## Sync Atomicity
Birden fazla veri parçasını içeren bir senkronizasyon işlemi, tutarlı bir birim olarak ele alınır; işlemin bir kısmı başarılı bir kısmı başarısız kalan bir ara durumda bırakılmaz.

## Sync Priority
| Öncelik | Veri |
|---|---|
| High | Authentication, Entitlement |
| Medium | Kullanıcı ilerleme verisi (Attempt, Exam Session) |
| Low | Analytics, türetilmiş metrikler |

## Sync State Machine
```
Idle → Pending → Synchronizing → Success / Retry → Failed
```

## Sync Version Compatibility
Senkronizasyon protokolü, istemci ve sunucu farklı sürümlerde olsa bile (örn. kullanıcı henüz güncellememiş bir uygulama sürümü kullanıyorsa) temel işlevselliği bozmayacak şekilde geriye uyumlu tasarlanır.

## Queue Model
Offline'da üretilen veri (Client Generated Data) bir kuyrukta biriktirilir; bağlantı geldiğinde bu kuyruk sırayla işlenir.

## Failure Handling
Senkronizasyon başarısız olursa, veri kaybolmaz — kuyrukta/yerelde tutulmaya devam eder ve yeniden denenir (Retry). Kısmi başarısızlıklar (bazı öğeler başarılı, bazıları değil) açıkça yönetilir.

## Observability
Kullanıcıya (gerektiğinde) şu bilgiler sunulabilir: Last Sync Time (son senkronizasyon zamanı), Sync Status (durum), Pending/Failed Operations (bekleyen/başarısız işlemler).

## Data Loss Prevention
Kritik kullanıcı verisi (çözüm geçmişi, entitlement ile ilgili işlemler), senkronize olana kadar yerelde kalıcı olarak saklanır; hiçbir senkronizasyon hatası bu veriyi sessizce kaybetmez.

## Multi-Device Impact
Aynı kullanıcının birden fazla cihazda aktif olması durumunda, Last-Write-Wins stratejisi geçerlidir; PROJECT_CHARTER.md Bölüm 12'deki varsayımla tutarlı olarak, eşzamanlı çoklu cihaz kullanımı MVP'de yaygın bir senaryo olarak tasarlanmamıştır.

## Learning Engine Relationship
Learning Engine (ADR-008), öncelikle yerel (senkronize olmamış dahil) veriyle çalışır — analiz sonuçlarının doğruluğu, senkronizasyonun tamamlanmasını beklemez.

## Alternatives Considered
| Yaklaşım | Değerlendirme |
|---|---|
| Manuel çakışma çözümü (kullanıcıya sorma) | MVP ölçeğinde gereksiz UX karmaşıklığı; PROJECT_CHARTER.md'nin basitlik ilkesiyle uyumsuz |
| Operational Transformation / CRDT tabanlı çakışma çözümü | MVP ölçeğinde gereksiz mühendislik karmaşıklığı (YAGNI); çoklu cihaz eşzamanlı düzenleme senaryosu MVP'de yok |
| **Timestamp bazlı Last-Write-Wins** | **Seçildi** — basit, deterministik, MVP ölçeğine uygun |

## Consequences
- (+) Basit, deterministik, anlaşılması ve test edilmesi kolay bir çakışma çözümü.
- (+) Idempotency ve Queue Model, ağ kesintilerine karşı dayanıklılık sağlıyor.
- (-) Last-Write-Wins, nadiren de olsa (eşzamanlı çoklu cihaz kullanımı gibi) bir tarafın verisinin sessizce "kaybolmasına" (üzerine yazılmasına) yol açabilir.
- (-) Sync Priority ve Data Categories'in doğru uygulanması, her yeni veri türü eklendiğinde bu ADR'ye karşı gözden geçirilmesini gerektiriyor.

## Risks
| Risk | Açıklama |
|---|---|
| Last-Write-Wins veri kaybı | Nadir çoklu cihaz senaryolarında bir tarafın verisi üzerine yazılabilir |
| Idempotency ihlali | Yanlış implementasyon, tekrar gönderilen bir isteğin veri tekrarına yol açmasına neden olabilir |
| Kuyruk şişmesi | Uzun süreli offline kullanımda kuyruktaki bekleyen işlem sayısı büyüyebilir |
| Versiyon uyumsuzluğu | Eski istemci sürümleri yeni sunucu protokolüyle uyumsuz kalabilir |

## Mitigations
- Last-Write-Wins riski, PROJECT_CHARTER.md'deki "eşzamanlı çoklu cihaz kullanımı yaygın değil" varsayımıyla MVP ölçeğinde kabul edilebilir kılınmıştır; büyüme sonrası yeniden değerlendirilebilir.
- Idempotency, her senkronizasyon isteğinin benzersiz bir tanımlayıcı taşımasıyla (implementasyon detayı) garanti edilecek.
- Kuyruk şişmesi riski, sık senkronizasyon tetikleyicileriyle (ADR-003) azaltılır.
- Versiyon uyumsuzluğu riski, Sync Version Compatibility ilkesinin her protokol değişikliğinde kontrol edilmesiyle azaltılır.

## Non-Goals
- Senkronizasyon protokolünün somut API/endpoint tasarımı — ileride teknik tasarım dokümanı.
- Delta/incremental sync, push-triggered sync, event-driven sync mekanizmaları (bkz. Architecture Notes).
- Veritabanı şeması — Database Design Document (Future).

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-003 (Offline First) ile uyumlu — genel prensipleri somutlaştırıyor.
- [x] ADR-007/ADR-009 (Entitlement/Authentication) ile uyumlu — Sync Priority'de High olarak işaretlendi.
- [x] ADR-008 (Learning Engine) ile çelişmiyor.
- [x] ADR-010 (State Management) ile uyumlu.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-003 (Offline First Architecture)
- ADR-004 (SQLite Local Database)
- ADR-007 (Entitlement & Premium)
- ADR-008 (Rule Based Learning Engine)
- ADR-009 (Authentication Strategy)
- ADR-010 (State Management & Server State)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- Gelecekte değerlendirilebilecek genişletmeler: Delta Sync (yalnızca değişen alanları gönderme), Push-triggered Sync, Event-driven Sync. Bunların hiçbiri MVP kapsamında değildir; mevcut Queue/Retry modeliyle çelişmezler, sadece verimlilik artışı sağlayabilirler.
