# Engineering Foundation 19: Release Strategy

## Status
Accepted

## Purpose
Bir sürümün nasıl hazırlanıp yayınlanacağının felsefesini tanımlamak.

## 1. Release Lifecycle
```
Hazırlık → Onay → Yayın → Doğrulama → İzleme
```

## 2. Stable Release Principle
Yalnızca kararlı (Testing Strategy kriterlerini karşılayan) bir build yayınlanır.

## 3. Release Approval
**İnsan onayı zorunludur** — bu, Engineering Foundation Madde 18'deki (CI/CD Strategy) Continuous Delivery (Continuous Deployment değil) kararıyla aynı ilkedir.

## 4. Store Submission Relationship
Mağaza (App Store/Play Store) gönderimi, uygulama kodu için gereklidir. **İçerik güncellemeleri (ADR-005) mağaza gönderiminden bağımsızdır** — bir içerik/paket güncellemesi, mağaza incelemesi beklemeden yayınlanabilir; bu, PROJECT_CHARTER.md'nin temel mimari önceliklerinden biridir.

## 5. Hotfix / Rollback
Bir üretim sorununda, hızlı bir hotfix (Branch Strategy, Madde 12) veya önceki kararlı sürüme geri dönüş (rollback) mümkün olacak şekilde süreç tasarlanır.

## 6. Progressive Rollout
Yeni bir sürüm, mümkün olduğunda tüm kullanıcılara birden değil, kademeli olarak açılabilir (somut mekanizma implementasyon aşamasında/platform bazlı).

## 7. Emergency Release Policy
Acil bir düzeltme için hızlandırılmış bir süreç kullanılabilir, ama **hız hiçbir zaman güvenliği feda etmez** — Security Baseline ve Testing Strategy'nin kritik kontrolleri (Learning Engine, Entitlement, Security) atlanmaz.

## 8. AI Generated Release Review
AI'nın önerdiği bir release notu/değişiklik özeti de insan tarafından onaylanır.

## 9. Release Archive Policy
Geçmiş sürümler ve onlara ait release notları arşivlenir, silinmez (Documentation Strategy, Madde 9 — Archive Policy ile tutarlı).

## Risks
| Risk | Açıklama |
|---|---|
| Mağaza inceleme gecikmesi | Kod değişikliği içeren bir sürümün mağaza incelemesinde beklemesi |
| Acil düzeltmede kalite feda etme | Emergency Release sürecinde kritik kontrollerin atlanması baskısı |

## Mitigations
- Store Submission Relationship (Madde 4), içerik güncellemelerini bu gecikmeden tamamen bağımsız tutar (ADR-005'in temel faydası).
- Emergency Release Policy (Madde 7), hız/güvenlik dengesini açıkça "güvenlik feda edilmez" şeklinde sabitler.

## Non-Goals
- Somut mağaza gönderim aracı/otomasyonu (bkz. Architecture Notes).
- Progressive rollout'un platform bazlı somut mekanizması.

## Acceptance Criteria
- [x] ADR-005, ADR-011 ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- ADR-005 (Dynamic Content Packages)
- ADR-011 (Security Strategy)
- Engineering Foundation 17 (Versioning Strategy)
- Engineering Foundation 18 (CI/CD Strategy)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- EAS Submit (Expo'nun mağaza gönderim aracı) gibi bir otomasyon değerlendirilebilir; somut seçim implementasyon aşamasında yapılacaktır.
