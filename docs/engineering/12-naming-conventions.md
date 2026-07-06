# Engineering Foundation 12: Naming Conventions

## Status
Accepted

## Purpose
İsimlendirme felsefesini tanımlamak — somut case-style kararı (camelCase/PascalCase/snake_case gibi) bu dokümanın kapsamı dışındadır (bkz. Non-Goals/Architecture Notes).

## 1. Naming Philosophy
- **Anlaşılırlık, kısalıktan önce gelir.**
- **Tutarlılık:** Aynı kavram, kod tabanında her zaman aynı şekilde adlandırılır.
- **Domain Dili:** İsimler, ürünün domain dilini (Exam, Topic, Question, Attempt vb. — Domain Model Blueprint) yansıtır.
- **İngilizce Tanımlayıcı:** Kod içindeki tüm tanımlayıcılar (değişken, fonksiyon, tip adı) İngilizcedir.

## 2. Domain Language Rule ile English Naming Policy İlişkisi
Ürünün domain dili Türkçe kavramlar içerir (örn. "Deneme Oturumu", "Tekrar Havuzu") — ancak kod içinde bu kavramlar **tek, tutarlı bir İngilizce karşılıkla** temsil edilir (örn. "Deneme Oturumu" → `ExamSession`, "Tekrar Havuzu" → `RepeatPool`). Bu, Domain Model Blueprint'teki entity adlarıyla birebir örtüşür. Türkçe kavram ile İngilizce kod karşılığı arasında bire bir, belgelenmiş bir eşleme korunur — aynı Türkçe kavram için birden fazla İngilizce karşılık kullanılmaz.

## 3. File Naming
Dosya adları, içerdikleri birimin türünü ve amacını yansıtır; tutarlı bir kalıp izler (somut case-style implementasyon aşamasında).

## 4. Component Naming
Bileşen adları, temsil ettikleri UI/domain birimini açıkça yansıtır.

## 5. Boolean Naming
Boolean değişken/alan adları, değerin ne anlama geldiğini soru şeklinde açık eder (örn. `is-`, `has-` gibi bir önek felsefesi — somut biçim implementasyon aşamasında).

## 6. Async Naming
Asenkron fonksiyonlar, çağıranın bunu bilmesini sağlayacak şekilde adlandırılır (somut biçim implementasyon aşamasında).

## 7. Test Naming
Test adları, ne test edildiğini ve beklenen davranışı açıkça ifade eder.

## 8. Env-Var Naming
Ortam değişkeni adları, Environment Variable Strategy (Madde 3)'teki sınıflandırmayı (Public/Private/Critical) yansıtacak şekilde tutarlı bir önek/kalıp izler.

## 9. AI-Generated Naming Review
AI tarafından önerilen isimler de bu felsefeye göre (özellikle Domain Language Rule, Madde 2) insan tarafından review edilir.

## Risks
| Risk | Açıklama |
|---|---|
| Domain kavramı için birden fazla İngilizce karşılık | Aynı Türkçe kavramın farklı yerlerde farklı adlandırılması, kod tabanında kavramsal parçalanmaya yol açar |
| Tutarsız case-style | Case-style kararı verilmeden kodun farklı bölümlerinde farklı biçimler kullanılması |

## Mitigations
- Domain Language Rule (Madde 2), Domain Model Blueprint'teki entity adlarına sıkı referansla korunur — tek bir sözlük/eşleme tablosu (implementasyon aşamasında) tutulur.
- Case-style kararı, kod yazımına geçilmeden önce netleştirilecek (bkz. Architecture Notes); bu netleşene kadar tutarsızlık riski açıkça not edilmiştir.

## Non-Goals
- Somut case-style kararı (camelCase vs. PascalCase vs. snake_case) — implementasyon aşaması.
- Dosya uzantısı konvansiyonları.

## Acceptance Criteria
- [x] Domain Model Blueprint ile uyumlu (Domain Language Rule).
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- Engineering Foundation 10 (Coding Standards)
- Engineering Foundation 11 (TypeScript Standards)
- Implementation Blueprint 05 (Domain Model)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- Case-style için yaygın TypeScript/React Native konvansiyonları (camelCase değişken/fonksiyon, PascalCase tip/bileşen, SCREAMING_SNAKE_CASE sabit) değerlendirilebilir; nihai karar PO/CTO ile birlikte implementasyon aşamasında verilecektir.
