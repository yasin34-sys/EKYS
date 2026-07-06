# ADR-008: Rule Based Learning Engine

## Status
Accepted

## Context
- PROJECT_CHARTER.md Bölüm 2.1: "Ölçülebilir Gelişim" ilkesi — kural tabanlı, tamamen şeffaf analizlerle hangi konuda başarılı/eksik/gelişiyor net görülür.
- PROJECT_CHARTER.md Bölüm 6: analiz sistemi tamamen istatistiksel ve deterministik kurallarla çalışır; sistem hiçbir zaman soru üretmez veya AI'a bağımlı olmaz.
- Kullanıcı tarafından açıkça hardened edilen ilke: "Bu projede AI kavramını tamamen kaldırıyoruz... Analiz sistemi tamamen istatistiksel ve kural tabanlı çalışacak... Temel sistem hiçbir zaman AI'a bağımlı olmayacak."
- PROJECT_CHARTER.md Bölüm 9: basit, kural tabanlı tekrar sistemi (unutma eğrisi/spaced-repetition MVP'de yok, ama ham kullanım verisi ileride akıllı algoritmalar için loglanır).
- Offline-first mimari (ADR-003): analiz, cihaz üzerinde, ağ gecikmesi olmadan hesaplanmalıdır.

## Decision
- Öğrenme/analiz motoru **tamamen kural tabanlı ve deterministiktir.** Hiçbir bileşeni makine öğrenmesi veya üretken AI'a dayanmaz.
- Motor, kullanıcının soru çözme verisinden (Attempt kayıtları) **açıklanabilir (explainable)** çıktılar üretir — her sonucun hangi kurala dayandığı izlenebilir olmalıdır; "kara kutu" bir çıktı üretilmez.
- Kurallar, kod içine gömülü sabit mantık olarak değil, **kod tabanından ayrıştırılabilir/yapılandırılabilir** şekilde tasarlanır — bir kuralın eşik değerini değiştirmek kod değişikliği gerektirmemelidir (somut mekanizma implementasyon aşamasında).
- Motor **hiçbir zaman kendiliğinden otomatik bir aksiyon başlatmaz** (bkz. Learning Engine Scope).

## Rule Pipeline
```
Question Result (Soru Sonucu)
   → History Update (Geçmiş Güncelleme)
      → Statistics Update (İstatistik Güncelleme)
         → Weak Topic Detection (Zayıf Konu Tespiti)
            → Repeat Pool Update (Tekrar Havuzu Güncelleme)
               → Dashboard Metrics (Dashboard Metrikleri)
                  → Study Recommendations (Çalışma Önerileri)
```
Her adım, kendinden önceki adımın çıktısını girdi olarak alır; hiçbir adım bir öncekini atlayamaz. Bu sıralı, deterministik akış, "açıklanabilirlik" ilkesinin doğrudan uygulamasıdır: bir dashboard metriğinin nereden geldiği, pipeline'ı geriye doğru takip ederek her zaman açıklanabilir.

## Learning Engine Scope
Motorun sorumluluğu tam olarak beştir:
1. **Analiz üretir** — doğru/yanlış/boş oranları, konu bazlı performans.
2. **Tekrar havuzunu yönetir** — yanlış yapılan soruları ekler, doğru çözülince çıkarır.
3. **İlerleme metriklerini hesaplar** — zaman içindeki değişim, konu bazlı gelişim.
4. **Çalışma önerileri üretir** — hangi konuya öncelik verilmeli (kural tabanlı, örn. "en düşük başarı oranına sahip konu").
5. **Dashboard verilerini üretir** — yukarıdaki dördünün kullanıcıya gösterilecek özet hâli.

**Motorun sınırı:** Bu beş sorumluluğun dışına çıkmaz. Motor **kendiliğinden** bir paket indirmesi tetiklemez, bir bildirim göndermez veya bir çalışma planını otomatik olarak uygulamaya koymaz — bunların hepsi kullanıcının kendi eylemine bağlıdır. Motor sadece bilgi/öneri üretir; kararı ve eylemi her zaman kullanıcı verir.

## Rule Extensibility / Configuration
- Kurallar (örn. "zayıf konu" eşiği, tekrar havuzuna ekleme/çıkarma koşulu) kod mantığından ayrıştırılmış, yapılandırılabilir bir biçimde tutulur.
- Bu, yeni bir kuralın veya eşik değişikliğinin, motorun temel mimarisini değiştirmeden yapılabilmesini sağlar.
- Somut yapılandırma formatı/mekanizması bu ADR'nin kapsamı dışındadır (implementasyon detayı).

## Explainability
Her üretilen analiz/öneri, "neden bu sonuç çıktı" sorusuna kod seviyesinde izlenebilir bir cevap verebilmelidir. Bu, "Güven" ve "Ölçülebilir Gelişim" ilkelerinin (PROJECT_CHARTER.md Bölüm 2.1) doğrudan teknik karşılığıdır — kullanıcıya gösterilen her sayının kaynağı belirsiz olamaz.

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Makine öğrenmesi tabanlı öneri motoru | Açıklanabilirlik zayıf ("kara kutu"); PROJECT_CHARTER.md'nin "AI'a bağımlı olmama" ilkesiyle doğrudan çelişir; MVP ölçeğinde yeterli veri de yok |
| Üretken AI ile kişiselleştirilmiş çalışma planı | İçerik/öneri üretiminde güven ve kontrol kaybı riski; "Güven" ilkesiyle çelişir |
| Sabit, kod içine gömülü kurallar (yapılandırılamaz) | Basit ama her kural değişikliği kod değişikliği/deploy gerektirir; esneklik yok |
| **Kural tabanlı, deterministik, yapılandırılabilir motor** | **Seçildi** |

## Consequences
- (+) Tüm çıktılar açıklanabilir ve denetlenebilir.
- (+) Offline çalışabilir — dış bir AI servisine veya ağ bağlantısına bağımlı değildir.
- (+) Kural değişiklikleri kod tabanından ayrıştırılmış olduğu için daha çabuk uygulanabilir.
- (-) Kişiselleştirme derinliği, makine öğrenmesi tabanlı bir sisteme göre daha sınırlıdır.
- (-) Kuralların doğru eşik değerleriyle kalibre edilmesi, gerçek kullanım verisi biriktikçe manuel bir süreç gerektirir.

## Risks
| Risk | Açıklama |
|---|---|
| Yetersiz kişiselleştirme algısı | Kullanıcılar zamanla daha "akıllı" bir sistem bekleyebilir; kural tabanlı motor bunu MVP'de karşılamaz |
| Kural kalibrasyon hatası | Yanlış eşik değerleri (örn. "zayıf konu" tanımı) yanlış/yanıltıcı analiz sonuçlarına yol açabilir |
| Pipeline adımının atlanması/bozulması | Bir adımın (örn. History Update) hatalı çalışması sonraki tüm adımları (Weak Topic Detection, Dashboard) etkiler |
| Kapsam sızıntısı | Motorun "sadece bilgi/öneri üretir" sınırının ihlal edilip otomatik aksiyon eklenmesi (örn. otomatik bildirim) |

## Mitigations
- Yetersiz kişiselleştirme algısı riski kabul edilmiştir; PROJECT_CHARTER.md Bölüm 9'da ham kullanım verisinin MVP'den itibaren loglanması, ileride (ayrı bir karar ve ayrı bir ADR ile) daha akıllı algoritmalara geçişin verisini hazırlar.
- Kural kalibrasyon hatası riski, kuralların yapılandırılabilir olması sayesinde (Madde: Rule Extensibility) hızlı düzeltilebilir; gerçek kullanım verisiyle düzenli gözden geçirme yapılacak.
- Pipeline bütünlüğü, her adımın kendi çıktısını doğrulayan basit invariant kontrolleriyle korunacak (implementasyon detayı).
- Kapsam sızıntısı riski, Learning Engine Scope'un (Madde) açıkça sınırlanmasıyla ve her yeni özellik talebinin bu sınıra karşı değerlendirilmesiyle azaltılır.

## Non-Goals
- Kural motorunun somut yapılandırma formatı/dosya biçimi.
- Makine öğrenmesi/AI entegrasyonu (bu ADR'nin doğrudan reddettiği bir yaklaşım).
- Spaced-repetition/unutma eğrisi algoritması (PROJECT_CHARTER.md Bölüm 10 — MVP Dışı).
- Bildirim/otomatik aksiyon mekanizmaları.
- Dashboard UI tasarımı.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu (kural tabanlı, AI'sız, açıklanabilir analiz).
- [x] ADR-003 (Offline First) ile uyumlu (cihaz üzerinde çalışır).
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-003 (Offline First Architecture)
- ADR-004 (SQLite Local Database)
- ADR-012 (Synchronization Strategy)
