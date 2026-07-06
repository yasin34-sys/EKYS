# Implementation Blueprint 04: Design System Blueprint

## Status
Accepted

## Purpose
Uygulamanın görsel/deneyim kimliğinin felsefesini planlamak — somut renk kodu, font, ikon seti veya UI kütüphanesi seçimi bu blueprint'in kapsamı dışındadır.

## 1. Premium Experience Goal
PROJECT_CHARTER.md Bölüm 2.1'deki "Profesyonel Kullanıcı Deneyimi" ilkesi, tasarım sisteminin birinci hedefidir — amatör bir quiz uygulaması hissi değil, ciddi, sakin, profesyonel bir eğitim platformu hissi.

## 2. Visual Identity Direction
Görsel kimlik yönü: **ciddi, sakin, profesyonel** — çocuksu/oyuncul (playful) değil. Bu, PROJECT_CHARTER.md'deki hedef kullanıcı profiliyle (yönetici adayı öğretmenler) tutarlıdır.

## 3. Color Strategy
Somut renk kodu/paleti seçilmemiştir; strateji sadece şu ilkeyi belirler: renk kullanımı, Visual Identity Direction'a (Madde 2) uygun, sakin ve profesyonel bir izlenim verecek şekilde sınırlı ve tutarlı bir palet üzerine kurulur — rastgele/aşırı renk çeşitliliği kullanılmaz.

## 4. Typography Strategy
Somut font ailesi seçilmemiştir; strateji, okunabilirliğin (Readability First, Coding Standards Madde 3 ile aynı ilke, tasarım seviyesinde) her zaman öncelik olduğunu belirler — metin boyutu/ağırlığı, uzun soru metinlerinin rahat okunmasını destekleyecek şekilde seçilecektir.

## 5. Spacing Strategy
Somut boşluk (spacing) değerleri seçilmemiştir; strateji, tutarlı bir boşluk ölçeğinin (küçükten büyüğe, birbirinin katı olan bir dizi değer) tüm ekranlarda kullanılacağını belirler — her ekranın kendi rastgele boşluk değerlerini icat etmesi engellenir.

## 6. Layout Strategy
Düzenler sade ve dağınık olmayan bir yapıda tasarlanır; bir ekranda aynı anda gösterilen bilgi miktarı, kullanıcının odaklanmasını bozmayacak şekilde sınırlı tutulur.

## 7. Visual Hierarchy Strategy
Bir ekrandaki en önemli bilgi/eylem (örn. "Soruyu Cevapla" butonu), görsel ağırlık (boyut, konum, kontrast) ile diğer öğelerden açıkça ayrıştırılır; kullanıcı bir ekranda "ilk ne yapmam gerekiyor" sorusuna görsel olarak hızlı cevap bulabilmelidir.

## 8. Contrast & Readability Priority
Kontrast ve okunabilirlik, estetik tercihlerin önüne geçer — bir tasarım kararı görsel olarak çekici ama okunabilirliği zedeliyorsa, okunabilirlik kazanır (Accessibility Strategy, Madde 17 ile ilişkili).

## 9. Component System Philosophy
Bileşenler, tutarlı, yeniden kullanılabilir ve tek sorumluluklu tasarlanır (Coding Standards, Madde 4 ile aynı ilke, tasarım seviyesinde).

## 10. Quiz UI Strategy
Soru çözme ekranı **hızlı, sade ve dikkat dağıtmayan** olmalıdır — gereksiz animasyon/görsel gürültü, kullanıcının odaklanmasını bozmamalıdır.

## 11. Dashboard / Statistics UI Strategy
Dashboard, ADR-008'deki Explainability (açıklanabilirlik) ilkesiyle doğrudan bağlıdır — gösterilen her sayı/grafik, kullanıcının "bu neden böyle" sorusuna cevap verebilecek netlikte sunulur.

## 12. Empty State Strategy
Bir ekranda gösterilecek veri olmadığında (örn. henüz hiç soru çözülmemiş bir tekrar havuzu), kullanıcıya boş bir ekran değil, durumu açıklayan ve mümkünse bir sonraki adımı öneren bir "empty state" gösterilir.

## 13. Loading State Strategy
Veri yüklenirken kullanıcıya tutarlı, öngörülebilir bir yükleniyor göstergesi sunulur; farklı ekranlar farklı yükleme deneyimleri icat etmez.

## 14. Error State Strategy
Bir hata oluştuğunda, kullanıcıya iç sistem detayı sızdırmayan (Error Contract Philosophy, API Contract Blueprint ile tutarlı), anlaşılır ve mümkünse bir aksiyon (yeniden dene vb.) öneren bir hata durumu gösterilir.

## 15. Success State Strategy
Bir işlem başarıyla tamamlandığında (örn. bir deneme sınavının bitirilmesi), kullanıcıya bunu açıkça, motive edici ama abartısız bir şekilde bildiren bir başarı durumu gösterilir.

## 16. Motion Strategy
Hareket (animasyon/geçiş), ölçülü ve amaçlı kullanılır — bir hareketin kullanıcıya bir şey iletmesi (durum değişikliği, geri bildirim) gerekir; salt dekoratif/dikkat dağıtan hareketlerden kaçınılır (Quiz UI Strategy, Madde 10 ile özellikle tutarlı).

## 17. Accessibility Strategy
Erişilebilirlik (yeterli kontrast oranı, yeterli dokunma hedefi boyutu, okunabilir metin boyutu) MVP'den itibaren bir gereksinimdir, sonradan eklenecek bir iyileştirme değildir.

## 18. Dark Mode
**MVP kapsamında değildir** — mimari buna kapalı tutulmaz ama öncelik değildir.

## 19. Iconography Strategy
İkon stili, Visual Identity Direction'a (Madde 2) uygun, sade ve tek bir görsel dilde tutarlı kullanılır — birden fazla farklı ikon stilinin karışık kullanılması engellenir; somut ikon seti seçimi implementasyon aşamasındadır.

## 20. Illustration Strategy
Kullanılırsa, illüstrasyonlar da aynı profesyonel/sakin görsel dile uyar; çocuksu veya oyuncul bir illüstrasyon stili (Visual Identity Direction, Madde 2 ile çelişeceğinden) tercih edilmez.

## 21. Gamification Boundaries
**Motivasyon, eğlence değildir.** Rozet, liderlik tablosu gibi oyunlaştırma öğeleri PROJECT_CHARTER.md Bölüm 10'a (MVP Dışı) göre MVP kapsamında değildir; tasarım sistemi bu sınırı korur.

## 22. Component Consistency Rule
Aynı amaca hizmet eden bir arayüz öğesi (örn. bir birincil eylem butonu), uygulama genelinde her zaman aynı bileşenle temsil edilir; her ekranın kendi özel buton/kart/liste tasarımını icat etmesi kabul edilmez.

## 23. Color Consistency Rule
Renk kullanımı, Color Strategy'de (Madde 3) tanımlanan palete sıkı sıkıya bağlı kalır; bir ekranda palet dışı bir renk kullanılmaz.

## 24. Spacing Consistency Rule
Boşluk kullanımı, Spacing Strategy'de (Madde 5) tanımlanan ölçeğe bağlı kalır; rastgele/özel boşluk değerleri kullanılmaz.

## 25. Cross-Screen Consistency Rule
Bir kullanıcı, uygulama içinde bir ekrandan diğerine geçtiğinde, temel etkileşim kalıplarının (örn. bir formun nasıl doldurulacağı, bir listenin nasıl kaydırılacağı) aynı kaldığını hissetmelidir — her ekran kendi etkileşim kuralını icat etmez.

## 26. AI Generated UI Review
AI tarafından önerilen bir UI/tasarım kararı da insan review'undan geçer (Git Workflow, Madde 10 ile tutarlı).

## 27. Typography Scale Relationship
Somut tipografi ölçeği (başlık/gövde/altyazı boyutları), Typography Strategy'nin (Madde 4) ilkeleriyle uyumlu şekilde implementasyon aşamasında belirlenecektir; bu blueprint sadece ilkeyi (okunabilirlik önceliği) kayda geçirir.

## 28. Color Palette Relationship
Somut renk paleti (hex/token değerleri), Color Strategy'nin (Madde 3) ilkeleriyle uyumlu şekilde implementasyon aşamasında belirlenecektir.

## 29. Icon Library Relationship
Somut ikon kütüphanesi/seti, Iconography Strategy'nin (Madde 19) ilkeleriyle uyumlu şekilde implementasyon aşamasında seçilecektir.

## 30. Component Inventory Relationship
Somut component envanteri (hangi bileşenlerin var olacağı: buton, kart, liste öğesi vb.), Component System Philosophy'nin (Madde 9) ilkeleriyle uyumlu şekilde, UI Layer Blueprint ve implementasyon aşamasında oluşturulacaktır.

## 31. Design Token Naming Relationship
Design token'ların (renk, tipografi, spacing değerlerinin kod içindeki temsili) adlandırılması, Naming Conventions'daki (Engineering Foundation Madde 12) felsefeyle tutarlı olacaktır; somut adlandırma implementasyon aşamasındadır.

## 32. Design System Documentation Rule
Design System'in somut çıktıları (palet, tipografi ölçeği, component envanteri) implementasyon aşamasında üretildiğinde, Documentation Strategy'deki (Engineering Foundation Madde 14) ilkelerle tutarlı şekilde dokümante edilir — sadece kodda örtük olarak var olmaz.

## 33. Design Ownership
Tasarım sisteminin bir sahibi vardır; bu sahibin onayı olmadan tasarım ilkelerinde (Madde 1-2, 10-11, 21) sapma yapılamaz.

## 34. Styling Approach Decision
**Karar (2026-07-02):** Hybrid yaklaşım, React Native `StyleSheet` + custom design token'lar temeline dayanır. Tam bir component kütüphanesi (örn. Tamagui, React Native Paper) benimsenmemiştir. Bu aşamada NativeWind/Tailwind tarzı bir sistem de benimsenmemiştir. Küçük, tek amaçlı UI kütüphaneleri (örn. grafik/chart kütüphanesi), yalnızca gerçek bir ihtiyaç doğduğunda ve yalnızca Dependency Approval Rule (Engineering Foundation 16, Madde 1) üzerinden değerlendirilebilir. Somut uygulama `packages/design-system` paketinde yaşar; bu paket bu Blueprint ile çelişemez.

## Risks
| Risk | Açıklama |
|---|---|
| Gamification sızıntısı | MVP dışı bırakılan oyunlaştırma öğelerinin yanlışlıkla eklenmesi |
| Tutarsızlık | Ekranlar arası stil tutarsızlığı |

## Mitigations
- Gamification Boundaries (Madde 21), PROJECT_CHARTER.md Bölüm 10'a doğrudan referansla korunur.
- Consistency Rules (Madde 22-25) ve Design Ownership (Madde 33), tutarsızlığı önler.

## Non-Goals
- Somut renk kodu/font/ikon seti seçimi. (Hâlâ açık.)
- ~~UI component kütüphanesi seçimi.~~ — **Çözüldü 2026-07-02:** Hybrid yaklaşım (React Native StyleSheet + custom design tokens), tam component kütüphanesi benimsenmedi. Bkz. Madde 34 ve `packages/design-system/README.md`.
- Dark Mode implementasyonu. (Hâlâ açık.)

## Acceptance Criteria
- [x] PROJECT_CHARTER.md Bölüm 2.1/10 ile uyumlu.
- [x] ADR-008 (Explainability) ile uyumlu.
- [x] Hiçbir kod/component oluşturulmadı; teknoloji seçilmedi.

## See Also
- PROJECT_CHARTER.md
- ADR-008 (Rule Based Learning Engine)
- Implementation Blueprint 11 (UI Layer)
