# Engineering Foundation 11: TypeScript Standards

## Status
Accepted

## Purpose
TypeScript kullanımının felsefesini tanımlamak. **TypeScript kullanım kararının kendisi bu doküman ile teyit edilmiştir** (ADR-001 Non-Goals'ta bu dokümana referans verilir).

## 1. Type Safety / Strict Mode Felsefesi
TypeScript, sıkı (strict) modda kullanılır; tip güvenliği bir seçenek değil, varsayılan davranıştır.

## 2. `any` Yerine `unknown`
Belirsiz tipli veri, `any` ile tip kontrolünü tamamen devre dışı bırakmak yerine `unknown` ile modellenir ve kullanılmadan önce daraltılır (narrowing).

## 3. Null / Undefined ve Error Tiplerinin Açık Modellenmesi
Bir değerin yokluğu (`null`/`undefined`) ve hata durumları, tip sisteminde açıkça temsil edilir; örtük/varsayımsal "hep var olur" yaklaşımı benimsenmez.

## 4. Type Reuse / Shared Types / Domain Model Typing
Domain model tipleri (Domain Model Blueprint'teki 10 entity) **tek bir kaynaktan** tanımlanır ve paylaşılır; aynı kavram için birden fazla, birbirinden bağımsız tip tanımı oluşturulmaz.

## 5. Immutable Data
Veri yapıları, mümkün olduğunca değiştirilemez (immutable) şekilde modellenir; mutasyon yerine yeni değer üretimi tercih edilir.

## 6. Generic / Utility Types
Generic ve utility type'lar ölçülü kullanılır — okunabilirliği artırdığı durumlarda tercih edilir, sırf "akıllıca" olduğu için kullanılmaz (Coding Standards, Madde 6 — Explicitness over Magic ile tutarlı).

## 7. Public API Type Stability
Shared package'lardan dışa açılan tipler, dikkatli ve geriye uyumlu şekilde değiştirilir.

## 8. Backward Compatibility
Bir tipin alanı/şekli, gerekçesiz şekilde geriye uyumsuz değiştirilmez.

## 9. AI-Generated Type Review
AI tarafından önerilen tip tanımları da insan review'una tabidir (Git Workflow, Madde 10).

## 10. Runtime Validation Boundary
Dış kaynaktan (API, kullanıcı girdisi) gelen veri, sadece derleme zamanı tip varsayımıyla değil, **çalışma zamanında da doğrulanır** — tip sistemi, dış dünyadan gelen veri için tek başına yeterli bir garanti değildir.

## 11. Type Ownership
Domain model tiplerinin bir sahibi vardır; bu tipleri değiştirme kararı sahibinin onayından geçer.

## 12. Type Deprecation Policy
Kullanımdan kaldırılan bir tip, sessizce silinmez; deprecated işaretlenir, bir süre sonra kaldırılır.

## Risks
| Risk | Açıklama |
|---|---|
| `any` kaçağı | Zaman baskısıyla `any` kullanımının yaygınlaşması, tip güvenliğinin erimesi |
| Runtime doğrulama eksikliği | Sadece derleme zamanı tipine güvenip dış veri doğrulanmaması |

## Mitigations
- `any` kullanımı, lint kuralıyla (Linting & Formatting Strategy, Madde 13) kısıtlanması hedeflenir.
- Runtime Validation Boundary (Madde 10), API Contract Blueprint'teki Validation Boundary ile birlikte uygulanır.

## Non-Goals
- Somut runtime validation kütüphanesi seçimi.
- Domain model tiplerinin somut implementasyonu — Implementation Blueprint aşaması.

## Acceptance Criteria
- [x] Coding Standards (Madde 10) ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; sadece standart dokümante edildi.

## See Also
- ADR-001 (React Native + Expo)
- Engineering Foundation 10 (Coding Standards)
