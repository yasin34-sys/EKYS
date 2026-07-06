# Engineering Foundation 02: Secrets Management Strategy

## Status
Accepted

## Purpose
Security Baseline (Madde 1)'de tanımlanan "secret asla git'e girmez" ilkesinin ötesinde, secret'ların envanterinin, erişiminin, dağıtımının ve rotasyonunun nasıl yönetileceğini tanımlamak.

## 1. Secret Envanteri
Projede kullanılacak secret kategorileri: Supabase Service Role Key, IAP doğrulama kimlik bilgileri (ADR-007), signing key/keystore (ADR-001), üçüncü parti servis API key'leri (ileride eklenebilir). Her yeni secret, bu envantere eklenmeden kullanılmaz.

## 2. Ortam Bazlı Ayrım
Her ortam (development/staging/production) kendi secret setine sahiptir; bir ortamın secret'ı başka bir ortamda kullanılmaz.

## 3. Erişim Kontrolü
Secret'lara erişim, "bilmesi gerekenler" (need-to-know) prensibiyle sınırlanır; her ekip üyesi tüm secret'lara erişemez.

## 4. Dağıtım
Secret'lar, güvenli bir kanal üzerinden (CI/CD secret injection, EAS Secrets, güvenli bir parola yöneticisi) dağıtılır — asla e-posta/mesajlaşma üzerinden düz metin paylaşılmaz.

## 5. Rotasyon
Kritik secret'lar (Service Role Key gibi) periyodik olarak veya bir sızıntı şüphesinde rotate edilir (yenilenir).

## 6. CI/CD Injection
CI/CD pipeline'ı, secret'ları build zamanında güvenli şekilde enjekte eder; secret'lar pipeline yapılandırma dosyalarına düz metin yazılmaz (Engineering Foundation Madde 18 — CI/CD Strategy ile ilişkili).

## 7. Incident Response
Bir secret sızıntısı tespit edildiğinde: (1) secret hemen rotate edilir, (2) sızıntının kapsamı değerlendirilir, (3) etkilenen sistemler/kullanıcılar gerekirse bilgilendirilir, (4) kök neden analiz edilir.

## 8. Secret Ownership
Her secret kategorisinin bir sahibi (owner) vardır — kim rotate edebilir, kim erişebilir netleştirilir.

## 9. Naming Convention
Secret/environment variable adları tutarlı bir isimlendirme kuralına uyar (Environment Variable Strategy, Madde 3 ile detaylandırılır).

## Risks
| Risk | Açıklama |
|---|---|
| Rotasyon eksikliği | Uzun süre rotate edilmemiş bir secret, sızıntı riskini kümülatif olarak artırır |
| Erişim kontrolü zafiyeti | Gereğinden fazla kişinin kritik secret'lara erişimi olması |

## Mitigations
- Kritik secret'lar için düzenli rotasyon takvimi hedeflenir.
- Erişim, rol bazlı ve minimum gerekli seviyede tutulur (Least Privilege, ADR-011).

## Non-Goals
- Somut parola yöneticisi/secret vault aracının seçimi.
- CI/CD platformunun seçimi — Engineering Foundation Madde 18 (CI/CD Strategy).

## Acceptance Criteria
- [x] Security Baseline (Madde 1) ve ADR-011 ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- Engineering Foundation 01 (Security Baseline)
- Engineering Foundation 03 (Environment Variable Strategy)
- ADR-011 (Security Strategy)
