# EKYS CEPTE — Doküman 00: Vizyon & Proje Şartnamesi

| | |
|---|---|
| **Versiyon** | 1.0 |
| **Durum** | Onaylandı (Approved) |
| **Tarih** | 2026-07-01 |
| **Kapsam** | Faz A — Keşif ve Ürün Tanımı |
| **Not** | Bu doküman projede "PROJECT_CHARTER.md" olarak referans alınır. |

### Doküman Amacı
Bu doküman, EKYS CEPTE ürününün vizyonunu, hedef kullanıcısını, temel değer önerisini, iş modelini, MVP kapsamını ve uzun vadeli stratejisini tanımlar. Sonraki tüm mimari ve tasarım dokümanları bu dokümana dayanır; buradaki kararlarla çelişen hiçbir teknik karar alınmaz.

---

## 1. Proje Adı
**EKYS CEPTE**

---

## 2. Ürün Vizyonu
EKYS'ye hazırlanan bir öğretmenin, hazırlık sürecinin **tamamını** tek bir uygulama içinde yönetebilmesini sağlamak. EKYS CEPTE bir "dijital soru bankası" değildir; konu çalışma, soru çözme, deneme sınavı, hata tekrarı ve ilerleme takibini bir araya getiren profesyonel bir hazırlık platformudur.

**Akış:** Doğru İçerik → Doğru Analiz → Doğru Tekrar → Ölçülebilir Gelişim → Doğru Sonuç.

**Marka hedefi:** Kullanıcının "EKYS çalışacaksam önce EKYS CEPTE'yi açarım" dediği, kategori standardı haline gelen uygulama olmak.

### 2.1 Temel Değerler (Core Value Proposition)
Ürünün beş değişmez ilkesi — bundan sonraki her bölüm bu ilkelere referansla değerlendirilir:

| İlke | Anlamı |
|---|---|
| **Güven** | Tüm içerik uzman tarafından hazırlanır ve doğrulanır. Soru üretimi tamamen insan kontrolündedir; içerik hiçbir zaman otomatik veya yapay zekâ tabanlı sistemlerle üretilmez. |
| **Düzenli Çalışma** | Amaç soru çözdürmek değil, hazırlık sürecini planlı ve yönetilebilir kılmak. |
| **Ölçülebilir Gelişim** | Kural tabanlı, tamamen şeffaf analizlerle: hangi konuda başarılı, hangi konuda eksik, hangi konuda gelişiyor net görülür. |
| **Profesyonel Kullanıcı Deneyimi** | Amatör bir quiz uygulaması hissi değil, profesyonel bir eğitim platformu hissi. |
| **Verimlilik** | EKYS CEPTE kullanıcıya daha fazla soru çözdürmeyi değil, aynı sürede daha verimli çalışmasını sağlamayı hedefler. |

Bu beş ilkenin üzerine özellik eklenebilir; ancak kendileri değişmez.

---

## 3. Problem Tanımı
EKYS adayları şu anda basılı soru bankaları, PDF dosyaları, Telegram/WhatsApp gruplarında paylaşılan sorular ve dağınık notlarla — birbirinden kopuk kaynaklarla — çalışıyor. Rekabet araştırması bunu doğruluyor: mevcut ekosistem gerçekten parçalı (konu anlatımı YouTube'da, test çözme bir uygulamada, güncel soru/topluluk paylaşımı Telegram'da, referans kaynak PDF/kitapta) ve Telegram/WhatsApp gibi kaynaklarda içerik doğrulaması yok.

Bunun sonucunda aday: hangi konuda eksik olduğunu göremiyor, ilerlemesini takip edemiyor, yanlışlarını düzenli tekrar edemiyor ve gerçek sınav deneyimini yaşayabileceği kaliteli, güvenilir tek bir mobil platform bulamıyor.

---

## 4. Hedef Kullanıcı Kitlesi
MEB'e bağlı okullarda **müdür, müdür başyardımcısı veya müdür yardımcısı** olmak isteyen, ÖSYM tarafından MEB adına düzenlenen EKYS'ye giren öğretmenler (müdürlük için ≥8 yıl, müdür yardımcılığı için ≥2 yıl kıdem şartı olan tanımlı, profesyonel bir aday grubu).

Ürün, kullanıcıyı **unvanına göre değil, bilgi/performans seviyesine göre** segmentler:
- **Zorluk seviyeleri:** Kolay / Orta / Zor
- **Paket tipleri:** Temel Çalışma / Yoğun Tekrar / Zorlayıcı Deneme

Bu sayede hem ilk kez hazırlanan bir aday hem de yıllardır hedefleyen deneyimli bir öğretmen aynı platformu, kendi seviyesine göre kullanabilir. İlk sürümde müdür/müdür yardımcısı adayları arasında öncelik ayrımı yapılmaz.

---

## 5. Kullanıcının Temel İhtiyaçları
- Hangi konuda güçlü/zayıf olduğunu net görmek
- Zamanını verimli kullanmak (rastgele değil, zayıf konuya odaklı çalışmak)
- Gerçek sınav koşullarını simüle edebilmek (80 soru / 150 dakika formatına yakın)
- Yaptığı hatadan öğrenmek ve düzenli tekrar edebilmek
- İlerlemesini somut olarak görmek

---

## 6. Uygulamanın Çözüm Önerisi
Dört sütun, Bölüm 2.1'deki temel değerlerin doğrudan ürün karşılığıdır:

1. **Konu bazlı çalışma** — zorluk seviyesi ve paket tipine göre yapılandırılmış soru havuzu.
2. **Kural tabanlı analiz motoru** — yanlış/boş cevaplardan zayıf-konu tespiti, başarı oranı hesaplama ve gelişim eğrisi çıkarımı; tamamen istatistiksel ve deterministik kurallarla çalışır.
3. **Basit tekrar sistemi** — yanlış yapılan sorular otomatik olarak tekrar havuzuna eklenir, konu bazlı/genel filtrelenebilir, doğru çözülünce havuzdan çıkar.
4. **Deneme sınavı simülasyonu** — gerçek formata yakın, zamanlı, sonuç analiziyle biten denemeler.

Sistemin mimari rolü bir **Question Management System (QMS)**'tir: soruları yönetmek, kategorilere ayırmak, paketlemek, kullanıcıya sunmak, offline senkronize etmek, performans analizini kural tabanlı olarak yapmak, içerik güncellemelerini yönetmek. Sistem hiçbir zaman soru üretmez, içerik yazmaz veya soru bankasını kendisi oluşturmaz.

Ürünün çekirdek işlevleri hiçbir zaman yapay zekâya bağımlı değildir. İleride değerlendirilebilecek bir yapay zekâ modülü, yalnızca bu kural tabanlı çekirdeğin üzerine **opsiyonel bir ek katman** olarak konumlanabilir; ürünün temel çalışma mantığı bu modülün varlığına bağlı olmaz.

---

## 7. EKYS CEPTE'nin Rakiplerden Farkı
Rekabet analizinde (mobil uygulamalar, web platformları, yayınevi soru bankaları, YouTube kanalları, Telegram/WhatsApp toplulukları, sendika kaynakları) dört boşluk tespit edildi:

| Boşluk | Rakip Durumu | EKYS CEPTE |
|---|---|---|
| Entegrasyon | Dağınık: YouTube + uygulama + Telegram + PDF | Uçtan uca tek platform |
| Kişiselleştirme | "Çok soru" satan hacim odaklı test motorları | Sistematik zayıf-konu tespiti + tekrar mantığı |
| Güven | Hacim odaklı mesajlaşma ("binlerce soru"), doğrulama yok | Uzman doğrulamalı içerik, insan kontrollü üretim |
| Segmentasyon | Yok, ya da unvan bazlı | Bilgi seviyesine göre (Kolay/Orta/Zor) |

---

## 8. Ücretsiz / Premium İş Modeli
- **Ücretsiz katman:** Uygulama ücretsiz indirilir; ilk 100 soru + 1 örnek deneme ücretsiz.
- **Premium (MVP):** Tek seferlik satın alma, **ömür boyu erişim** — tüm paketler, tüm denemeler, detaylı istatistikler, tekrar sistemi, içerik güncellemeleri dahil. Abonelik modeli kullanılmaz.
- **Paywall ekranı:** Sadece ödeme talebi değil; kullanıcının o ana kadarki ilerlemesini (çözülen soru sayısı, başarı oranı) gösteren motive edici bir ekran.
- **Stratejik gerekçe:** EKYS sürekli kullanılan bir servis değil, dönemsel bir hazırlık süreci; bu nedenle abonelik yerine tek seferlik model tercih edildi. Amaç ilk kullanıcı kitlesini kazanmak ve güven oluşturmaktır.
- **Mimari not (bkz. Bölüm 12):** v1'de tek/evrensel Premium hakkı sunulsa da, veri modeli "kullanıcı → paket bazlı haklar (entitlement)" şeklinde esnek kurulacaktır; ileride hibrit/paket bazlı lisanslamaya geçiş mevcut kullanıcıları bozmadan mümkün olmalıdır.

---

## 9. MVP 1 Kapsamı
- Konu bazlı çalışma: Kolay/Orta/Zor seviyeler + Temel Çalışma/Yoğun Tekrar/Zorlayıcı Deneme paketleri
- Zamanlı deneme sınavı simülasyonu
- Konu bazlı doğru/yanlış/boş analiz
- Basit, kural tabanlı tekrar sistemi (unutma eğrisi ve otomatik hatırlatma yok)
- İlerleme takibi
- **Offline-first mimari:** kullanıcı online'ken paket indirir → cihazda **yerel veritabanına (SQLite)** kaydedilir → paket içeriği (soru çözme, kontrol, tekrar, analiz) cihaz üzerinde çalışır → bağlantı gelince Last-Write-Wins ile senkronize olur. Sunucu yalnızca auth, premium kontrolü, içerik güncelleme, paket dağıtımı, senkronizasyon ve editoryal yönetim için kullanılır.
- Ücretsiz/Premium ayrımı ve motive edici paywall ekranı
- **Editorial Content Management System (ECMS):** içerik yaşam döngüsünü yöneten profesyonel yönetim sistemi — uzman yazar → editör kontrolü → doğrulama → yükleme → versiyonlama → yayın iş akışı; yazılım geliştirmeden bağımsız, paralel operasyon.
- iOS ve Android'de eşzamanlı lansman, tek kod tabanı (React Native + Expo — yönelim olarak not edildi, Faz B'de ADR ile teyit edilecek)
- Faz 2 büyüme metrikleri için gerekli event/telemetri altyapısı (veri toplama MVP'den başlar, akıllı algoritmalar sonra eklenir)
- Ürün, belirli bir sınav yılına/dönemine bağlı olarak planlanmaz; hazır olduğunda yayınlanır, içerik sonrasında sürekli güncellenir.

---

## 10. MVP Dışı Bırakılacaklar
- Unutma eğrisi bazlı akıllı tekrar zamanlaması, otomatik çalışma planı önerisi (gerçek kullanım verisiyle ileride geliştirilecek)
- Sosyal özellikler (liderlik tablosu, arkadaş karşılaştırma)
- Çoklu sınav desteği (mimari buna hazır olacak, ürün odağı değil)
- Öğretmen/kurum paneli, toplu lisans satışı
- Dönem/paket bazlı hibrit içerik lisanslama satışı (mimari izin verecek, v1'de aktif satılmayacak)
- Karmaşık çoklu-cihaz çakışma yönetimi

---

## 11. Başarı Kriterleri
**Faz 1 — Ürün Doğrulama:** Hedef büyük sayılar değil. İlk 100–500 gerçek EKYS adayının aktif kullanımı ve niteliksel geri bildirimi: kullanılabilirlik, içerik kalitesi algısı, analiz ekranı anlaşılırlığı, tekrar sisteminin gerçekten kullanılması, Premium modelinin mantıklı gelmesi, tavsiye etme isteği.

**Faz 2 — Büyüme:** DAU/MAU, 7/30 gün retention, ücretsiz→Premium dönüşüm oranı, ortalama soru çözme süresi, günlük çözülen soru sayısı, tekrar sistemi kullanım oranı, deneme tamamlama oranı, mağaza puanı (hedef 4.8+), NPS.

**Felsefe:** "Çok kullanıcı" değil "doğru kullanıcı." MVP'nin başarısı, ilk gerçek adayların ürüne güvenmesi ve severek kullanmasıdır.

---

## 12. Riskler ve Varsayımlar

**Varsayımlar:**
- EKYS her yıl/dönem yeterli sayıda yeni aday ile sürekliliğini koruyacaktır.
- Adaylar mobil uygulamayla çalışmaya açıktır.
- Kullanıcı aynı hesabı eşzamanlı birden fazla cihazda aktif kullanmayacaktır (Last-Write-Wins senkronizasyonunun dayandığı varsayım).

**Riskler:**
| Risk | Açıklama | Not |
|---|---|---|
| İçerik güncelliği | Mevzuat değişirse, offline paketi indirmiş kullanıcı eski/hatalı içerikle çalışabilir | Paket versiyonlama + güncelleme uyarısı gerekli (bkz. Bölüm 9) |
| İçerik koruma/sızıntı | Şifrelenmemiş yerel veritabanı (SQLite) paketleri çıkarılıp dağıtılabilir | Rakip olarak tanımlanan kontrolsüz paylaşım modelini besleyebilir |
| İçerik üretim kapasitesi | Hedeflenen soru hacmine (5000+) hazır bir kadro henüz yok | İçerik ve yazılım paralel ilerleyecek; kalite/hız dengesi izlenmeli |
| Rakiplerin ücretsiz çekim gücü | YouTube ve Telegram tamamen ücretsiz | Ödeme direncine karşı Güven ve UX farkı öne çıkarılmalı |
| Tek sınava bağımlılık | İş modeli EKYS'nin sürekliliğine bağlı | Bilinçli bir odaklanma kararı (bkz. Bölüm 13), ama pazar riski olarak takip edilmeli |
| Mağaza bağımlılığı | İçerik güncellemeleri App Store/Play Store incelemesine bağlı olmamalı | Mimari önlemi alındı — içerik binary'ye gömülmeyecek, sunucudan dinamik dağıtılacak |
| İçerik üretim bağımlılığı | İçerik üretiminin tek kişiye bağımlı olması ileride operasyonel ölçeklenebilirlik riski oluşturabilir. | İçerik ekibi/operasyonunu büyütme planı, ileride Faz D (Monetizasyon & Operasyon) dokümanında ele alınmalı. |

---

## 13. Uzun Vadeli Ürün Vizyonu
İlk ve tek hedef: EKYS alanında tartışmasız referans, en kaliteli ve en güvenilir uygulama olmak. Başka sınavlara açılmak bugünün hedefi değildir — "önce bir işi mükemmel yap, sonra genişle" yaklaşımı benimsenmiştir.

Mimari (uygulama adı, içerik yapısı, veritabanı, editoryal içerik yönetim sistemi, paket sistemi, offline mimari, analiz sistemi) gelecekte farklı sınavlara (KPSS, ALES, DGS, YDS, AGS, Uzman Öğretmenlik, Başöğretmenlik) uyarlanabilir şekilde tasarlanacaktır — ancak bu yalnızca mimari hazırlıktır; ürün ve iş odağı ilk yıllarda tamamen EKYS'de kalacaktır.

> **Temel mimari prensip:** İş modeli tek sınava odaklı olabilir; ancak yazılım mimarisi hiçbir zaman tek sınava bağımlı olmamalıdır.

---

## 14. Ürün Tasarım Prensipleri
- Basitlik, karmaşıklıktan önce gelir.
- Performans, gösterişli animasyonlardan önce gelir.
- Güvenilir içerik, içerik miktarından önce gelir.
- Kullanıcı deneyimi, özellik sayısından önce gelir.
- Ölçülebilir gelişim, rastgele soru çözmekten daha değerlidir.
- Aynı sürede daha verimli çalıştırmak, daha fazla soru çözdürmekten daha önemlidir.
- Yazılım mimarisi uzun ömürlü olacak şekilde tasarlanır.
- Kod değil, ürün geliştirilir.

---

## Ek: Faz B'ye Taşınan Açık Mimari Notları
1. React Native + Expo seçimi, alternatiflerle (Flutter, native) karşılaştırmalı bir ADR'ye dökülmeli.
2. Offline paketler için versiyonlama + "içerik güncellendi" bildirim mekanizması tasarlanmalı.
3. Yerel veritabanı (SQLite) paketleri için şifreleme/obfuscation stratejisi belirlenmeli.
4. İçerik paketleri asla app binary'sine gömülmemeli; her zaman sunucudan dinamik indirilebilir olmalı.
5. Kullanıcı → paket bazlı haklar (entitlement) veri modeli, tek SKU'dan hibrit modele geçişe izin verecek şekilde tasarlanmalı.
6. Faz 2 KPI'ları için event/telemetri şeması MVP kapsamında (KVKK uyumlu şekilde) tanımlanmalı.
