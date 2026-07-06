# Implementation Blueprint 02: Physical Folder Structure Blueprint

## Status
Accepted

## Purpose
Repository Folder Structure'daki (Engineering Foundation Madde 5) organizasyon felsefesinin, somut (ama henüz oluşturulmamış) bir klasör ağacına nasıl karşılık geleceğini planlamak.

## 1. Üst Seviye Alanlar
Beş üst düzey alan planlanır:
- `apps/mobile` — mobil uygulama (ADR-001)
- `apps/admin` — admin panel / ECMS (ADR-006)
- `packages/` — shared package(s)
- `supabase/` — Supabase yapılandırması (migration, Edge Functions — ADR-002)
- `docs/` — dokümantasyon

## 2. Minimal Top-Level Prensibi
**Ayrı bir üst düzey `config/`, `assets/` veya `tests/` klasörü açılmaz** — bunlar YAGNI ilkesiyle (Coding Standards, Madde 5) her bir app/package'ın kendi içinde tutulur. Gereksiz üst düzey karmaşıklıktan kaçınılır.

## 3. `apps/mobile` İç Yapısı (Kavramsal)
ADR-010'daki Dependency Direction (UI → Application → State → Persistence → Backend), mobil app içindeki klasör katmanlarına yansır — somut klasör adları Implementation Blueprint'in sonraki aşamalarında (Repository Pattern, Application Layer, UI Layer Blueprint) netleşir.

## 4. `apps/admin` İç Yapısı (Kavramsal)
Admin panel, ADR-006'daki Editorial CMS iş akışını (Taslak → Uzman → Editör → Kalite Kontrol → Versiyonlama → Yayınlama) yansıtacak şekilde organize edilecektir; somut teknoloji/yapı henüz kararlaştırılmadı (ADR-006 Non-Goals).

## 5. `packages/` Sınırı
Shared package(s), Repository Boundary Rule'un (Repository Strategy, Madde 4) fiziksel karşılığıdır — sadece gerçekten paylaşılan domain type'ları, sabitler ve yardımcı fonksiyonlar burada yer alır.

## 6. `supabase/` İç Yapısı (Kavramsal)
Migration dosyaları ve Edge Functions, uygulama kodundan ayrı, kendi başına yönetilebilir bir alanda tutulur.

## 7. `docs/` İç Yapısı
Bu blueprint dizisinin sonunda (Architecture Export aşamasında) doldurulacak yapı: `PROJECT_CHARTER.md`, `architecture/` (Freeze + ADR'ler), `engineering/`, `implementation-blueprint/`.

## 8. Dependency Direction'ın Fiziksel Yansıması
Klasör derinliği/hiyerarşisi, bağımlılık yönünü yansıtır — bir alt katman klasörü asla üst katman klasörünü import etmeyecek şekilde tasarlanır.

## 9. Import Rules İlişkisi
Hangi klasörün hangisini import edebileceği, Linting & Formatting Strategy (Madde 13) kapsamında otomatik denetime hazır şekilde planlanır.

## 10. Supabase/Docs Ayrımının Netliği
`supabase/` ve `docs/`, uygulama koduyla asla karışmaz; her biri kendi başına anlaşılır ve bağımsız bir alandır.

## 11. Config Dosyalarının Konumu
Her app/package, kendi yapılandırma dosyalarını (örn. Expo yapılandırması, TypeScript yapılandırması) kendi kök dizininde tutar; Minimal Top-Level Prensibi'yle (Madde 2) tutarlı olarak ayrı bir üst düzey `config/` klasörü açılmaz.

## 12. Asset Dosyalarının Konumu
Görsel/medya varlıkları (ikon, illüstrasyon — Design System Blueprint), her app'in kendi içinde, ihtiyaç duyan koda yakın tutulur; ayrı bir üst düzey `assets/` klasörü açılmaz.

## 13. Test Dosyalarının Konumu
Testler, test ettikleri kodun yanında (co-located) veya ilgili app/package'ın kendi içinde tutulur; ayrı bir üst düzey `tests/` klasörü açılmaz (Testing Strategy, Engineering Foundation Madde 15 ile ilişkili).

## 14. Shared Package İç Yapısı
`packages/` içindeki paylaşılan kod, kendi içinde tür bazlı bir ayrıma sahip olabilir (örn. domain type'ları, sabitler, yardımcı fonksiyonlar); ancak bu iç ayrım, Repository Boundary Rule'u (Repository Strategy, Madde 4) genişletmez — sadece paylaşılan kodun kendi içindeki organizasyonudur.

## 15. Versiyonlama İçi Paketler
Shared package(s), monorepo içinde ayrı bir npm sürümü olarak yayınlanmaz; workspace içi doğrudan referansla kullanılır. Somut mekanizma Package Strategy Blueprint'te ele alınır.

## 16. Klasör İsimlendirme Tutarlılığı
Klasör isimleri, Naming Conventions'daki (Engineering Foundation Madde 12) felsefeyle tutarlı olacak şekilde, anlaşılır ve tutarlı bir kalıp izler; somut case-style kararı implementasyon aşamasında netleşir.

## 17. Klasör Derinliği Felsefesi
Gereğinden fazla iç içe geçmiş (deeply nested) bir klasör yapısından kaçınılır; bir dosyayı bulmak için gereksiz sayıda klasör açılması, YAGNI ilkesiyle (Coding Standards, Madde 5) tutarlı olarak önlenir.

## 18. Scripts / Tooling Alanı İlişkisi
Repository Strategy'de (Madde 4) ayrı bir üst düzey alan olarak tanımlanmayan scripts/tooling ihtiyaçları (örn. build/otomasyon script'leri), ilgili app/package'ın kendi içinde veya kök seviyedeki tooling yapılandırmasının (Package Strategy Blueprint, Root Package Responsibility) bir parçası olarak tutulur.

## 19. Klasör Sahipliği (Folder Ownership)
Her üst düzey alanın (`apps/mobile`, `apps/admin`, `packages/`, `supabase/`, `docs/`) bir sorumlusu olması beklenir — bu, diğer blueprint'lerde tekrarlanan Ownership ilkesinin klasör seviyesindeki karşılığıdır.

## 20. Klasör Yapısı Değişiklik Politikası
Bu blueprint'te onaylanan yapıda bir değişiklik gerekirse (örn. yeni bir üst düzey alan ihtiyacı), bu değişiklik sessizce yapılmaz; Documentation Strategy'deki (Engineering Foundation Madde 14) Review/Update Rule'a tabi olarak, gerekçeli şekilde bu dokümana yansıtılır.

## 21. AI Generated Folder Suggestion Review
AI tarafından önerilen bir klasör yapısı değişikliği/yeni klasör de insan review'undan geçer (Git Workflow, Madde 10 ile tutarlı) — özellikle Minimal Top-Level Prensibi'nin (Madde 2) ihlal edilip edilmediği kontrol edilir.

## 22. Folder Structure Review Rule Uygulaması
Bu blueprint, Repository Folder Structure'daki (Madde 5) Folder Structure Review Rule'un fiilen uygulanmasıdır — somut ağaç burada onaylanmıştır, ama fiziksel oluşturma yine Mode Transition'a bağlıdır.

## Risks
| Risk | Açıklama |
|---|---|
| Üst düzey klasör şişmesi | Zamanla gereksiz üst düzey klasörlerin eklenmesi |
| Katman sınırı ihlali | `apps/mobile` içindeki katmanların birbirine yanlış yönde bağımlı olması |

## Mitigations
- Minimal Top-Level Prensibi (Madde 2), üst düzey şişmeyi önler.
- Dependency Direction'ın Fiziksel Yansıması (Madde 8) ve Import Rules (Madde 9), katman sınırını korur.

## Non-Goals
- Somut dosya adları/içerikleri.
- Paket yöneticisi/workspace yapılandırması — Package Strategy Blueprint.
- Fiziksel klasör oluşturma (Mode Transition'a bağlı).

## Acceptance Criteria
- [x] Repository Strategy ve Repository Folder Structure ile uyumlu.
- [x] ADR-001, ADR-002, ADR-006, ADR-010 ile çelişmiyor.
- [x] Hiçbir klasör fiilen oluşturulmadı.

## See Also
- Engineering Foundation 04 (Repository Strategy)
- Engineering Foundation 05 (Repository Folder Structure)
- Implementation Blueprint 03 (Package Strategy)
