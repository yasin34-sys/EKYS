# Engineering Foundation 01: Security Baseline

## Status
Accepted

## Purpose
Repo kurulmadan önce, hangi dosyaların asla versiyon kontrolüne girmeyeceğini ve ilk commit öncesi hangi güvenlik kontrollerinin zorunlu olduğunu netleştirmek. Bu doküman, ADR-011 (Security Strategy)'nin somut, operasyonel ilk adımıdır.

## 1. Yasaklı Dosyalar
Aşağıdaki dosya türleri hiçbir zaman git'e commit edilmez: `.env` ve türevleri, API key/secret içeren herhangi bir dosya, signing key/keystore dosyaları, servis hesabı kimlik bilgileri (service account JSON vb.), kişisel/gerçek kullanıcı verisi içeren dosyalar.

## 2. .env Güvenliği
`.env` dosyaları yerel geliştirme ortamında kalır, asla paylaşılmaz/commit edilmez. Her ortam (development/staging/production) kendi `.env` dosyasına sahiptir.

## 3. API Key Politikası
API key'ler asla istemci koduna (mobil uygulama bundle'ına) gömülmez, eğer bu key hassas bir yetkiye sahipse. Herkese açık, kısıtlı yetkili anahtarlar (örn. Supabase anon key) istisna olarak istemci tarafında bulunabilir; bu bile RLS (ADR-002/ADR-011) ile korunur.

## 4. Supabase Anon/Service Role Key Ayrımı
- **Anon key:** İstemci tarafında kullanılır, RLS politikalarıyla sınırlıdır, düşük risk.
- **Service Role key:** Sunucu tarafında (Edge Functions, admin işlemleri) kullanılır, RLS'i atlar — **hiçbir zaman istemci koduna veya git'e girmez.**

## 5. Signing Key / Keystore Politikası
iOS/Android imzalama anahtarları güvenli, versiyon kontrolü dışı bir konumda saklanır (örn. EAS Secrets, güvenli bir parola yöneticisi). Kaybolursa uygulamanın güncellenemeyeceği bilinerek yedeklenir.

## 6. .gitignore Gereksinimleri
Repo kurulumunun ilk adımı, aşağıdakileri kapsayan bir `.gitignore` oluşturmaktır: `.env*` (örnek dosyalar hariç), `node_modules/`, build/derleme çıktıları, IDE'ye özel dosyalar, native build klasörleri (Prebuild çıktıları), signing key/keystore dosyaları.

## 7. .env.example
Her `.env` dosyasının, gerçek değerler içermeyen, sadece değişken adlarını gösteren bir `.env.example` karşılığı bulunur ve bu dosya commit edilir.

## 8. Secret Leakage Kontrolü
Commit öncesi, secret sızıntısını tespit edecek bir kontrol mekanizması (pre-commit hook veya CI taraması) kullanılması hedeflenir; somut araç seçimi implementasyon aşamasındadır.

## 9. Local Dev Güvenliği
Geliştirici makinelerinde gerçek kullanıcı verisi veya production credential'ları kullanılmaz; yerel geliştirme sahte/örnek veriyle yapılır.

## 10. Dependency Security
Bağımlılıklar eklenmeden önce bilinen güvenlik açığı taraması yapılır (Dependency Management, Madde 16 ile ilişkili).

## 11. Log Security
Loglar hiçbir zaman şifre, token, API key veya ödeme bilgisi içermez.

## 12. Pre-Commit Kontrolleri
Commit öncesi otomatik kontrol (lint, secret tarama, format) hedeflenir; somut araç Linting & Formatting Strategy (Madde 13) ve Engineering Foundation Madde 18 (CI/CD Strategy) kapsamında netleşir.

## 13. İlk Commit Checklist'i
- [ ] `.gitignore` doğru yapılandırıldı
- [ ] Hiçbir `.env` dosyası staged değil
- [ ] Hiçbir signing key/keystore dosyası staged değil
- [ ] `.env.example` mevcut ve güncel
- [ ] Secret tarama kontrolü geçti

## 14. Her Push Öncesi Son Kontrol
Her push öncesi, yukarıdaki checklist'in ilgili kısımları (özellikle secret sızıntısı) tekrar doğrulanır — bu bir defalık değil, süregelen bir disiplindir.

## Risks
| Risk | Açıklama |
|---|---|
| Secret sızıntısı | Bir API key/credential'ın yanlışlıkla commit edilmesi |
| Geç fark edilen sızıntı | Sızıntının commit geçmişinde uzun süre fark edilmemesi |

## Mitigations
- `.gitignore` repo kurulumunun ilk adımı olarak, herhangi bir kod yazılmadan önce yapılandırılır.
- Pre-commit/CI seviyesinde otomatik secret tarama hedeflenir (Madde 8/12).
- Bir sızıntı tespit edilirse, ilgili secret hemen rotate edilir (Secrets Management Strategy, Madde 5).

## Non-Goals
- Somut secret tarama aracının seçimi.
- CI/CD pipeline implementasyonu — Engineering Foundation Madde 18 (CI/CD Strategy).
- Penetrasyon testi süreçleri.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ve ADR-011 ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; sadece süreç/standart dokümante edildi.

## See Also
- ADR-002 (Supabase + PostgreSQL)
- ADR-011 (Security Strategy)
- Engineering Foundation 02 (Secrets Management Strategy)
- Engineering Foundation 03 (Environment Variable Strategy)
