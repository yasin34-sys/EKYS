# Engineering Foundation 17: Versioning Strategy

## Status
Accepted

## Purpose
Uygulama versiyonlamasının felsefesini tanımlamak — bu, ADR-005'teki içerik paketi versiyonlaması veya ADR-012'deki sync protokol versiyonlamasından **bağımsız** bir kavramdır.

## 1. Application Version vs. Build Number
Kullanıcıya görünen "uygulama sürümü" (örn. Semantic Versioning tarzı) ile her derlemeye atanan "build numarası" birbirinden ayrı kavramlardır; ikisi farklı amaçlara hizmet eder.

## 2. Semantic Versioning Felsefesi
Sürüm numaralandırması, değişikliğin niteliğini (uyumsuz/breaking, yeni özellik, düzeltme) yansıtacak bir mantığa dayanır. **Somut sürüm numarası/format kararı bu dokümanın kapsamı dışındadır.**

## 3. İçerik/Sync Versiyonlamasından Bağımsızlık
Bu doküman **uygulama** versiyonlamasını ele alır. İçerik paketi versiyonlaması (ADR-005) ve sync protokol versiyon uyumluluğu (ADR-012, Sync Version Compatibility) ayrı, bağımsız kavramlardır — bir uygulama sürüm numarası değişmeden içerik paketleri güncellenebilir (bu, ADR-005'in temel amacıdır).

## 4. Breaking Change / Backward Compatibility
Uygulama sürümünde geriye uyumsuz bir değişiklik (örn. eski verinin okunamaz hâle gelmesi), açıkça işaretlenir ve migration'la (ADR-004, Madde: Migration'lar backward compatible) desteklenir.

## 5. Hotfix Versioning
Acil bir düzeltme (Branch Strategy, Madde 12 — Emergency Hotfix Rule), kendi versiyonlama mantığına (küçük bir artış) sahiptir.

## 6. Build Reproducibility
Aynı kaynak koddan üretilen bir build, tekrarlanabilir (reproducible) olmalıdır — build sürecinde belirsiz/rastgele bir davranış olmamalıdır.

## 7. AI Generated Version Review
AI'nın önerdiği bir versiyon artışı (örn. bir değişikliğin "breaking" olup olmadığı değerlendirmesi) insan tarafından onaylanır.

## 8. Version Ownership
Sürüm numarasını artırma kararı, belirli bir sorumlunun (Release süreci sahibi) onayından geçer.

## 9. Store Version Relationship
Mağaza (App Store/Play Store) gönderim sürecinin versiyonlamayla ilişkisi, **Release Strategy'nin (Madde 19) kapsamındadır** — bu doküman sadece uygulama sürüm numaralandırma felsefesini tanımlar.

## Risks
| Risk | Açıklama |
|---|---|
| Versiyon/içerik karışıklığı | Uygulama sürümü ile içerik paketi versiyonunun (ADR-005) karıştırılması |
| Reproducibility kaybı | Build sürecinde belirsizlik nedeniyle aynı koddan farklı build'ler üretilmesi |

## Mitigations
- Madde 3, uygulama ve içerik versiyonlamasının bağımsızlığını açıkça ayırır.
- Build Reproducibility (Madde 6), Engineering Foundation Madde 18 (CI/CD Strategy) ile desteklenir.

## Non-Goals
- Somut sürüm numarası formatı/başlangıç değeri.
- Mağaza gönderim süreci — Release Strategy (Madde 19).

## Acceptance Criteria
- [x] ADR-004, ADR-005, ADR-012 ile çelişmiyor.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- ADR-004 (SQLite Local Database)
- ADR-005 (Dynamic Content Packages)
- ADR-012 (Synchronization Strategy)
- Engineering Foundation 19 (Release Strategy)
