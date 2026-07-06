# Engineering Foundation 15: Testing Strategy

## Status
Accepted

## Purpose
Test felsefesini ve önceliklendirmesini tanımlamak — somut test framework seçimi bu dokümanın kapsamı dışındadır.

## 1. Test Pyramid
Çoğunlukla birim (unit) testler, daha az entegrasyon testi, en az sayıda uçtan uca (e2e) test — hızlı, güvenilir bir test süiti hedeflenir.

## 2. Kritik Test Alanları
| Alan | Neden Kritik |
|---|---|
| Learning Engine (ADR-008) | Kural tabanlı, deterministik çıktılar — yanlış hesaplama doğrudan kullanıcıya yanlış analiz gösterir |
| Entitlement (ADR-007) | Güvenlik ve gelir açısından kritik; yanlış entitlement erişim ihlaline yol açar |
| Security (ADR-011) | Güvenlik açıklarının erken tespiti |
| Offline-Sync (ADR-003/ADR-012) | Veri kaybı/tutarsızlık riski yüksek bir alan |
| Persistence (ADR-004) | Kullanıcı verisinin bütünlüğü |

## 3. Deterministic Test Principle
Testler deterministik olmalıdır — aynı girdiyle her zaman aynı sonucu üretmelidir; rastgelelik/zamanlamaya bağımlı, kararsız (flaky) testler kabul edilmez (Madde 8).

## 4. Test Data Strategy
Testlerde **gerçek kullanıcı verisi kullanılmaz** — sahte/üretilmiş test verisi kullanılır (Security Baseline, Madde 9 ile tutarlı).

## 5. AI-Generated Test Review
AI tarafından üretilen testler de insan review'undan geçer; özellikle "testin gerçekten doğru şeyi test ettiği" doğrulanır (bir testin sadece "geçmesi" yeterli değildir).

## 6. Coverage Philosophy
Test kapsamı (coverage) **tek başına bir kalite göstergesi değildir** — yüksek kapsam, yanlış/yüzeysel testlerle de elde edilebilir. Kritik alanların (Madde 2) doğru test edilmesi, ham kapsam yüzdesinden daha önemlidir.

## 7. Test Priority Matrix
| Öncelik | Alan |
|---|---|
| High | Learning Engine, Entitlement, Security, Offline-Sync, Persistence |
| Medium | Application Layer use case'leri, Repository katmanı |
| Low | UI bileşenleri (görsel/statik), yardımcı fonksiyonlar |

## 8. Flaky Test Policy
Kararsız (flaky) testler **kabul edilmez** — bir test bazen geçip bazen başarısız oluyorsa, bu bir hata olarak ele alınır ve düzeltilir, yok sayılmaz/atlanmaz.

## 9. Testing Review Rule
Test stratejisi, kritik alanlar (Madde 2) değiştiğinde veya genişlediğinde gözden geçirilir.

## Risks
| Risk | Açıklama |
|---|---|
| Yüzeysel testlerle yüksek kapsam yanılsaması | Coverage yüksek görünürken gerçek hataları yakalamaması |
| Flaky testlerin göz ardı edilmesi | Zamanla test süitine güvenin azalması |

## Mitigations
- Coverage Philosophy (Madde 6), kapsam yüzdesinin tek gösterge olmadığını açıkça belirterek yanılsamayı önler.
- Flaky Test Policy (Madde 8), kararsız testlerin hemen düzeltilmesini zorunlu kılar.

## Non-Goals
- Somut test framework seçimi (Jest, Vitest vb.).
- E2E test aracı seçimi (Detox, Maestro vb.).
- Somut coverage hedefi (%).

## Acceptance Criteria
- [x] ADR-003, ADR-004, ADR-007, ADR-008, ADR-011, ADR-012 ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı; araç seçilmedi.

## See Also
- ADR-007 (Entitlement & Premium)
- ADR-008 (Rule Based Learning Engine)
- ADR-011 (Security Strategy)
- ADR-012 (Synchronization Strategy)
