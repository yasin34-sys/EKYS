# Engineering Foundation 03: Environment Variable Strategy

## Status
Accepted

## Purpose
Ortam değişkenlerinin (environment variables) sınıflandırılmasını, doğrulanmasını ve ortamlar arası yönetimini tanımlamak.

## 1. Public / Private / Critical Sınıflandırma
| Sınıf | Örnek | İstemciye Görünür mü? |
|---|---|---|
| Public | Supabase URL, anon key | Evet |
| Private | Sunucu tarafı yapılandırma | Hayır |
| Critical | Service Role Key, signing credential | Hayır, sadece CI/CD ve güvenli depolama |

## 2. Client vs. Server
İstemci tarafı (mobil uygulama) koduna sadece Public sınıfındaki değişkenler dahil edilir. Private/Critical değişkenler sadece sunucu tarafında veya build/CI ortamında bulunur.

## 3. Validation
Uygulama başlatıldığında, gerekli ortam değişkenlerinin var olduğu doğrulanır; eksik/geçersiz bir değişken sessizce yok sayılmaz (Fail Secure, ADR-011).

## 4. Missing Variable Policy
Kritik bir ortam değişkeni eksikse, uygulama/build **başarısız olur** (fail-fast) — eksik yapılandırmayla "kısmen çalışan" bir sistem tercih edilmez.

## 5. Environment Switching
Development/staging/production ortamları arasında geçiş, kod değişikliği gerektirmeden, sadece ortam değişkenleri aracılığıyla yapılabilir.

## 6. CI/CD
CI/CD pipeline'ı, her ortam için doğru ortam değişkeni setini kullanır (Secrets Management Strategy, Madde 6 ile ilişkili).

## 7. .env.example Dokümantasyonu
Her ortam değişkeni, `.env.example` içinde adı ve kısa açıklamasıyla (gerçek değer olmadan) dokümante edilir.

## 8. Environment Versioning
Ortam değişkeni şemasında (hangi değişkenlerin var olduğu) yapılan değişiklikler, geriye dönük uyumluluk gözetilerek yapılır; bir değişkenin adı/anlamı sessizce değiştirilmez.

## 9. Deprecation Policy
Kullanılmayan bir ortam değişkeni hemen silinmez; deprecated olarak işaretlenir, bir süre sonra kaldırılır (Documentation Strategy, Madde 8 ile tutarlı).

## 10. Environment Documentation
Her ortamın (dev/staging/prod) hangi amaca hizmet ettiği ve nasıl kurulacağı dokümante edilir.

## Risks
| Risk | Açıklama |
|---|---|
| Yanlış ortamda yanlış değişken | Production değişkeninin development'ta (veya tersi) kullanılması |
| Sessiz eksik değişken | Doğrulama olmadan eksik bir değişkenin fark edilmeden çalışmaya devam etmesi |

## Mitigations
- Validation (Madde 3) ve Missing Variable Policy (Madde 4) ile eksik/yanlış yapılandırma erken, açık şekilde hata verir.
- Ortam bazlı ayrım (Secrets Management Strategy, Madde 2) yanlış ortam kullanımını engeller.

## Non-Goals
- Somut ortam değişkeni adlarının/değerlerinin listesi — implementasyon aşaması.
- Yapılandırma yönetim aracının seçimi.

## Acceptance Criteria
- [x] Security Baseline ve Secrets Management Strategy ile uyumlu.
- [x] Kod/dosya/repo oluşturulmadı.

## See Also
- Engineering Foundation 01 (Security Baseline)
- Engineering Foundation 02 (Secrets Management Strategy)
- ADR-011 (Security Strategy)
