# Engineering Foundation 08: Commit Convention

## Status
Accepted

## Purpose
Commit mesajlarının tutarlı, izlenebilir ve otomasyona (örn. changelog üretimi) uygun bir yapıda olmasını sağlamak.

## 1. Yapı
Conventional Commits tarzı yapı kullanılır:
```
type(scope): subject

body (opsiyonel)

footer (opsiyonel)
```

## 2. Başlangıç Tür Kümesi
`feat`, `fix`, `docs`, `refactor`, `chore`, `security` — bu küme başlangıç noktasıdır, ihtiyaç doğduğunda genişletilebilir.

## 3. Scope
Scope, Repository Folder Structure (Madde 5)'teki mantıksal bölümlere (örn. `mobile`, `admin`, `shared`, `supabase`, `docs`) karşılık gelir.

## 4. Footer Politikaları
- **Breaking Change:** Geriye uyumsuz bir değişiklik açıkça `BREAKING CHANGE:` footer'ıyla işaretlenir.
- **ADR Reference:** Bir commit belirli bir ADR'nin kararını uyguluyorsa, footer'da referans verilir (örn. `Refs: ADR-005`).
- **Issue Reference:** İlgili issue/task numarası footer'da belirtilir.

## 5. Security Commit Rules
Güvenlikle ilgili bir commit (`security` type), mümkünse detaylı açıklamadan kaçınır (hassas bilgi/exploit detayı commit mesajında yer almaz).

## 6. AI-Assisted Commit Rules
AI tarafından üretilen bir commit mesajı da bu formata uyar; commit'in içeriği yine Git Workflow Madde 10'daki AI-Assisted Development Rule'a tabidir.

## 7. Small Commit Principle
Commit'ler, Git Workflow'daki (Madde 2) Small Increment ilkesiyle tutarlı, küçük ve anlaşılır tutulur.

## Risks
| Risk | Açıklama |
|---|---|
| Tutarsız commit formatı | Zaman içinde formatın gevşemesi, changelog/izlenebilirlik kalitesinin düşmesi |

## Mitigations
- Format, mümkünse otomatik bir kontrol (commit-msg hook veya CI) ile denetlenmesi hedeflenir (implementasyon detayı).

## Non-Goals
- Otomatik changelog üretim aracının seçimi.
- Somut commit-msg hook implementasyonu.

## Acceptance Criteria
- [x] Git Workflow (Madde 6) ve Repository Folder Structure (Madde 5) ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- Engineering Foundation 06 (Git Workflow)
- Engineering Foundation 07 (Branch Strategy)
