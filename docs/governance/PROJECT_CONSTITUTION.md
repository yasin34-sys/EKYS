# PROJECT CONSTITUTION

Version: 1.0

Status: Active

Date: 2026-07-02

------------------------------------------------------------------------

# Purpose

Bu doküman EKYS CEPTE projesinin anayasal (constitutional) dokümanıdır.

Projede alınacak bütün teknik, mimari ve geliştirme kararları bu doküman
ve referans verdiği belgelerle uyumlu olmak zorundadır.

Bu doküman yeni mimari karar üretmez.

Görevi yalnızca hangi dokümanın hangi öncelikle geçerli olduğunu
tanımlamaktır.

------------------------------------------------------------------------

# Project Philosophy

-   Architecture First
-   Documentation First
-   Planning Before Coding
-   Security By Design
-   Offline First
-   Maintainability First
-   Explicitness Over Magic
-   Long-Term Sustainability
-   Professional Engineering Discipline

Hiçbir kısa vadeli kazanç bu prensiplerin önüne geçemez.

------------------------------------------------------------------------

# Constitutional Hierarchy

## Level 1

-   PROJECT_CHARTER.md

## Level 2

-   Architecture Freeze v1.0

## Level 3

ADR-001 ... ADR-013

## Level 4

Engineering Foundation (01--20)

## Level 5

Implementation Blueprints (01--12)

## Level 6

EKYS_Final_Architecture_Review.md

## Level 7

Development_Governance_Rules.md

------------------------------------------------------------------------

# Conflict Resolution

1.  Üst seviye doküman önceliklidir.
2.  Alt seviye doküman revize edilir.
3.  Kod hiçbir zaman dokümantasyonun önüne geçmez.
4.  Dokümantasyon güncellenmeden kod değiştirilmez.

------------------------------------------------------------------------

# Architecture Lock

Architecture v1.0 dondurulmuştur.

Değişiklik süreci:

Architecture Review

↓

Impact Analysis

↓

Approval

↓

Documentation Update

↓

Implementation

------------------------------------------------------------------------

# Documentation Authority

Gerçek bilgi kaynağı dokümantasyondur.

Kod dokümantasyonu uygular.

------------------------------------------------------------------------

# AI Governance

Her AI ajanı geliştirmeye başlamadan önce aşağıdaki belgeleri
okumalıdır:

-   PROJECT_CHARTER
-   Architecture Freeze
-   ADR-001--ADR-013
-   Engineering Foundation
-   Implementation Blueprints
-   EKYS_Final_Architecture_Review
-   Development_Governance_Rules

------------------------------------------------------------------------

# Architectural Integrity

Korunması zorunlu ilkeler:

-   Dependency Direction
-   Offline First
-   Repository Boundary
-   Trust Boundary
-   Server Authoritative Entitlement
-   Domain Separation
-   Layer Separation
-   Security Principles
-   Documentation First

------------------------------------------------------------------------

# Governance Scope

Bu anayasa tüm geliştiriciler ve tüm AI ajanları için bağlayıcıdır.

------------------------------------------------------------------------

# Project Goal

Amaç yalnızca çalışan bir uygulama geliştirmek değil;

-   sürdürülebilir,
-   ölçeklenebilir,
-   güvenli,
-   okunabilir,
-   test edilebilir,
-   profesyonel

bir yazılım sistemi oluşturmaktır.

------------------------------------------------------------------------

# Amendment Policy

Bu doküman yalnızca resmi bir Architecture Review sonrasında
değiştirilebilir.

Kod hiçbir zaman mimarinin önüne geçemez.

------------------------------------------------------------------------

End of Constitution.
