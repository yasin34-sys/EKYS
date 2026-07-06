# Engineering Foundation 07: Branch Strategy

## Status
Accepted

## Purpose
Branch türlerinin ve yaşam döngülerinin felsefesini tanımlamak.

## 1. Branch Philosophy
- **Stable Main:** Ana branch her zaman dağıtılabilir/kararlı durumda tutulur.
- **Isolated Development:** Her değişiklik kendi branch'inde geliştirilir, ana branch'i etkilemez.
- **Short-Lived Branches:** Branch'ler mümkün olduğunca kısa ömürlü tutulur; uzun süre açık kalan branch'ler merge çakışması riskini artırır.

## 2. Branch Types (Kavramsal)
| Tür | Amaç |
|---|---|
| Main | Her zaman kararlı, dağıtılabilir kod |
| Development | (gerekirse) entegrasyon branch'i |
| Feature | Tek bir özellik/değişiklik için |
| Hotfix | Acil production düzeltmesi için |
| Release | Bir sürümün hazırlığı için |

## 3. Branch Responsibilities & Lifetime
Her branch türü belirli bir amaca hizmet eder ve amacı tamamlandığında (merge sonrası) silinir — Long Living Branch Policy (Madde) istisnası dışında.

## 4. Protection Philosophy
Main (ve varsa Development) branch'i, doğrudan push'a kapalıdır; sadece review'dan geçmiş PR ile değişir.

## 5. Merge Eligibility
Bir branch, ancak review onayı ve gerekli kontrolleri geçtiğinde merge edilebilir.

## 6. Long Living Branch Policy
Uzun ömürlü branch'ler (örn. Release) istisnai olarak kabul edilir, ama düzenli olarak main ile senkronize tutulur.

## 7. Ownership
Her branch'in, onu açan/geliştiren kişi tarafından sahiplenilmesi beklenir — branch'in durumu (aktif/terk edilmiş) belirsiz kalmaz.

## 8. Traceability
Branch adları, ilişkili olduğu değişikliği/kararı (issue, ADR) yansıtacak şekilde anlamlı olmalıdır.

## 9. AI-Assisted Development
AI tarafından açılan/önerilen bir branch, Git Workflow Madde 10'daki AI-Assisted Development Rule'a tabidir.

## 10. Branch Review Rule
Branch stratejisinin kendisi, ekip büyüklüğü/ihtiyacı değiştiğinde gözden geçirilebilir.

## 11. Branch Deletion Policy
Merge edilmiş bir feature/hotfix branch'i, merge sonrası silinir; geçmiş git history üzerinden zaten izlenebilir.

## 12. Emergency Hotfix Rule
Acil bir production hatası için hotfix branch'i açılabilir; bu bile Review First ilkesinden (Git Workflow, Madde 2) muaf değildir, ancak review süreci hızlandırılabilir.

## Risks
| Risk | Açıklama |
|---|---|
| Uzun ömürlü feature branch | Çakışma riskinin ve entegrasyon karmaşıklığının artması |
| Sahipsiz branch birikimi | Kullanılmayan branch'lerin repo'yu kirletmesi |

## Mitigations
- Short-Lived Branches ilkesi (Madde 1) ve Branch Deletion Policy (Madde 11) ile branch birikimi engellenir.
- Ownership (Madde 7) ile her branch'in bir sahibi olması sağlanır.

## Non-Goals
- Somut branch adlandırma formatı (örn. `feature/xyz`) — implementasyon detayı, Naming Conventions (Madde 12) ile ilişkili olabilir.

## Acceptance Criteria
- [x] Git Workflow (Madde 6) ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- Engineering Foundation 06 (Git Workflow)
- Engineering Foundation 08 (Commit Convention)
