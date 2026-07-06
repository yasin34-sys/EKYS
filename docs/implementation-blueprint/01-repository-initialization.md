# Implementation Blueprint 01: Repository Initialization Blueprint

## Status
Accepted

## Purpose
Gerçek repo/dosya/klasör oluşturmadan önce, repo kurulumunun hangi ön kontrollerden geçmesi gerektiğini ve hangi sırayla ilerleneceğini planlamak.

## 1. Pre-Checks
Repo kurulumundan önce doğrulanması gerekenler: Architecture v1.0'ın dondurulmuş olması, Repository Strategy (Engineering Foundation Madde 4) ve Repository Folder Structure'ın (Madde 5) onaylanmış olması.

## 2. Security Pre-Checks
Security Baseline (Madde 1) checklist'i (`.gitignore`, `.env.example`, secret tarama) repo kurulumunun **ilk** adımı olarak uygulanacak şekilde planlanır — kod/dosya eklenmeden önce güvenlik iskeleti hazır olmalıdır.

## 3. .gitignore Planlaması
`.gitignore` içeriği, Security Baseline Madde 6'daki gereksinimlere göre önceden planlanır: `.env*`, `node_modules/`, build çıktıları, native build klasörleri, signing key/keystore dosyaları.

## 4. .env Planlaması
Her ortam için (Environment Variable Strategy, Madde 1) hangi `.env` dosyalarının oluşturulacağı ve bunların karşılığı olan `.env.example` dosyalarının içeriği önceden planlanır.

## 5. Monorepo İskeleti
Repository Strategy'deki (Madde 4) beş mantıksal bölümün (mobil app, admin panel, shared package, Supabase config, docs) en üst seviye klasör iskeleti planlanır — somut alt klasör detayları Physical Folder Structure Blueprint'e bırakılır.

## 6. İlk Commit Planı
İlk commit'in neyi içereceği (iskelet klasörler, `.gitignore`, `.env.example`, temel dokümantasyon) ve Security Baseline Madde 13'teki checklist'in bu commit öncesi uygulanacağı planlanır.

## 7. Branch/Workflow Hazırlığı
Repo kurulduğunda, Git Workflow (Madde 6) ve Branch Strategy'nin (Madde 7) ilk günden itibaren geçerli olacağı teyit edilir.

## 8. CI/CD İskeleti (Erken Not)
CI/CD pipeline'ının (Engineering Foundation Madde 18 — CI/CD Strategy) somut kurulumu bu blueprint'in kapsamında değildir, ama repo yapısının buna hazır (örn. Quality Gate'lerin bağlanabileceği) olması gerektiği not edilir.

## 9. Dokümantasyon Yerleşimi
`/docs` klasörünün, Architecture Export sürecinde (PROJECT_CHARTER.md, ADR'ler, Engineering Foundation, Implementation Blueprint'ler) nasıl doldurulacağı planlanır.

## 10. Repository Boundary Doğrulaması
Repo kurulduktan sonra, Repository Boundary Rule'un (Repository Strategy, Madde 4) ihlal edilip edilmediğinin nasıl denetleneceği (lint/import kuralları, Madde 13) not edilir.

## 11. Ortam Onboarding İlişkisi
Development Environment'taki (Madde 9) Environment Onboarding Checklist, repo kurulduktan sonra yeni bir geliştiricinin izleyeceği adımları kapsayacaktır.

## 12. Rollback Planı
Repo kurulumunda bir hata olursa (örn. yanlışlıkla secret commit edilmesi), Secrets Management Strategy Madde 7'deki incident response yaklaşımı uygulanır.

## 13. Package Manager İlişkisi
Somut paket yöneticisi seçimi bu blueprint'in kapsamında değildir — Package Strategy Blueprint'e bırakılmıştır.

## 14. Doğrulama Kriterleri
Repo kurulumu tamamlandığında: `.gitignore` doğru, `.env.example` mevcut, monorepo iskeleti Repository Strategy ile uyumlu, ilk commit checklist'i geçildi.

## 15. Mode Transition Note
**Plan Mode'dan çıkılmadan hiçbir repo/dosya/klasör fiilen oluşturulmayacaktır.** Bu blueprint'in onaylanması, sadece planı onaylar; fiziksel uygulama, kullanıcının Plan Mode'dan çıkma kararını açıkça vermesinden sonra gerçekleşir.

## Risks
| Risk | Açıklama |
|---|---|
| Güvenlik iskeletinin geç kurulması | `.gitignore`/`.env.example` olmadan ilk dosyaların eklenmesi, yanlışlıkla secret commit riskini artırır |
| Boundary ihlalinin erken fark edilmemesi | Repository Boundary Rule'un ilk günden itibaren denetlenmemesi |

## Mitigations
- Security Pre-Checks (Madde 2), güvenlik iskeletinin **ilk** adım olmasını garanti eder.
- Repository Boundary Doğrulaması (Madde 10), lint/import kurallarının erken kurulmasını hedefler.

## Non-Goals
- Fiili repo/klasör/dosya oluşturma (Mode Transition Note, Madde 15).
- Paket yöneticisi seçimi — Package Strategy Blueprint.
- CI/CD pipeline implementasyonu — Engineering Foundation Madde 18.

## Acceptance Criteria
- [x] Engineering Foundation 1-20 ile uyumlu.
- [x] Architecture v1.0 Freeze ile çelişmiyor.
- [x] Hiçbir dosya/klasör/repo fiilen oluşturulmadı; sadece plan onaylandı.

## See Also
- Engineering Foundation 01 (Security Baseline)
- Engineering Foundation 04 (Repository Strategy)
- Implementation Blueprint 02 (Physical Folder Structure)
