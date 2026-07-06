# ADR-011: Security Strategy

## Status
Accepted

## Context
- ADR-004: yerel veritabanı şifreleme kararı bu ADR'ye bırakılmıştı.
- ADR-007: Grace Period (entitlement offline toleransı) ve "signed entitlement cache" kavramları bu ADR'ye bırakılmıştı.
- ADR-009: offline oturum toleransının somut süresi/mekanizması bu ADR'ye bırakılmıştı.
- ADR-002: RLS politikaları ve IAP doğrulamasının güvenlik boyutu bu ADR ile koordineli olmalı.
- PROJECT_CHARTER.md Bölüm 12: içerik sızıntı riski (şifrelenmemiş yerel veritabanının çıkarılıp dağıtılması) açık bir risk olarak kayıtlı.

## Decision
Güvenlik, tek bir kontrol noktası değil, **katmanlı bir savunma (defense in depth)** olarak tasarlanır:

## Security Layers
```
User → Application → Authentication → Authorization → Entitlement → Database → Network → Infrastructure
```
Her katman, kendinden önceki katmanın güvenliğine güvenmez — her biri kendi güvenlik sorumluluğunu bağımsız olarak yerine getirir.

## Security State Machine
```
Anonymous → Authenticated → Authorized → Entitled → Access Granted
```
Bir kullanıcı, erişim izni verilmeden önce bu beş durumdan sırayla geçer; bir durum atlanamaz (örn. Authorized olmadan Entitled sayılamaz).

## Security Principles
- **Least Privilege:** Her bileşen/kullanıcı, yalnızca ihtiyaç duyduğu minimum yetkiye sahiptir.
- **Zero Trust:** Hiçbir istek, kaynağı ne olursa olsun varsayılan olarak güvenilir kabul edilmez.
- **Defense in Depth:** Tek bir güvenlik kontrolüne güvenilmez, katmanlar birbirini tamamlar.
- **Secure by Default:** Varsayılan yapılandırma her zaman en güvenli seçenektir.
- **Fail Secure:** Bir hata/arıza durumunda sistem "açık/izin verici" değil, "kapalı/kısıtlayıcı" tarafa düşer.
- **Principle of Least Knowledge:** Bir bileşen, işini yapmak için gerekmeyen bilgiye sahip olmaz.
- **Principle of Minimal Exposure:** Hassas veri/yüzey, gereğinden fazla açığa çıkarılmaz.

## Data Classification
| Sınıf | Örnek | Koruma Seviyesi |
|---|---|---|
| Public | Genel duyurular, ücretsiz içerik | Düşük |
| Internal | Uygulama yapılandırması | Orta |
| Sensitive | Kullanıcı ilerleme verisi, e-posta | Yüksek |
| Critical | Entitlement kaydı, kimlik doğrulama bilgisi, ödeme ile ilgili veri | En Yüksek |

## Trust Model
**Never Trust (asla güvenilmez):** İstemci, yerel depolama (Local Storage/SQLite), ağ, cihazın kendisi.
**Always Verify (her zaman doğrulanır):** Kimlik doğrulama durumu, entitlement, sunucu tarafı iş kuralları.

Bu model, ADR-002'deki "entitlement kontrolü istemci tarafına dayanmaz" ve ADR-007'deki "sunucu tek doğruluk kaynağıdır" kararlarının güvenlik çatısı altındaki genel ilkesidir.

## Data at Rest vs. Data in Transit
- **Data at Rest** (SQLite, ADR-004): şifrelenir. Somut şifreleme mekanizması implementasyon aşamasında, bu ADR'nin ilkeleriyle uyumlu şekilde seçilecektir (bkz. Architecture Notes).
- **Data in Transit:** İstemci-sunucu iletişimi her zaman şifreli bağlantı (TLS) üzerinden gerçekleşir.

## Cryptographic Agility
Kullanılan şifreleme yöntemleri, ileride değiştirilebilecek/yükseltilebilecek şekilde soyutlanır — bir şifreleme algoritmasına sıkı, değiştirilemez şekilde bağlı kalınmaz.

## Security by Isolation
Farklı güvenlik hassasiyetine sahip veriler (örn. Public içerik vs. Critical entitlement kaydı) birbirinden mantıksal/teknik olarak izole tutulur; bir katmandaki zafiyet diğerini otomatik olarak etkilememelidir.

## Secrets Policy
Gizli anahtarlar (API key, service role key, signing key) hiçbir zaman istemci koduna veya versiyon kontrolüne (git) gömülmez — detaylı politika Engineering Foundation'daki Security Baseline ve Secrets Management Strategy dokümanlarında tanımlıdır.

## Token Policy
Kimlik doğrulama token'ları (ADR-009) güvenli şekilde saklanır (platform native secure storage) ve süreleri sınırlıdır; süresi dolan token otomatik olarak yeniden doğrulama gerektirir.

## API Security
Sunucu API'leri (Supabase, ADR-002), RLS ve kimlik doğrulama katmanlarıyla korunur; hiçbir uç nokta, kimlik doğrulama/yetkilendirme kontrolünden geçmeden hassas veri döndürmez.

## Reverse Engineering Risks
Mobil uygulamanın decompile edilebilme riski kabul edilir; bu nedenle **hiçbir güvenlik kararı istemci kodunun gizliliğine dayanmaz** — tüm kritik kontroller (entitlement, içerik erişimi) sunucu tarafında doğrulanır.

## Logging / Error Handling / Audit Trail / Security Monitoring
- Loglar hassas veri (şifre, token, ödeme bilgisi) içermez.
- Hata mesajları, kullanıcıya iç sistem detayı sızdırmadan, güvenli şekilde gösterilir.
- Kritik işlemler (entitlement değişikliği, içerik yayınlama — ADR-006) audit trail ile izlenebilir tutulur.
- Güvenlik izleme (security monitoring) yaklaşımı, ölçek büyüdükçe genişletilebilir şekilde tasarlanır.

## Offline Session Tolerance (ADR-009 ile ilişki)
ADR-009'da tanımlanan offline oturum toleransının somut süresi ve doğrulama mekanizması, bu ADR'nin Trust Model ve Fail Secure ilkeleriyle uyumlu şekilde belirlenecektir — tolerans süresi, güvenlik riskini kabul edilebilir seviyede tutacak kadar kısa, kullanılabilirliği bozmayacak kadar makul olmalıdır. Somut değer implementasyon aşamasında netleştirilecektir.

## Alternatives Considered
| Yaklaşım | Değerlendirme |
|---|---|
| Tek katmanlı güvenlik (sadece kimlik doğrulama) | Defense in Depth ilkesiyle çelişir; bir katman aşılırsa sistemin tamamı açık kalır |
| İstemci tarafı güvenlik kontrolüne güvenme | Reverse Engineering riski nedeniyle güvenilmez; Trust Model'deki "Never Trust: Client" ilkesiyle çelişir |
| **Katmanlı, sunucu-merkezli, Zero Trust güvenlik modeli** | **Seçildi** |

## Consequences
- (+) Tek bir katmanın zafiyeti, sistemin tamamını açığa çıkarmaz.
- (+) Reverse engineering riski kabul edilip buna göre tasarlandığı için istemci kod gizliliğine bağımlılık yok.
- (-) Katmanlı güvenlik, her katmanın ayrı ayrı test/denetim gerektirmesi nedeniyle daha fazla operasyonel yük getirir.
- (-) Bazı güvenlik kararları (şifreleme mekanizması, offline tolerans süresi) implementasyon aşamasına bırakıldığı için bu ADR şu an için tam kapanmış değildir.

## Risks
| Risk | Açıklama |
|---|---|
| Şifreleme mekanizması netleşmeden veri sızıntısı | ADR-004'ten bırakılan şifreleme kararı gecikirse yerel veritabanı bir süre şifresiz kalabilir |
| Offline tolerans süresi yanlış kalibre edilirse | Çok uzun tolerans güvenlik açığı, çok kısa tolerans kullanılabilirlik sorunu yaratır |
| Audit trail eksikliği | Kritik işlemlerin izlenebilir olmaması, bir güvenlik olayının sonradan analiz edilmesini zorlaştırır |

## Mitigations
- Şifreleme mekanizması seçimi öncelikli bir implementasyon görevi olarak işaretlenecek.
- Offline tolerans süresi, güvenlik ve kullanılabilirlik dengesini gözeten bir değer olarak belirlenip, gerekirse gerçek kullanım verisiyle revize edilecek.
- Audit trail, en azından Critical veri sınıfındaki işlemler için MVP'den itibaren zorunlu tutulacak.

## Non-Goals
- Şifreleme algoritmasının somut seçimi (ADR-004'ten devralınan açık nokta) — implementasyon aşaması.
- RLS politikalarının SQL implementasyonu — Database Design Document (Future).
- **Grace Period'ın (ADR-007'de tanımlanan entitlement offline toleransı) somut süresi ve "signed entitlement cache" mekanizmasının teknik implementasyonu** — implementasyon aşamasında bu ADR'nin ilkeleriyle uyumlu olarak belirlenecektir.
- **ADR-009'da tanımlanan offline oturum toleransının somut süresi ve teknik doğrulama mekanizması** — implementasyon aşamasında bu ADR'nin ilkeleriyle uyumlu olarak belirlenecektir.
- Penetrasyon testi/güvenlik denetimi süreçleri — ileride operasyonel bir dokümanın konusu.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile çelişmiyor.
- [x] ADR-002 (Supabase + PostgreSQL) ile uyumlu.
- [x] ADR-004 (SQLite) ile uyumlu (şifreleme kararını devralıyor).
- [x] ADR-007 (Entitlement & Premium) ile uyumlu (Grace Period referansı açıkça tanındı).
- [x] ADR-009 (Authentication Strategy) ile uyumlu (offline oturum toleransı referansı açıkça tanındı).
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-002 (Supabase + PostgreSQL)
- ADR-004 (SQLite Local Database)
- ADR-007 (Entitlement & Premium)
- ADR-009 (Authentication Strategy)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- Gelecekte değerlendirilebilecek genişletmeler: Device Binding, Biometric Auth, Multi-Factor Authentication, Hardware-backed Keys, Certificate Rotation, Remote Kill Switch, Passkeys, FIDO2, WebAuthn, Device Attestation. Bunların hiçbiri MVP kapsamında değildir.
