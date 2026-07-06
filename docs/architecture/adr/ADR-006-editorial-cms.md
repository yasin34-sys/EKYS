# ADR-006: Editorial CMS

## Status
Accepted

## Context
- PROJECT_CHARTER.md'nin "Güven" ilkesi (Bölüm 2.1): tüm içerik uzman tarafından hazırlanır ve doğrulanır, tamamen insan kontrolündedir.
- MVP kapsamında bir Editorial Content Management System (ECMS) tanımlanmıştır: "içerik yaşam döngüsünü yöneten profesyonel yönetim sistemi — uzman yazar → editör kontrolü → doğrulama → yükleme → versiyonlama → yayın iş akışı; yazılım geliştirmeden bağımsız, paralel operasyon" (PROJECT_CHARTER.md, Bölüm 9).
- Riskler bölümünde "içerik üretiminin tek kişiye bağımlı olması" ayrı bir operasyonel ölçeklenebilirlik riski olarak kayıtlıdır (PROJECT_CHARTER.md, Bölüm 12).
- Onaylanan içerik, ADR-005'teki Dynamic Content Package mekanizmasıyla kullanıcıya dağıtılır — bu dağıtımın kaynağı ECMS'dir.

**İçerik neden doğrudan veritabanına girilmeyecek?** Doğrudan veritabanı düzenlemesi denetimsizdir: doğrulama adımı, versiyon geçmişi ve geri alma (rollback) imkânı olmadan hatalı/güncel olmayan bir içerik doğrudan kullanıcıya ulaşabilir — bu, "Güven" ilkesiyle doğrudan çelişir.

**İçerik yaşam döngüsü neden yönetilmeli?** Mevzuat değişebilir, hatalı sorular tespit edilip düzeltilebilir, içerik sürekli büyür (Bölüm 9, Bölüm 13). Bu değişikliklerin kim tarafından, ne zaman ve neden yapıldığının izlenebilir olması; hatalı bir yayının geri alınabilmesi gerekir.

## Decision
Editorial CMS'nin temel sorumlulukları:
- İçerik taslaklarının oluşturulması ve durumlarının (draft/inceleme/onaylı/yayında) takip edilmesi.
- Uzman → editör → kalite kontrol → yönetici onay akışının uygulanması.
- İçerik ve paket versiyonlama, revizyon geçmişinin (audit trail) tutulması.
- Onaylanmış içeriğin Dynamic Content Package'lara (ADR-005) dönüştürülüp yayınlanması.
- Rol bazlı erişim/yetkilendirme (kim hangi aşamada hangi işlemi yapabilir).
- Yayınlanmış içerik için geri alma (rollback) mekanizmasının sağlanması.
- **Yayınlama işlemi geri döndürülebilir (rollback) olacak şekilde tasarlanacaktır. Hiçbir içerik yayına alındıktan sonra doğrudan değiştirilmeyecektir. Tüm değişiklikler yeni versiyonlar üzerinden yönetilecektir.**

Bu ADR, ECMS'nin **ne yapması gerektiğini** (sorumluluklar, iş akışı, roller) tanımlar; **hangi yazılımla inşa edileceğini** tanımlamaz (bkz. Non-Goals).

## Workflow
```
Taslak → Uzman Hazırlar → Editör Kontrolü → Kalite Kontrol → Versiyonlama → Yayınlama → Dynamic Content Package Oluşturma → Dağıtım
```
1. **Taslak:** İçerik fikri/ilk taslak oluşturulur, henüz görünür değildir.
2. **Uzman Hazırlar:** Konu uzmanı soruyu/içeriği yazar, kaynak/mevzuat referansı ekler.
3. **Editör Kontrolü:** Dil, format ve doğruluk kontrolü yapılır; gerekirse uzmana geri gönderilir.
4. **Kalite Kontrol:** Editöryal onaydan bağımsız, son bir doğruluk/kalite kontrolü yapılır.
5. **Versiyonlama:** Onaylanan içerik bir versiyon numarası alır, revizyon geçmişine kaydedilir.
6. **Yayınlama:** İçerik "yayına hazır" durumuna geçer.
7. **Dynamic Content Package Oluşturma:** Yayınlanan içerik(ler) ADR-005'teki paket birimlerine dönüştürülür.
8. **Dağıtım:** Paket, ADR-005/ADR-002 mekanizmasıyla kullanıcılara dağıtılır.

## Versioning
- Her içerik parçası (soru, konu anlatımı vb.) kendi versiyon numarasını taşır.
- Bir içerik güncellendiğinde eski versiyon silinmez, revizyon geçmişinde saklanır.
- **Rollback:** Yayınlanmış bir versiyonda hata tespit edilirse önceki onaylı içeriğe dönülebilir; bu işlem içerik önceki hâline dönse de **her zaman yeni, ileri giden bir versiyon numarası** olarak kayda geçer — versiyon numaraları asla geriye gitmez.
- **Revizyon geçmişi:** Kim, ne zaman, neyi değiştirdi bilgisi kalıcı olarak saklanır (audit trail).

## Roles
- **Uzman:** İçerik/soru yazımından sorumludur; mevzuata/kaynağa dayanarak taslak oluşturur.
- **Editör:** Dil, format ve EKYS standartlarına uygunluk kontrolü yapar; uzmana düzeltme talebi gönderebilir.
- **Kontrol (Kalite Kontrol):** Editöryal onaydan geçen içeriğin bağımsız, son bir doğruluk/kalite kontrolünü yapar — farklı bir kişi olmalıdır (four-eyes prensibi).
- **Yönetici:** Yayınlama kararını verir, paket oluşturma/dağıtım sürecini tetikler, rol atamalarını ve rollback kararlarını onaylar.

## Publishing
- **Yeni içerik yayınlama:** Kalite kontrolden geçen içerik, Yönetici onayıyla "yayında" durumuna alınır ve bir Dynamic Content Package'a dahil edilir.
- **Paket güncelleme süreci:** Mevcut bir pakete ait içerik güncellendiğinde (örn. mevzuat değişikliği), aynı paketin yeni bir versiyonu oluşturulur — ADR-005'teki "yalnızca ilgili paket güncellenir" prensibiyle uyumlu.

## Quality Assurance
Yanlış soru yayınlanmasını önlemek, tek bir kişinin onayına dayanmayan, çok aşamalı bir kontrol zinciriyle sağlanır: uzman → editör → kalite kontrol → yönetici onayı (four-eyes prensibi). Hiçbir içerik, tek bir kişinin onayıyla doğrudan yayına geçemez — bu, PROJECT_CHARTER.md Bölüm 12'deki "içerik üretiminin tek kişiye bağımlı olması" riskini azaltan doğrudan bir mimari önlemdir.

## Alternatives Considered
| Seçenek | Değerlendirme |
|---|---|
| Doğrudan veritabanı düzenleme | En hızlı ama denetimsiz; doğrulama/versiyonlama/rollback yok; "Güven" ilkesiyle doğrudan çelişir |
| Admin Panel (basit CRUD arayüzü) | Veritabanı düzenlemesine göre daha güvenli, ama yaşam döngüsü/rol bazlı onay akışı olmadan yine tek kişi hatasına açık |
| **Editorial CMS (yaşam döngüsü + rol bazlı onay akışı)** | **Seçildi** — çok aşamalı kontrol, versiyonlama, rollback ve rol ayrımı sağlıyor |

**Neden Editorial CMS seçildi?** "Güven" ilkesi ve "tek kişiye bağımlılık" riski, sadece bir CRUD arayüzüyle değil, çok aşamalı onay + versiyonlama + rol ayrımı içeren bir sistemle karşılanabilir.

## Consequences
- (+) İçerik kalitesi ve doğruluğu çok aşamalı kontrolle güvence altına alınır.
- (+) Versiyon geçmişi ve rollback imkânı, hatalı içeriğin hızlı düzeltilmesini sağlar.
- (+) Rol ayrımı, tek kişiye bağımlılık riskini azaltır.
- (-) Yayın süreci, doğrudan DB düzenlemesine göre daha fazla adım/zaman gerektirir.
- (-) Rol bazlı iş akışının yönetimi operasyonel disiplin gerektirir; küçük ekiplerde bir kişi birden fazla rolü üstlenirse four-eyes prensibinin etkinliği azalabilir.

## Risks
| Risk | Açıklama |
|---|---|
| Yanlış içerik | Kontrol aşamalarına rağmen hatalı/güncel olmayan bir sorunun yayınlanması |
| Yanlış versiyon | Yanlış paket versiyonunun yayınlanması veya rollback'in yanlış versiyona yapılması |
| İnsan hatası | Editoryal sürecin herhangi bir aşamasında (yazım, kontrol, onay) insan kaynaklı hata |
| Yayınlama hataları | Onaylanan içeriğin pakete doğru dahil edilememesi veya dağıtım sürecinde hata |

## Mitigations
- Yanlış içerik riski, çok aşamalı (uzman → editör → kalite kontrol → yönetici) onay akışıyla azaltılır; hiçbir içerik tek kişinin onayıyla yayına geçemez.
- Yanlış versiyon riski, her içerik ve paketin açık, artan versiyon numaralarıyla takip edilmesi ve rollback işlemlerinin de yeni bir versiyon numarası olarak kayda geçmesiyle azaltılır.
- İnsan hatası riski, rol ayrımı (four-eyes prensibi) ve revizyon geçmişinin (audit trail) tutulmasıyla azaltılır — hata kaynağı geriye dönük tespit edilebilir.
- Yayınlama hataları riski, yayınlama adımının ADR-005'teki paket bütünlük doğrulaması (checksum) ile birleştirilmesiyle azaltılır; bozuk/eksik paket otomatik olarak tespit edilir.

## Non-Goals
- CMS teknolojisinin seçimi.
- Admin panel framework seçimi.
- UI tasarımı.

## Acceptance Criteria
- [x] PROJECT_CHARTER.md ile uyumlu.
- [x] ADR-005 (Dynamic Content Packages) ile uyumlu.
- [x] Kod yazılmadı; sadece mimari karar dokümanı hazırlandı.

## See Also
- ADR-002 (Supabase + PostgreSQL)
- ADR-005 (Dynamic Content Packages)

## Architecture Notes
*(Öneri niteliğindedir, karar değildir.)*
- Somut CMS/admin panel çözümü (mevcut bir headless CMS mi kullanılacak, yoksa Supabase üzerine özel bir arayüz mü inşa edilecek) henüz kararlaştırılmadı; bu, PO/CTO ile ayrıca değerlendirilecek bir konudur.
