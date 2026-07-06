# Engineering Foundation 05: Repository Folder Structure

## Status
Accepted

## Purpose
Repository Strategy (Madde 4)'te kararlaştırılan monorepo bölümlerinin, hangi organizasyon felsefesiyle klasörlere yansıyacağını tanımlamak — **somut klasör adı/ağacı bu dokümanın kapsamı dışındadır** (bkz. Physical Folder Structure Blueprint).

## 1. Top-Level Bölümler
Repository Strategy'deki (Madde 4) beş mantıksal bölüm (mobil app, admin panel, shared package(s), Supabase config, docs), üst seviyede birbirinden ayrı, açıkça tanımlanmış klasörlere karşılık gelir.

## 2. Mobil App'in ADR-010 Katman Yansıması
Mobil uygulama klasör yapısı, ADR-010'daki Dependency Direction'ı (UI → Application → State → Persistence → Backend) klasör seviyesinde yansıtacak şekilde organize edilir — bu, bir geliştiricinin klasör yapısına bakarak mimari katmanı tahmin edebilmesini sağlar.

## 3. Shared Package Sınırı
Shared package(s), Repository Boundary Rule'un (Madde 4) somut bir uygulamasıdır — sadece gerçekten paylaşılan (tip, sabit, yardımcı fonksiyon) kod burada yer alır; bir bölüme özel kod asla shared package'a taşınmaz.

## 4. Supabase / Docs Ayrımı
Supabase yapılandırması (migration, Edge Functions) ve dokümantasyon (`/docs`), uygulama koduyla karışmayan, kendi başına anlaşılır klasörlerdedir.

## 5. Dependency Direction
Klasör yapısı, bağımlılık yönünü (üst katman alt katmanı bilir, tersi değil) fiziksel olarak da yansıtır — bir alt katman klasörü, üst katman klasörüne import içermez.

## 6. Import Rules
Hangi klasörün hangi klasörden import edebileceği açık kurallara bağlanır; bu kurallar Linting & Formatting Strategy (Madde 13) kapsamında otomatik olarak denetlenmesi hedeflenir.

## 7. Folder Structure Review Rule
**Somut klasör ağacı oluşturulmadan önce, ayrı bir inceleme turu yapılması şarttır** — bu doküman felsefeyi tanımlar, uygulanacak somut ağaç Physical Folder Structure Blueprint'te (Implementation Blueprint aşaması) ayrıca onaylanır.

## Risks
| Risk | Açıklama |
|---|---|
| Katman karışıklığı | Klasör yapısının ADR-010'daki katmanları doğru yansıtmaması |
| Shared package'ın "her şeyin çöplüğü" olması | Bölüme özel kodun rahatlık için shared package'a taşınması |

## Mitigations
- Katman karışıklığı riski, Folder Structure Review Rule (Madde 7) ile MVP koda geçmeden önce ayrıca doğrulanır.
- Shared package disiplini, Import Rules (Madde 6) ve code review ile korunur.

## Non-Goals
- Somut klasör adları/ağacı — Physical Folder Structure Blueprint.
- Paket yöneticisi/workspace yapılandırması — Package Strategy Blueprint.

## Acceptance Criteria
- [x] Repository Strategy (Madde 4) ve ADR-010 ile uyumlu.
- [x] Kod/dosya/klasör oluşturulmadı; sadece felsefe dokümante edildi.

## See Also
- Engineering Foundation 04 (Repository Strategy)
- ADR-010 (State Management & Server State)
