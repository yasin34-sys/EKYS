# Engineering Foundation 09: Development Environment

## Status
Accepted

## Purpose
Geliştirme ortamının hangi felsefeyle kurulacağını tanımlamak — somut araç/sürüm seçimi bu dokümanın kapsamı dışındadır.

## 1. Development Philosophy
- **Reproducible:** Bir geliştiricinin ortamı, bir başkasınınkiyle aynı sonucu üretir.
- **Consistent:** Ortamlar arası (geliştirici makineleri, CI) davranış farkı minimize edilir.
- **Independent:** Geliştirme ortamı, belirli bir işletim sistemine/donanıma sıkı bağımlı olmaz.
- **Security First:** Geliştirme ortamı, Security Baseline (Madde 1) ilkeleriyle uyumlu kurulur.
- **Documentation First:** Ortam kurulum adımları dokümante edilir; "sadece bende çalışıyor" durumu kabul edilmez.

## 2. Developer Workstation (Kavramsal)
Gereken araç kategorileri: Node.js çalışma zamanı, paket yöneticisi (Package Strategy Blueprint'te seçilecek), Expo/EAS CLI, kod editörü, git. **Somut sürüm/ürün seçimi bu dokümanın kapsamı dışındadır.**

## 3. Local Development Principles
Yerel geliştirme, production credential'larına veya gerçek kullanıcı verisine bağımlı olmadan çalışabilir (Security Baseline, Madde 9).

## 4. Machine Independence
Ortam kurulumu, mümkün olduğunca versiyon kilitli (lockfile, Dependency Management Madde 16) ve tekrarlanabilir tutulur.

## 5. AI-Assisted Development
AI destekli geliştirme araçları (örn. Claude Code) kullanılabilir; bu araçların ürettiği her çıktı Git Workflow Madde 10'daki review kuralına tabidir.

## 6. Environment Review Rule
Geliştirme ortamı gereksinimleri, bağımlılıklar değiştiğinde (Dependency Management, Madde 16) gözden geçirilir.

## 7. Environment Onboarding Checklist
Yeni bir geliştiricinin ortamı kurarken izleyeceği adımlar dokümante edilir (somut adımlar, araç seçimleri netleştikçe yazılacaktır).

## Risks
| Risk | Açıklama |
|---|---|
| Ortam tutarsızlığı | "Bende çalışıyor" sorunları, farklı geliştirici makineleri arasında |

## Mitigations
- Reproducible/Consistent ilkeleri (Madde 1) ve lockfile disiplini (Dependency Management) ile ortam tutarsızlığı azaltılır.

## Non-Goals
- Node.js/araç sürüm numaraları.
- IDE/editör seçimi.
- Paket yöneticisi seçimi — Package Strategy Blueprint.

## Acceptance Criteria
- [x] Security Baseline (Madde 1) ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- Engineering Foundation 01 (Security Baseline)
- Engineering Foundation 16 (Dependency Management)
- ADR-001 (React Native + Expo)
