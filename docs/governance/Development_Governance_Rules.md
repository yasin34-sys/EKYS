# Development Governance Rules

Version: 1.0

Status: Active

Date: 2026-07-02

------------------------------------------------------------------------

# Purpose

Bu doküman, Architecture v1.0 tamamlandıktan sonra geliştirme sürecinde
uyulması zorunlu kuralları tanımlar.

Bu kurallar tüm geliştiriciler ve tüm AI ajanları için bağlayıcıdır.

------------------------------------------------------------------------

# Rule 1 --- Documentation First

Koddan önce dokümantasyon gelir.

------------------------------------------------------------------------

# Rule 2 --- Architecture First

Hiçbir implementasyon mimariyi değiştiremez.

------------------------------------------------------------------------

# Rule 3 --- ADR Compliance

ADR kararları ihlal edilemez.

------------------------------------------------------------------------

# Rule 4 --- Repository Boundary

Repository katmanı tek resmi veri erişim noktasıdır.

------------------------------------------------------------------------

# Rule 5 --- Dependency Direction

Katmanlar yalnızca tanımlanan yönde bağımlılık kurabilir.

------------------------------------------------------------------------

# Rule 6 --- Offline First

Offline-first mimari korunmalıdır.

------------------------------------------------------------------------

# Rule 7 --- Security

Server authoritative kuralları ve güvenlik sınırları ihlal edilemez.

------------------------------------------------------------------------

# Rule 8 --- No Business Logic in UI

UI yalnızca sunum katmanıdır.

------------------------------------------------------------------------

# Rule 9 --- Application Layer

Application Layer orkestrasyon yapar; iş akışlarını yönetir.

------------------------------------------------------------------------

# Rule 10 --- AI Generated Code

AI tarafından üretilen tüm kod gözden geçirilmelidir.

------------------------------------------------------------------------

# Rule 11 --- Technology Decisions

Yeni teknoloji, kütüphane veya servis açık onay olmadan eklenemez.

------------------------------------------------------------------------

# Rule 12 --- Architecture Changes

Mimari değişiklik süreci:

Architecture Review

↓

Approval

↓

Documentation Update

↓

Implementation

------------------------------------------------------------------------

# Rule 13 --- Phase Gates

Her büyük faz sonunda AI şunları yapmak zorundadır:

-   Geliştirmeyi durdurmak
-   Phase Completion Report hazırlamak
-   Yapılan işleri özetlemek
-   Değiştirilen dosyaları listelemek
-   Riskleri belirtmek
-   Alınan kararları özetlemek
-   Kullanıcı onayını beklemek

Onay gelmeden sonraki faza geçilemez.

------------------------------------------------------------------------

# Rule 14 --- Recommended Phase Order

1.  Repository Initialization
2.  Foundation Setup
3.  Authentication
4.  Database
5.  Offline Layer
6.  Learning Engine
7.  Premium System
8.  User Interface
9.  Testing
10. Release Preparation

------------------------------------------------------------------------

# Rule 15 --- Source of Truth

Kod değil, dokümantasyon kaynak kabul edilir.

------------------------------------------------------------------------

# Rule 16 --- Quality Standard

Kalite hızdan önemlidir.

Bakım kolaylığı kısa vadeli çözümlerden önemlidir.

Tutarlılık kestirme çözümlerden önemlidir.

------------------------------------------------------------------------

# Rule 17 --- Governance Scope

Bu kurallar aşağıdakiler için geçerlidir:

-   İnsan geliştiriciler
-   Claude
-   ChatGPT
-   Gemini
-   Cursor
-   Copilot
-   Gelecekte projeye katılacak tüm AI ajanları

------------------------------------------------------------------------

End of Development Governance Rules.
