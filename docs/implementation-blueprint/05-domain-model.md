# Implementation Blueprint 05: Domain Model Blueprint

## Status
Accepted

## Purpose
Ürünün temel iş kavramlarını (entity'lerini), teknolojiden bağımsız şekilde tanımlamak — veritabanı şeması, API sözleşmesi veya UI ekranı değil, **kavramsal domain modeli**.

## Core Entities
On temel entity tanımlanmıştır:

| Entity | Tanım |
|---|---|
| **Exam** | Bir sınavın kendisi (örn. EKYS); ADR-013'teki Multi-Exam Architecture'ın birinci sınıf kavramı |
| **Topic** | Konu; kendine referanslı (self-referencing) hiyerarşi ile alt konuları temsil eder — ayrı bir "Subtopic" entity'si yoktur |
| **Question** | Soru; bir Topic'e ve bir Exam'e bağlıdır |
| **Package** | Dynamic Content Package (ADR-005); Question'ları gruplar |
| **User** | Kullanıcı; ADR-009'daki Supabase Auth `user_id` ile temsil edilen kimlik |
| **Entitlement** | Kullanıcının bir pakete/sınava erişim hakkı (ADR-007) |
| **Attempt** | Bir sorunun tek bir çözüm kaydı (doğru/yanlış/boş) |
| **Exam Session (Deneme Oturumu)** | Zamanlı bir deneme sınavı oturumu; birden fazla Attempt'i gruplayan, kendi yaşam döngüsüne sahip bir üst kavram — **Attempt'ten ayrı bir entity'dir** |
| **Repeat Pool** | Tekrar havuzu; yanlış yapılan soruların takip edildiği kavram (ADR-008) |
| **Learning Metric** | Öğrenme motorunun (ADR-008) ürettiği türetilmiş ilerleme/performans metriği |

## Modeling Decisions
- **Difficulty Level (Zorluk Seviyesi) ve Package Type (Paket Tipi), ayrı entity değil, Package'ın birer niteliğidir (attribute)** — bunlar için ayrı tablo/entity açmak MVP ölçeğinde over-engineering olurdu (YAGNI).
- **Topic, self-referencing hiyerarşi kullanır** — ayrı bir "Subtopic" entity'si tanımlanmamıştır; bir Topic'in üst/alt konusu, kendi türünden bir referansla ifade edilir.
- **Exam Session, Attempt'ten farklı bir entity'dir** — Exam Session bir zaman aralığı ve kendi durumuna (başladı/tamamlandı) sahip bir konteynerdir; Attempt ise onun içindeki tekil soru-cevap kaydıdır.

## Exam Context Isolation Application
ADR-013'teki Exam Context Isolation ilkesi, domain seviyesinde şu şekilde uygulanır: **Entitlement, Attempt, Exam Session, Repeat Pool ve Learning Metric — yani her User-scoped entity — açık bir Exam referansı taşımak zorundadır.** Bu, gelecekte birden fazla sınav eklendiğinde veri karışmasını (bleed) mimari olarak engeller.

## Data Categories Mapping (ADR-012 ile İlişki)
| Entity | ADR-012 Kategorisi |
|---|---|
| Exam, Topic, Question, Package | Server Authoritative / Static Package Content |
| User | Server Authoritative |
| Entitlement | Server Authoritative |
| Attempt, Exam Session | Client Generated |
| Repeat Pool, Learning Metric | Derived |

## Domain Boundary Rule
**Domain modeli ≠ veritabanı tabloları ≠ UI ekranları.** Bu üç katman birbirine birebir eşlenmez ve asla karıştırılmaz:
- Domain modeli, iş kavramlarını tanımlar (bu doküman).
- Veritabanı tabloları, bu kavramların fiziksel/kalıcı temsilidir (Database Design Blueprint).
- UI ekranları, bu kavramların kullanıcıya sunum şeklidir (Design System / UI Layer Blueprint).
Bir entity, birden fazla tabloya yayılabilir veya birden fazla ekranda farklı şekillerde görünebilir — bu üç katmanın birbirinden bağımsız evrilebilmesinin garantisidir.

## Content Version Relationship
Question, Package ve Topic **versiyonlanabilir** entity'lerdir (ADR-005, ADR-006 ile tutarlı) — ancak versiyonlama mekanizmasının somut detayı bu blueprint'in kapsamı dışındadır; bu, ADR-005 ve Database Design Blueprint'e bırakılmıştır.

## Domain Review Rule
Database Design Blueprint'e geçmeden önce şu altı soru kontrol edilir:
1. Her entity'nin sorumluluğu net mi?
2. Exam Context Isolation her User-scoped entity'de uygulanmış mı?
3. Domain Boundary Rule (domain≠DB≠UI) ihlal ediliyor mu?
4. Attribute mi entity mi olması gerektiği doğru kararlaştırılmış mı (Difficulty Level, Package Type)?
5. Versiyonlanabilir entity'ler (Question, Package, Topic) doğru işaretlenmiş mi?
6. ADR-012 Data Categories ile eşleme tutarlı mı?

## Risks
| Risk | Açıklama |
|---|---|
| Exam Context Isolation'ın unutulması | Bir User-scoped entity'nin Exam referansı taşımadan tasarlanması |
| Domain/DB/UI karışıklığı | Domain entity'sinin doğrudan bir tablo veya ekranla birebir eşit sayılması |
| Over-engineering | Difficulty Level/Package Type gibi niteliklerin gereksiz yere ayrı entity yapılması |

## Mitigations
- Exam Context Isolation Application (Madde), Domain Review Rule'un (Madde 6, soru 2) bir kontrol noktası olmasıyla korunur.
- Domain Boundary Rule, üç katmanın açıkça ayrı dokümanlarda (bu blueprint / Database Design Blueprint / UI Layer Blueprint) ele alınmasıyla desteklenir.
- Over-engineering riski, YAGNI ilkesinin (Coding Standards, Madde 5) modelleme kararlarına (Madde: Modeling Decisions) doğrudan uygulanmasıyla azaltılır.

## Non-Goals
- Veritabanı şeması/tablo tasarımı — Database Design Blueprint.
- API/DTO şekli — API Contract Blueprint.
- UI ekran tasarımı — Design System / UI Layer Blueprint.
- Repeat Pool'un kalıcı tablo mu türetilmiş görünüm mü olacağı — Database Design Blueprint'e bilinçli olarak bırakılmıştır.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-005, ADR-006, ADR-007, ADR-008, ADR-012, ADR-013 ile uyumlu.
- [x] Kod/şema/tip oluşturulmadı; sadece kavramsal model tanımlandı.

## See Also
- ADR-005 (Dynamic Content Packages)
- ADR-007 (Entitlement & Premium)
- ADR-008 (Rule Based Learning Engine)
- ADR-012 (Synchronization Strategy)
- ADR-013 (Multi-Exam Architecture)
- Implementation Blueprint 06 (Database Design)
