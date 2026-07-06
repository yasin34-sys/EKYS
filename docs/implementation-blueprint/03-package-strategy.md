# Implementation Blueprint 03: Package Strategy Blueprint

## Status
Accepted

## Purpose
Monorepo içindeki paket/workspace felsefesini planlamak. Paket yöneticisi seçimi (Madde 8) bu blueprint'in ilk kabulünde açık bırakılmış, Repository Initialization sonrası Foundation Setup fazında, PO/CTO onayıyla (2026-07-02) çözülmüştür — bkz. Madde 8. Bu, Documentation Update Rule'a (Engineering Foundation 14, Madde 6) uygun, kontrollü bir revizyondur; blueprint'in başka hiçbir kararı değişmemiştir.

## 1. Workspace Philosophy
Monorepo, **pnpm workspaces** mekanizmasıyla yönetilir (Madde 8); her app/package kendi bağımlılıklarını tanımlar, ortak bağımlılıklar mümkün olduğunca tekilleştirilir.

## 2. Mobile App Package
`apps/mobile`, kendi başına çalıştırılabilir/derlenebilir bir paket olarak tanımlanır; shared package(s)'a bağımlı olabilir, admin panele asla bağımlı olamaz (Repository Boundary Rule).

## 3. Admin App Package
`apps/admin`, kendi başına çalıştırılabilir bir paket olarak tanımlanır; mobil uygulamaya asla bağımlı olamaz.

## 4. Shared Packages
Shared package(s), sadece gerçekten paylaşılan domain type/sabit/yardımcı kod içerir; hem mobil hem admin tarafından bağımlılık olarak kullanılabilir, ama shared package hiçbir zaman mobil veya admin'e bağımlı olamaz (tek yönlü bağımlılık).

## 5. Supabase Package Boundary
`supabase/`, **bir paket bile değildir** — bağımlılık grafiğinin bir parçası olmayan, bağımsız bir yapılandırma alanıdır (migration/Edge Functions).

## 6. Root Package Responsibility
Kök (root) seviyesindeki yapılandırma, **sadece tooling** içindir (workspace tanımı, ortak lint/format kuralları); hiçbir iş mantığı kök seviyede yaşamaz.

## 7. Dependency/Lockfile Philosophy
Tüm workspace, tek bir lockfile ile yönetilir (Dependency Management, Madde 6); bir paketin bağımlılık sürümü, diğerleriyle tutarsız/çakışan şekilde kilitlenmez.

## 8. Paket Yöneticisi
**Karar: pnpm.** PO/CTO onayı: 2026-07-02, Foundation Setup fazı (Phase 2). Gerekçe: workspace desteğinin yerleşik olması, content-addressable store ile disk verimliliği ve Repository Boundary Rule'un (Madde 9) gerektirdiği sıkı bağımlılık izolasyonunu doğal olarak desteklemesi. Somut sürüm (`packageManager` alanı) gerçek geliştirme ortamı kurulduğunda sabitlenecektir.

## 9. Repository Boundary Rule'un Paket Seviyesine Taşınması
Repository Strategy'deki (Madde 4) Boundary Rule, paket bağımlılık grafiğinde teknik olarak da uygulanır: bir paketin `package.json`'ındaki bağımlılıklar, bu sınırı ihlal edecek şekilde tanımlanamaz.

## 10. Versioning İçi Paketler
Shared package(s), monorepo içinde ayrı bir sürüm numarasıyla yayınlanmaz (npm registry'ye publish edilmez); workspace içi doğrudan referansla kullanılır.

## 11. Package Script Standardization
Her paket, tutarlı bir script arayüzüne sahip olur (örn. build/test/lint komutlarının her paket için aynı isimle çağrılabilmesi); somut script içerikleri paket yöneticisi seçildiğinde netleşir.

## 12. Workspace-Genişletilmiş Komutlar
Kök seviyeden tüm workspace'i etkileyen komutların (örn. "tüm paketleri test et") çalıştırılabilir olması hedeflenir; bu, Root Package Responsibility'nin (Madde 6) tooling sorumluluğunun bir parçasıdır.

## 13. Paket Sorumluluk Dokümantasyonu
Her paket, kendi sorumluluğunu (ne işe yaradığını, ne içermediğini) kısaca açıklayan bir dokümantasyona sahip olur — Documentation Strategy (Engineering Foundation Madde 14) ile tutarlı.

## 14. Bağımlılık Onay Süreci Paket Seviyesinde
Bir pakete yeni bir bağımlılık eklenmesi, Dependency Management'taki (Engineering Foundation Madde 16) Approval Rule ve Minimal Dependency Principle'a tabidir; bu, paket seviyesinde de aynen geçerlidir.

## 15. Peer Dependency Philosophy
Paketler arası paylaşılan bağımlılıklar (örn. aynı çatı kütüphanesinin sürümü), çakışmayı önlemek için mümkün olduğunca tek bir sürümde hizalanır.

## 16. Paket Testability
Her paket, kendi başına — diğer paketlerin çalışan bir kopyasına ihtiyaç duymadan — test edilebilir olmalıdır (Testing Strategy, Engineering Foundation Madde 15 ile tutarlı).

## 17. Paket Yayın/Publish Politikası
Shared package(s), Madde 10'daki karara tutarlı olarak, harici bir registry'ye (npm) yayınlanmaz. Gelecekte bir paketin gerçekten dışa açılması gerekirse (örn. açık kaynak bir SDK), bu ayrı, açık bir karar olarak ele alınır — bu blueprint'in kapsamında değildir.

## 18. Paket Yapısı Değişiklik Politikası
Paket sınırlarında bir değişiklik (örn. yeni bir shared package eklenmesi) gerekirse, bu sessizce yapılmaz; Documentation Strategy'deki Review/Update Rule'a tabi olarak, gerekçeli şekilde bu dokümana yansıtılır.

## Risks
| Risk | Açıklama |
|---|---|
| Yanlış yönlü bağımlılık | Shared package'ın mobil/admin'e bağımlı hâle gelmesi |
| Lockfile tutarsızlığı | Paketler arası çakışan bağımlılık sürümleri |

## Mitigations
- Shared Packages (Madde 4) tek yönlü bağımlılık kuralını açıkça sabitler.
- Tek lockfile (Madde 7) ile sürüm tutarsızlığı önlenir.

## Non-Goals
- Somut `packageManager` sürüm sabitlemesi (implementasyon aşamasında, gerçek ortamda yapılacak).
- Paket başına bağımlılıkların (framework, kütüphane) seçimi.

## Acceptance Criteria
- [x] Repository Strategy ve Physical Folder Structure Blueprint ile uyumlu.
- [x] Paket yöneticisi kararı (Madde 8) PO/CTO onayıyla alındı, sessizce yapılmadı.
- [x] Root `package.json` ve `pnpm-workspace.yaml` dışında hiçbir dosya/paket/bağımlılık oluşturulmadı.

## See Also
- Engineering Foundation 04 (Repository Strategy)
- Engineering Foundation 16 (Dependency Management)
- Implementation Blueprint 02 (Physical Folder Structure)
