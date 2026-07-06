# Engineering Foundation 18: CI/CD Strategy

## Status
Accepted

## Purpose
Sürekli entegrasyon ve sürekli teslimatın (Continuous Integration/Delivery) felsefesini tanımlamak — somut araç/pipeline implementasyonu bu dokümanın kapsamı dışındadır.

## 1. CI/CD Philosophy
Her değişiklik, otomatik kontrollerden (build, lint, test, security) geçmeden production'a ulaşmaz.

## 2. Continuous Integration
Her PR, otomatik olarak derlenir/test edilir/lint edilir — entegrasyon sorunları erken yakalanır.

## 3. Continuous Delivery (Deployment'tan Farkı)
**Bu dokümanda "CD", Continuous Delivery anlamına gelir — Continuous Deployment değil.** Yani: her başarılı build, otomatik olarak production'a **dağıtılmaz**; dağıtılabilir hâle gelir, ama gerçek yayına alma kararı Release Strategy'deki (Madde 19) insan onayına tabidir.

## 4. Build Validation
Her build, Coding Standards, TypeScript Standards ve Linting & Formatting Strategy kurallarına karşı doğrulanır.

## 5. Automated Quality Gates
Test (Madde 15), Lint (Madde 13), Security (Madde 1) ve Dependency (Madde 16) kontrolleri, merge öncesi otomatik bir kapı oluşturur (Linting & Formatting Strategy, Madde 10 — Quality Gate Rule ile aynı mekanizma).

## 6. Secret Handling in CI
CI/CD pipeline'ında kullanılan secret'lar, Secrets Management Strategy (Madde 2, CI/CD Injection) ilkelerine uygun şekilde, güvenli enjekte edilir.

## 7. Reproducible Builds
CI'da üretilen build, Versioning Strategy'deki (Madde 6) Build Reproducibility ilkesiyle tutarlı olmalıdır.

## 8. Manual Approval Gates
Production'a gerçek dağıtım, otomatik değil, **insan onayı gerektiren bir adımdır** (Madde 3 ile tutarlı).

## 9. AI Generated Code Validation
AI tarafından üretilen kodun CI'dan geçmesi, insan review'unun (Git Workflow, Madde 10) yerine geçmez — her ikisi de gereklidir.

## 10. Pipeline Ownership
CI/CD pipeline'ının bir sahibi vardır; pipeline yapılandırma değişiklikleri bu sahibin onayından geçer.

## 11. Pipeline Evolution Policy
Pipeline, ihtiyaçlar (yeni test türü, yeni kontrol) doğdukça genişletilebilir; bu genişletme dokümante edilir.

## Risks
| Risk | Açıklama |
|---|---|
| Otomatik dağıtımın yanlışlıkla etkinleşmesi | Continuous Delivery'nin Continuous Deployment'a dönüşmesi, insan onayının atlanması |
| Pipeline yapılandırma hatası | CI/CD yapılandırmasındaki bir hata, hatalı kontrollerin/eksik kontrollerin geçmesine yol açabilir |

## Mitigations
- Madde 3/8, Continuous Delivery ile Continuous Deployment arasındaki farkı ve insan onayı gerekliliğini açıkça ayırır.
- Pipeline Ownership (Madde 10), yapılandırma değişikliklerinin denetimli yapılmasını sağlar.

## Non-Goals
- Somut CI/CD platformu seçimi (GitHub Actions, EAS Build/Submit vb.).
- Pipeline YAML/implementasyon detayları.

## Acceptance Criteria
- [x] Coding Standards, Security Baseline, Testing Strategy ile uyumlu.
- [x] Kod/dosya/repo/pipeline oluşturulmadı; araç seçilmedi.

## See Also
- Engineering Foundation 01 (Security Baseline)
- Engineering Foundation 15 (Testing Strategy)
- Engineering Foundation 19 (Release Strategy)
