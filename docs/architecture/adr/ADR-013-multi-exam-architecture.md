# ADR-013: Multi-Exam Architecture

## Status
Accepted

## Context
- PROJECT_CHARTER.md Bölüm 13 (Uzun Vadeli Ürün Vizyonu): "İş modeli tek sınava odaklı olabilir; ancak yazılım mimarisi hiçbir zaman tek sınava bağımlı olmamalıdır."
- Ürün odağı ilk yıllarda tamamen EKYS'dedir (PROJECT_CHARTER.md Bölüm 13); bu ADR bir ürün genişleme kararı değildir, sadece mimarinin buna **kapalı olmamasını** garanti eder.
- ADR-001–ADR-012'nin tamamı, o zamana kadar EKYS'ye özgü hiçbir sabit karar içermeyecek şekilde tasarlanmıştı; bu ADR bunu doğrular.

## Decision
- **Exam (Sınav), sistemde birinci sınıf bir kavram (first-class concept) olarak modellenir** — "EKYS" kodun içine gömülü bir sabit değil, veri modelinde bir Exam kaydıdır.
- **Exam Context Isolation:** Her kullanıcıya özgü çalışma durumu (runtime state), önbellek, ilerleme, tekrar havuzu (ADR-008), analitik ve dashboard verisi **sınav bazında tam olarak izole edilir.** Bir sınavdaki veri, başka bir sınavın verisiyle asla karışmaz.
- **Shared User / Separate Progress:** Kullanıcı hesabı (ADR-009) sınavlar arasında ortaktır — bir kullanıcının birden fazla sınava kaydı olabilir — ama her sınavdaki ilerlemesi/performansı birbirinden tamamen ayrıdır.
- **Content Isolation per Exam:** İçerik (konu/soru/paket, ADR-005/ADR-006) her sınava özgüdür; bir sınavın içeriği başka bir sınavda görünmez veya karışmaz.
- **Shared Core Infrastructure:** Auth (ADR-009), Sync (ADR-012), Security (ADR-011), State Management (ADR-010), Editorial Workflow (ADR-006) gibi altyapı katmanları **tüm sınavlar için ortaktır** — her yeni sınav bu katmanları yeniden inşa etmez.
- **Feature Independence:** Yeni bir sınav eklemek, Auth/Sync/Security/State/Editorial Workflow katmanlarında **kod değişikliği gerektirmemelidir** — sadece yeni sınava ait veri (içerik, konu yapısı) eklenir.
- **Entitlement Scoped by Exam:** Entitlement (ADR-007), sınav bazlı kapsanır — bir sınav için Premium hakkı, otomatik olarak başka bir sınav için geçerli olmaz (ayrı bir ticari/promosyonel karar olmadıkça).
- **Exam Lifecycle:** Bir sınav, `Draft → Internal → Beta → Published → Archived` durumlarından geçer — bu, ADR-006'daki içerik yaşam döngüsüne paralel ama ayrı bir kavramdır (sınavın kendisinin yaşam döngüsü, içindeki bir sorunun yaşam döngüsü değil).

## Uyumluluk Denetimi
ADR-001'den ADR-012'ye kadar tüm kararların sınav-bağımsız (exam-agnostic) olduğu doğrulanmıştır:

| ADR | Sınav-Bağımsız mı? | Not |
|---|---|---|
| ADR-001 (React Native + Expo) | ✅ | Teknoloji seçimi, sınav içeriğinden tamamen bağımsız |
| ADR-002 (Supabase + PostgreSQL) | ✅ | Şema tasarımı Exam Context Isolation'ı destekleyecek şekilde **Database Design Document (Future)** kapsamında ele alınacak |
| ADR-003 (Offline First) | ✅ | Paket bazlı offline çalışma, sınav bağımsız çalışır |
| ADR-004 (SQLite) | ✅ | Yerel veri modeli, sınav bazlı ayrım için genişletilebilir |
| ADR-005 (Dynamic Content Packages) | ✅ | Paketler zaten modüler; sınav bazlı paketleme doğal uzantı |
| ADR-006 (Editorial CMS) | ✅ | İş akışı, hangi sınava ait olduğundan bağımsız çalışır |
| ADR-007 (Entitlement & Premium) | ✅ | Paket bazlı entitlement modeli, sınav bazlı kapsanmaya zaten uygun |
| ADR-008 (Rule Based Learning Engine) | ✅ | Kural motoru, sınav bağımsız çalışan bir hesaplama katmanı |
| ADR-009 (Authentication Strategy) | ✅ | Kimlik, sınavlar arasında ortak (Shared User) |
| ADR-010 (State Management) | ✅ | Katman mimarisi sınav kavramından bağımsız |
| ADR-011 (Security Strategy) | ✅ | Güvenlik katmanları sınav bağımsız |
| ADR-012 (Synchronization Strategy) | ✅ | Senkronizasyon mekanizması sınav bağımsız |

**Sonuç:** Hiçbir mevcut ADR, çoklu sınav mimarisine genişlemeyi engelleyen bir karar içermiyor.

## Alternatives Considered
| Yaklaşım | Değerlendirme |
|---|---|
| Sınavı kod içine sabit (hardcoded) gömme | Gelecekte başka bir sınava genişleme, mimarinin yeniden yazılmasını gerektirir; PROJECT_CHARTER.md Bölüm 13'teki temel mimari prensiple doğrudan çelişir |
| Her sınav için ayrı bir uygulama/kod tabanı | Bakım maliyeti sınav sayısıyla doğrusal artar; Shared Core Infrastructure'ın avantajlarından tamamen vazgeçilir |
| **Exam'i birinci sınıf kavram olarak modelleme, Shared Core + Isolated Content/Progress** | **Seçildi** |

## Consequences
- (+) Gelecekte yeni bir sınav eklemek (ürün kararı verildiğinde), mimari bir engelle karşılaşmaz.
- (+) Mevcut EKYS odaklı ürün geliştirmesi hiçbir şekilde yavaşlamaz veya karmaşıklaşmaz — bu ADR sadece "kapıyı açık tutar," bugün hiçbir ekstra iş yükü getirmez.
- (+) Auth/Sync/Security/State gibi kritik altyapı katmanları tek sefer doğru inşa edilir.
- (-) Veritabanı ve içerik modeli tasarlanırken (Database Design Document (Future)) Exam Context Isolation'ın başından itibaren düşünülmesi gerekir — sonradan eklemek daha maliyetli olurdu.

## Risks
| Risk | Açıklama |
|---|---|
| Erken karmaşıklık | Bu ADR'nin ilkeleri, tek sınav (EKYS) için gereğinden fazla soyutlama olarak yanlış uygulanabilir |
| Isolation'ın gerçek implementasyonda unutulması | Database Design Document (Future) aşamasında Exam Context Isolation ilkesi göz ardı edilirse, ileride pahalı bir refactor gerekebilir |
| Kapsam kayması | Bu ADR'nin "mimari hazır olsun" ilkesi, yanlış yorumlanıp erken bir çoklu-sınav ürün çalışmasına dönüşebilir |

## Mitigations
- Erken karmaşıklık riski, bu ADR'nin **sadece mimari ilke** düzeyinde kalmasıyla (somut kod/şema kararı vermemesi) azaltılır — YAGNI ilkesiyle tutarlı.
- Isolation'ın unutulması riski, Database Design Document (Future) hazırlanırken bu ADR'nin Uyumluluk Denetimi tablosunun referans alınmasıyla azaltılır.
- Kapsam kayması riski, PROJECT_CHARTER.md Bölüm 13'teki "ürün odağı EKYS'de kalır" ilkesinin bu ADR'nin Context bölümünde açıkça tekrarlanmasıyla azaltılır.

## Non-Goals
- Yeni bir sınavın ürün olarak ne zaman/nasıl ekleneceği — bu bir ürün/iş kararıdır, bu ADR'nin kapsamı dışındadır.
- Veritabanı şemasında Exam Context Isolation'ın somut implementasyonu — Database Design Document (Future).
- Sınav bazlı fiyatlandırma/paketleme ticari detayları.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md Bölüm 13 ile tam uyumlu.
- [x] ADR-001–ADR-012'nin hiçbiriyle çelişmiyor (Uyumluluk Denetimi tablosu ile doğrulandı).
- [x] Bugünkü EKYS odaklı geliştirmeye hiçbir ek iş yükü getirmiyor.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-005 (Dynamic Content Packages)
- ADR-006 (Editorial CMS)
- ADR-007 (Entitlement & Premium)
- ADR-009 (Authentication Strategy)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- Gelecekte değerlendirilebilecek genişletmeler: Marketplace exams (üçüncü parti sınav içeriği), Partner exams, Institution-specific exams, white-label deployments. Bunların hiçbiri MVP kapsamında değildir ve bu ADR bunları taahhüt etmez — sadece mimarinin buna kapalı olmadığını belirtir.
