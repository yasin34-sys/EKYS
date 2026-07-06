# EKYS CEPTE — Architecture v1.0 Freeze Declaration

| | |
|---|---|
| **Architecture Version** | 1.0 |
| **Status** | Frozen |
| **Effective Date** | 2026-07-02 |
| **Supersedes** | None |
| **Next Planned Review** | Implementation Blueprint tamamlandıktan sonra |

---

## 1. Freeze Amacı
Mimari kararların (ADR'ler) ve mühendislik standartlarının (Engineering Foundation) istikrarlı, çelişkisiz ve referans bütünlüğü doğrulanmış bir temel oluşturması; bundan sonraki tüm geliştirme çalışmalarının sürekli değişen bir mimari üzerine değil, sabit ve güvenilir bir temel üzerine inşa edilmesini sağlamaktır. Architecture Consistency Review'da tespit edilen tüm bulgular (2 Major, 3 Minor/Cosmetic) düzeltildikten sonra bu dondurma ilan edilmiştir.

## 2. Freeze Kapsamı
- **PROJECT_CHARTER.md v1.0** — ürün vizyonu, iş modeli, MVP kapsamı, ürün tasarım prensipleri.
- **ADR-001–ADR-013** — tüm mimari kararlar (Foundation, Core Product, Application, Platform, Future grupları).
- **Engineering Foundation 1–20** — tüm mühendislik standartları ve süreçleri.
- Bu kapsam, Architecture Consistency Review sonrası düzeltilmiş, referans bütünlüğü doğrulanmış hâliyle dondurulmuştur.

## 3. Freeze Tarihi
**2026-07-02**

## 4. Dondurulan Doküman Listesi

**PROJECT_CHARTER.md** (v1.0)

**ADR'ler:**
| # | Başlık | Grup |
|---|---|---|
| ADR-001 | React Native + Expo | Foundation |
| ADR-002 | Supabase + PostgreSQL | Foundation |
| ADR-003 | Offline First Architecture | Foundation |
| ADR-004 | SQLite Local Database | Foundation |
| ADR-005 | Dynamic Content Packages | Core Product |
| ADR-006 | Editorial CMS | Core Product |
| ADR-007 | Entitlement & Premium | Core Product |
| ADR-008 | Rule Based Learning Engine | Core Product |
| ADR-009 | Authentication Strategy | Application |
| ADR-010 | State Management & Server State | Application |
| ADR-011 | Security Strategy | Platform |
| ADR-012 | Synchronization Strategy | Platform |
| ADR-013 | Multi-Exam Architecture | Future |

**Engineering Foundation:**
| # | Başlık |
|---|---|
| 1 | Security Baseline |
| 2 | Secrets Management Strategy |
| 3 | Environment Variable Strategy |
| 4 | Repository Strategy |
| 5 | Repository Folder Structure |
| 6 | Git Workflow |
| 7 | Branch Strategy |
| 8 | Commit Convention |
| 9 | Development Environment |
| 10 | Coding Standards |
| 11 | TypeScript Standards |
| 12 | Naming Conventions |
| 13 | Linting & Formatting Strategy |
| 14 | Documentation Strategy |
| 15 | Testing Strategy |
| 16 | Dependency Management |
| 17 | Versioning Strategy |
| 18 | CI/CD Strategy |
| 19 | Release Strategy |
| 20 | Development Roadmap |

## 5. Bundan Sonraki Değişiklik Kuralları
- Dondurulan dokümanlar **varsayılan olarak değiştirilmez.**
- Yeni bir mimari karar gerekiyorsa: **yeni bir ADR** açılır (Future/yeni bir kapsam için) — ADR fazı "kapalı" değil, "varsayılan olarak sessiz" durumdadır; gerekçeli bir ihtiyaç doğduğunda yeniden açılabilir.
- Mevcut bir ADR veya Engineering Foundation dokümanında değişiklik gerekiyorsa, bu **kontrollü bir revizyon süreciyle** yapılır — Documentation Lifecycle (Documentation Strategy, Madde 3) ve Documentation Update Rule (Git Workflow, Madde 8) izlenir; sessiz/dokümante edilmemiş değişiklik yapılmaz.
- Her revizyon, PROJECT_CHARTER.md ve diğer donmuş dokümanlarla çelişmediği doğrulanarak (Architecture Consistency Review'daki denetim mantığıyla) kabul edilir.
- Deprecated hâle gelen bir doküman/madde silinmez, Documentation Archive Policy'ye (Documentation Strategy, Madde 9) göre arşivlenir.

## 6. Architecture Governance Kuralları
- Nihai mimari karar yetkisi **Product Owner + CTO'dadır.**
- Yeni bir mimari kararın kapsamı önce PO/CTO tarafından belirlenir, ardından Lead Software Engineer rolü tarafından dokümante edilir — kendiliğinden yeni mimari karar üretilmez.
- Her revizyon, ilgili dokümanın kendi "Review Rule" maddesinden geçer.
- AI tarafından önerilen hiçbir değişiklik (kod, doküman, mimari revizyon), insan onayı olmadan kabul edilmez (Git Workflow Madde 10 ve türevleri).
- Freeze sonrası herhangi bir değişiklik bu governance sürecini atlayamaz.

## 7. Sonraki Aşama: Implementation Blueprint
Development Roadmap'teki (Engineering Foundation Madde 20) fazlar sırasıyla izlenecektir:

```
Repository Initialization → Development Environment
   → Design System → Database → API Contract
   → Core Domain → State Management
   → Feature Development → Integration
   → Testing → Performance Optimization
   → Security Review → Release Preparation
   → Production Readiness Review → Post Release Maintenance
```

Bu roadmap'te atıfta bulunulan **Database Design Document (Future)**, Implementation Blueprint aşamasında ele alınmış ve `implementation-blueprint/06-database-design.md` olarak mevcut hâle gelmiştir. **UI/UX Tasarım Sistemi** (Design System Blueprint) de aynı şekilde `implementation-blueprint/04-design-system.md` olarak mevcuttur. Kod üretimine, Development Roadmap'in Phase Entry Criteria'sı (Madde 4) karşılandığında geçilecektir.

## 8. Acceptance

| Alan | Değer |
|---|---|
| **Durum** | **Architecture v1.0 — FROZEN** |
| **Kapsam** | PROJECT_CHARTER.md v1.0 + ADR-001–013 + Engineering Foundation 1–20 |
| **Onaylayan** | Product Owner / CTO |
| **Hazırlayan** | Lead Software Engineer (Claude) |
| **Tarih** | 2026-07-02 |
| **Bilinen açık çelişki/asılı referans** | Yok |

---

**Architecture v1.0 resmen dondurulmuştur.** Bundan sonraki tüm çalışmalar bu temel üzerine inşa edilmiştir (bkz. `implementation-blueprint/` klasörü).
