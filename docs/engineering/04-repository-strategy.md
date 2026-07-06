# Engineering Foundation 04: Repository Strategy

## Status
Accepted

## Purpose
Kod tabanının kaç repoda, hangi mantıksal bölümlerle organize edileceğini tanımlamak — somut klasör ağacı değil, repo düzeyindeki stratejiyi belirler.

## 1. Monorepo Kararı
Proje **tek bir monorepo** içinde organize edilir. Kapsanan mantıksal bölümler:
- **Mobil uygulama** (React Native + Expo, ADR-001)
- **Admin panel / ECMS** (ADR-006)
- **Shared package(s)** (mobil ve admin arasında paylaşılan tip/yardımcı kod)
- **Supabase yapılandırması** (migration'lar, Edge Functions — ADR-002)
- **Dokümantasyon** (`/docs`)

**Neden monorepo?** Küçük ekip, tek bir versiyon geçmişi ve tek bir PR/review akışı içinde tüm parçaları (mobil, admin, backend config, docs) tutarlı tutmak istiyor; ayrı repolar arası senkronizasyon yükü (örn. shared type'ların ayrı paket olarak yayınlanması) MVP ölçeğinde gereksiz karmaşıklık (YAGNI).

## 2. Repository Boundary Rule
**Hiçbir bölüm, başka bir bölümün iç yapısına doğrudan bağımlı olamaz.** Bölümler arası paylaşım yalnızca:
- Shared package üzerinden (tip, sabit, yardımcı fonksiyon), veya
- Dokümante edilmiş bir arayüz (API sözleşmesi, ADR-002/ileride API Contract Blueprint) üzerinden yapılır.

Örneğin: mobil uygulama, admin panelin dosya yapısını veya iç kodunu bilmez/import etmez; ikisi sadece shared package ve Supabase API'si üzerinden dolaylı ilişkilidir.

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Ayrı repolar (mobil, admin, backend, docs) | Küçük ekip için senkronizasyon/versiyon yönetimi yükü yüksek; shared type paylaşımı ayrı paket yayınlama gerektirir |
| Tek repo, bölüm ayrımı olmadan (flat) | Repository Boundary Rule'u uygulamak zorlaşır, bağımlılıklar rastgele oluşabilir |
| **Monorepo, mantıksal bölümlerle + Boundary Rule** | **Seçildi** |

## Risks
| Risk | Açıklama |
|---|---|
| Sınır ihlali | Bir bölümün başka bir bölümün iç koduna doğrudan import yapması |
| Monorepo şişmesi | Zamanla tüm bölümlerin tek repoda büyümesi, build/CI sürelerini uzatabilir |

## Mitigations
- Repository Boundary Rule, Repository Folder Structure (Madde 5) ve Linting & Formatting Strategy (Madde 13, Import Rule Enforcement) ile teknik olarak desteklenir.
- Monorepo şişmesi riski MVP ölçeğinde düşük; büyüme izlenecek, gerekirse Engineering Foundation Madde 18 (CI/CD Strategy) kapsamında bölüm bazlı build optimizasyonu değerlendirilecek.

## Non-Goals
- Somut klasör ağacı — Repository Folder Structure (Madde 5) / Physical Folder Structure Blueprint.
- Paket yöneticisi/workspace aracı seçimi — Package Strategy Blueprint.

## Acceptance Criteria
- [x] ADR-001, ADR-002, ADR-006, ADR-010, ADR-011, ADR-013 ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; sadece strateji dokümante edildi.

## See Also
- ADR-001 (React Native + Expo)
- ADR-002 (Supabase + PostgreSQL)
- ADR-006 (Editorial CMS)
- Engineering Foundation 05 (Repository Folder Structure)
