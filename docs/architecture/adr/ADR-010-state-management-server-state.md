# ADR-010: State Management & Server State

## Status
Accepted

## Context
- Offline-first mimari (ADR-003) + SQLite (ADR-004) + Sync (ADR-012), istemci tarafında birden fazla "veri durumu" katmanı gerektiriyor: geçici UI durumu, sunucudan gelen veri, kalıcı yerel veri.
- Bu katmanların birbirine karışması, hangi verinin "gerçek" olduğu konusunda kafa karışıklığına ve tutarsız UI'a yol açabilir.
- ADR-001 (React Native + Expo) bu katmanların hangi kütüphanelerle inşa edileceğini bu ADR'ye bırakmıştı.

## Decision
İstemci tarafında **üç ayrı katman** tanımlanır, her biri farklı bir sorumluluğa sahiptir:

| Katman | Araç | Sorumluluk |
|---|---|---|
| **UI State** | Zustand | Geçici, istemci-yerel arayüz durumu (örn. bir modal'ın açık olup olmadığı, bir formun anlık değeri) |
| **Server State** | TanStack Query | Sunucudan gelen/senkronize edilen veri, önbellek/yenileme mantığıyla |
| **Persistent Local Data** | SQLite (ADR-004) | Kalıcı yerel veri kaynağı — bir state store değildir, bir veri kaynağıdır |

**SQLite bir state store değildir** — bu ayrım kritiktir. Zustand ve TanStack Query "durumu" temsil eder (bellek içi, geçici/yenilenebilir); SQLite ise "veriyi" tutar (kalıcı, diske yazılı). Bir ekran, SQLite'ı doğrudan sorgulamaz; SQLite'tan okunan veri, ilgili state katmanına (genellikle TanStack Query aracılığıyla) yüklendikten sonra UI'a ulaşır.

## Single Source of Truth
Her veri parçası için **tek bir doğruluk kaynağı** vardır ve bu kaynak açıkça bellidir:

| Veri Türü | Doğruluk Kaynağı |
|---|---|
| Sunucu otoritatif veri (içerik, entitlement) | Supabase (sunucu) |
| Kullanıcının offline ürettiği veri (çözüm geçmişi) | SQLite (senkronize olana kadar) |
| Geçici UI durumu | Zustand |
| Sunucu verisinin istemci tarafı önbelleği | TanStack Query |

Hiçbir veri, birden fazla katmanda "birincil" olarak tutulmaz — bir katman her zaman diğerinin türetilmiş/önbelleklenmiş kopyasıdır.

## Data Flow
```
Supabase (sunucu)
   → TanStack Query (server state / önbellek)
      → SQLite (gerekiyorsa, kalıcı yerel veri)
         → Learning Engine (ADR-008, analiz/kural işleme)
            → UI / Zustand (sunum ve geçici durum)
```
**UI hiçbir zaman doğrudan Supabase'e veya SQLite'a bağımlı değildir** — her zaman bu akışın üzerinden, kendisine sunulan veriyi tüketir.

## Dependency Direction
```
UI
 → Application Layer
    → State Layer (Zustand / TanStack Query)
       → Persistence Layer (SQLite)
          → Backend (Supabase)
```
Her katman, sadece kendinden bir alt seviyeyi bilir; üst seviyeyi asla bilmez. Bu, Coding Standards'taki (Engineering Foundation) Dependency Direction ilkesinin bu spesifik state mimarisine uygulanmasıdır.

## State Lifetime
| Katman | Ömür |
|---|---|
| Zustand (UI State) | Uygulama oturumu boyunca, genellikle ekran/bileşen ömrüyle sınırlı |
| TanStack Query (Server State) | Yapılandırılabilir; belirli bir süre "taze" kabul edilir, sonra yeniden doğrulanır |
| SQLite (Persistent Local Data) | Kalıcı; kullanıcı silmediği/uygulama kaldırılmadığı sürece kalır |

## Event Driven Updates
Server state güncellemeleri, sürekli polling (sürekli sorgulama) ile değil, **olay tetiklemeli** (event-driven) şekilde gerçekleşir: kullanıcı eylemi, senkronizasyon tamamlanması, uygulama ön plana gelmesi gibi belirli olaylar güncellemeyi tetikler. Sürekli arka plan sorgulaması gerekliliği yoktur.

## Testability
Üç katmanın birbirinden ayrık olması, her birinin bağımsız test edilebilmesini sağlar: Zustand store'ları UI'sız test edilebilir, TanStack Query sorguları sahte (mock) sunucu yanıtlarıyla test edilebilir, SQLite erişimi gerçek bir veritabanı dosyasıyla izole test edilebilir.

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Redux (tek büyük global store) | Server state ve UI state'i aynı store'da yönetmek, önbellek/yenileme mantığını (server state'e özel) elle yeniden inşa etmeyi gerektirir; boilerplate yükü yüksek |
| Context API (React) tek başına | Küçük ölçekte çalışır ama server state'e özel önbellekleme/yeniden deneme/arka plan yenileme gibi ihtiyaçları karşılamaz |
| SQLite'ı doğrudan state store gibi kullanma | Kalıcı depolama ile geçici UI durumunu karıştırır; her state değişikliğinde disk I/O gerektirir, performans ve mimari netlik açısından uygun değil |
| **Zustand (UI) + TanStack Query (Server) + SQLite (Persistence), üç ayrı katman** | **Seçildi** |

## Consequences
- (+) Her katmanın sorumluluğu net; "bu veri nerede tutuluyor" sorusu her zaman tek bir cevaba sahip.
- (+) Server state'e özel ihtiyaçlar (önbellek, yeniden deneme, arka plan yenileme) TanStack Query tarafından hazır karşılanıyor.
- (+) Test edilebilirlik yüksek — katmanlar birbirinden izole test edilebilir.
- (-) Üç farklı kütüphane/katman, tek bir büyük store'a kıyasla öğrenme eğrisi ve başlangıç kurulum karmaşıklığı ekliyor.
- (-) Katmanlar arası veri akışının (Data Flow) doğru uygulanması disiplin gerektiriyor; yanlış kullanılırsa (örn. UI'ın SQLite'ı doğrudan sorgulaması) mimari sınır ihlal edilebilir.

## Risks
| Risk | Açıklama |
|---|---|
| Katman sınırının ihlali | Bir geliştiricinin UI'dan doğrudan SQLite'a veya Supabase'e erişmesi, Dependency Direction'ı bozar |
| Single Source of Truth ihlali | Aynı verinin birden fazla katmanda "birincil" olarak tutulması, tutarsızlığa yol açabilir |
| Gereksiz karmaşıklık | MVP ölçeğinde üç katmanlı yapı, çok basit ekranlar için fazla mühendislik gibi hissedilebilir |

## Mitigations
- Katman sınırının ihlali riski, Repository Pattern Blueprint ve UI Layer Blueprint'teki (Implementation Blueprint aşaması) mimari sınır kurallarıyla azaltılır.
- Single Source of Truth ihlali riski, her veri türü için doğruluk kaynağının bu ADR'de açıkça tablo hâlinde tanımlanmasıyla (Madde: Single Source of Truth) azaltılır.
- Gereksiz karmaşıklık riski, üç katmanın da yaygın, hafif ve MVP ölçeğinde makul bir öğrenme eğrisine sahip kütüphaneler olmasıyla dengelenmiştir.

## Non-Goals
- Zustand/TanStack Query'nin somut konfigürasyon detayları.
- SQLite erişim kütüphanesi seçimi — ADR-004.
- Repository/Application/UI katmanlarının somut implementasyonu — Implementation Blueprint aşaması.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile çelişmiyor.
- [x] ADR-001 (React Native + Expo) ile uyumlu.
- [x] ADR-003/ADR-004 (Offline First / SQLite) ile uyumlu.
- [x] ADR-012 (Synchronization Strategy) ile uyumlu.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-001 (React Native + Expo)
- ADR-003 (Offline First Architecture)
- ADR-004 (SQLite Local Database)
- ADR-008 (Rule Based Learning Engine)
- ADR-012 (Synchronization Strategy)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- Gelecekte değerlendirilebilecek genişletmeler: Background Sync, Push Notifications, Live Updates, AI Mentor katmanı, widget'lar, giyilebilir cihaz entegrasyonu. Bunların hiçbiri şu an karara bağlanmamıştır; üç katmanlı mimari bu genişletmelere kapalı değildir.
