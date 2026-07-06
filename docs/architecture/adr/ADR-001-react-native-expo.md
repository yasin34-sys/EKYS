# ADR-001: React Native + Expo

## Status
Accepted

## Context
- EKYS CEPTE, offline-first çalışan, dinamik içerik paketleri kullanan, iOS ve Android için tek kod tabanlı geliştirilecek bir mobil uygulamadır (PROJECT_CHARTER.md, Bölüm 9 — MVP 1 Kapsamı).
- Arayüz profili form, liste, zamanlayıcı ve basit istatistik/grafik ekranlarından oluşur.
- Küçük/orta ölçekli geliştirme ekibi; uzun ömürlü, bakımı kolay bir mimari önceliklidir (PROJECT_CHARTER.md, Bölüm 14 — Ürün Tasarım Prensipleri).
- Yerel veritabanı şifrelemesi ve IAP/entitlement kontrolü gibi native yeteneklere ihtiyaç duyulacağı öngörülmektedir (PROJECT_CHARTER.md, Ek Notlar).

## Decision
- **React Native**, mobil uygulama çatısı olarak kullanılacaktır.
- **Expo** geliştirme/dağıtım altyapısı olarak kullanılacaktır, aşağıdaki teknik yapılandırmayla:
  - **Expo Go hedef değildir** — proje Expo Go'nun native modül kısıtına bağlı kalmayacaktır.
  - **Expo Prebuild** gerektiğinde kullanılabilir (native proje dosyalarının üretilmesi için).
  - **Custom Development Client** geliştirme sürecinde standart araç olacaktır.
  - **EAS Build**, derleme ve dağıtım hattı olarak kullanılacaktır.
  - Gelecekte, tooling'in karşılayamayacağı bir native ihtiyaç doğarsa **Bare Workflow'a geçiş** mimari olarak mümkün bırakılır (bkz. Mitigations).

**React Native neden seçildi?** Uygulamanın arayüz profili (form, liste, zamanlayıcı, quiz ekranları) React Native'in platform-native UI bileşenlerini köprü/JSI üzerinden kullanan mimarisiyle doğrudan örtüşüyor. Tek kod tabanıyla iOS/Android'de eşzamanlı, eşit kalite lansman hedefini karşılıyor; yerel veritabanı, IAP, push bildirim, güvenli depolama gibi ihtiyaçlar geniş ekosistemde hazır çözümlerle destekleniyor.

**Expo neden seçildi?** EAS Build ile derleme/dağıtım hattı standartlaştırılıyor; Custom Development Client, Expo'nun geliştirme araçlarını (hot reload, tooling) kullanırken native modül eklemeye izin veriyor; bu, "tam yönetilen ama native'e kapalı" (Expo Go) ile "tamamen native, sıfırdan yönetilen" (Bare Workflow) arasında bir orta yol sağlıyor.

**Flutter neden seçilmedi?** Flutter, kendi render motorunu (Skia) kullanarak platformdan bağımsız, tutarlı bir çizim katmanı sağlar — bu, yoğun özel animasyon/görsel efekt gerektiren uygulamalarda avantajdır. React Native ise platformun native UI bileşenlerini köprü/JSI üzerinden kullanır — bu, standart form/liste/quiz tipi ekranlarda platform-native görünüm ve davranışı ek işçilik gerektirmeden verir. Uygulamanın ekran envanteri (PROJECT_CHARTER.md, Bölüm 9) ikinci profile daha yakın olduğundan React Native tercih edilmiştir. Ekip/işe alım açısından React Native'in JavaScript/TypeScript tabanlı olması, Dart'a kıyasla daha büyük bir yerel geliştirici havuzuna erişim sağlar.

**Native iOS + Android neden seçilmedi?** İki ayrı kod tabanı, iki katı geliştirme ve bakım süresi/maliyeti anlamına gelir. Bu, küçük ekip kapasitesi ve "yazılım süreci içerik sürecini beklemeyecek" hızı ile uyumsuzdur.

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Flutter | Kendi render motoru (Skia) ile platform-bağımsız çizim; bu projenin ekran profili için bu avantaj belirleyici değil; Dart ekosistemi/geliştirici havuzu React Native'e göre daha küçük |
| Native (Swift + Kotlin) | En iyi performans/platform uyumu; iki kod tabanı = iki katı geliştirme/bakım maliyeti |
| React Native (CLI, Expo'suz) | Build/dağıtım altyapısı sıfırdan kurulmalı; EAS'ın sağladığı standardizasyon kaybolur |
| React Native + Expo (Expo Go) | Native modül ekleyememe kısıtı — SQLite şifreleme ve IAP ihtiyaçlarını karşılamıyor |
| **React Native + Expo (Custom Dev Client + EAS Build)** | **Seçildi** |

## Consequences
- (+) Tek kod tabanı, iki platformda eşzamanlı eşit kalite lansman.
- (+) EAS Build ile standartlaştırılmış derleme/dağıtım hattı.
- (+) Custom Development Client ile native modül ekleme esnekliği, Expo tooling'i kaybetmeden.
- (+) Geniş kütüphane/ekosistem desteği.
- (-) Geliştirme sürecinde Custom Development Client tercih edilecektir; bu, Expo Go'nun tek adımlı "QR kodu tara" akışına göre bir build adımı daha gerektirir.
- (-) Çok ağır animasyon/gerçek zamanlı bir senaryo ileride gerekirse performans tavanı Flutter/native'e göre daha düşük olabilir (şu an böyle bir senaryo yok).

## Risks
| Risk | Açıklama |
|---|---|
| Native modül bağımlılığı büyürse "managed workflow" avantajı azalır | SQLite şifreleme, IAP gibi ihtiyaçlar arttıkça Expo'nun sağladığı standardizasyon kısmen azalır |
| Expo SDK/EAS sürüm bağımlılığı | Büyük SDK sıçramalarında geçiş maliyeti oluşabilir |
| React Native "New Architecture" geçiş süreçleri | Bazı üçüncü parti kütüphaneler geçişte gecikebilir |
| Gelecekte tam Bare Workflow ihtiyacı | Tooling'in karşılayamayacağı bir native gereksinim çıkarsa Bare Workflow'a geçiş gerekebilir |
| Üçüncü parti React Native paketlerinin bakım durumu | Bazı paketler uzun vadede aktif geliştirilmeyebilir; bu, güncelleme ve güvenlik yaması alamayan bağımlılık riski oluşturur |

## Mitigations
- Native modül ihtiyaçları netleştikçe (SQLite şifreleme → ADR-004, IAP → ADR-007 (Entitlement & Premium)) bunlar ayrı ADR'lerde değerlendirilip seçilecek.
- Expo SDK güncellemeleri düzenli takip edilecek; büyük sürüm geçişleri ayrı bir bakım görevi olarak planlanacak.
- Kritik üçüncü parti kütüphaneler seçilirken "New Architecture" uyumluluğu bir seçim kriteri olacak.
- Bare Workflow'a geçiş ihtimali düşük görülüyor; Custom Development Client yaklaşımı native modül ekleme ihtiyacının büyük kısmını Bare Workflow gerektirmeden karşılıyor. İhtiyaç doğarsa bu ayrı bir karar noktası (yeni bir ADR) olarak ele alınacak.
- Üçüncü parti paket seçiminde, aktif bakım gören ve geniş topluluk desteğine sahip kütüphaneler tercih edilecek (son commit tarihi, açık issue/PR oranı, indirme/kullanım istatistikleri gibi ölçütlerle değerlendirilecek).

## Non-Goals
- TypeScript kullanım kararı — Engineering Foundation Madde 11 (TypeScript Standards).
- State management kararı (Zustand vb.) — ADR-010 (State Management & Server State).
- Server-state/cache kararı (TanStack Query vb.) — ADR-010 (State Management & Server State).
- Backend/veritabanı seçimi — ADR-002.
- IAP sağlayıcı seçimi — ADR-007 (Entitlement & Premium).
- UI/UX ekran tasarımı.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile çelişmiyor.
- [x] Offline-First mimarisini engellemiyor.
- [x] Tek kod tabanı hedefiyle uyumlu.
- [x] Gelecekte native yeteneklere (Prebuild/Bare Workflow) genişleyebilir.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-002 (Supabase + PostgreSQL)
- ADR-003 (Offline First Architecture)
- ADR-004 (SQLite Local Database)
- ADR-005 (Dynamic Content Packages)
- ADR-007 (Entitlement & Premium)
- ADR-010 (State Management & Server State)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- SQLite erişim kütüphanesi, native modül bağımlılıkları ve Bare Workflow ihtiyacı ADR-004'te ayrıca değerlendirilecektir.
- Üçüncü parti React Native paketlerinin bakım durumu, her bağımlılık eklenmeden önce Dependency Management (Engineering Foundation Madde 16) kapsamında kontrol edilir.
