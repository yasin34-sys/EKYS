# EKYS CEPTE

## Project Purpose

EKYS CEPTE is a professional exam-preparation platform for teachers preparing
for Turkey's EKYS (Eğitim Kurumlarına Yönetici Seçme Sınavı). It brings
topic-based study, exam simulation, mistake analysis, and progress tracking
together in a single, trustworthy application — replacing the fragmented mix
of disconnected sources candidates currently rely on.

## Repository Structure

| Path | Purpose |
|---|---|
| `apps/mobile/` | The candidate-facing mobile application. |
| `apps/admin/` | The editorial/administrative panel used to manage content. |
| `packages/` | Code shared between the applications. |
| `supabase/` | Backend configuration. |
| `docs/` | All project documentation. |
| `.github/` | Repository automation configuration. |

Each folder is currently a placeholder — this repository is in its
initialization phase and does not yet contain application code.

## Documentation Location

All documentation lives under [`docs/`](./docs):
- `docs/PROJECT_CHARTER.md` — the product vision and constitution-level document.
- `docs/architecture/` — the Architecture Freeze declaration and all Architecture Decision Records (ADR-001–013).
- `docs/engineering/` — the Engineering Foundation (process and standards, 01–20).
- `docs/implementation-blueprint/` — pre-implementation planning blueprints (01–12).

## Governance Location

All governance documents live under [`docs/governance/`](./docs/governance):
`README.md`, `PROJECT_CONSTITUTION.md`, `EKYS_Final_Architecture_Review.md`,
and `Development_Governance_Rules.md`.

## Required Reading Order for Contributors

Every contributor — human or AI — must read the following before touching
this repository, in this order (canonically defined in
`docs/governance/README.md`):

1. `docs/governance/PROJECT_CONSTITUTION.md`
2. `docs/PROJECT_CHARTER.md`
3. `docs/architecture/ARCHITECTURE_FREEZE_v1.0.md`
4. `docs/architecture/adr/ADR-001` → `ADR-013`
5. `docs/engineering/01` → `engineering/20`
6. `docs/implementation-blueprint/01` → `implementation-blueprint/12`
7. `docs/governance/EKYS_Final_Architecture_Review.md`
8. `docs/governance/Development_Governance_Rules.md`

Do not begin implementation before understanding these documents.
