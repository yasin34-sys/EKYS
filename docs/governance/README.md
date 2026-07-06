# Governance README

Welcome to the governance layer of the EKYS CEPTE project.

This folder contains the documents that define **how the project must be
developed** before any implementation details are considered.

## Reading Order

Every developer or AI assistant joining the project should read the
documents in the following order:

1.  PROJECT_CONSTITUTION.md
2.  PROJECT_CHARTER.md
3.  ARCHITECTURE_FREEZE_v1.0.md
4.  ADR-001 → ADR-013
5.  Engineering Foundation (01--20)
6.  Implementation Blueprints (01--12)
7.  EKYS_Final_Architecture_Review.md
8.  Development_Governance_Rules.md

Do not begin implementation before understanding these documents.

------------------------------------------------------------------------

## Governance Principles

The following principles are mandatory:

-   Documentation First
-   Architecture First
-   Security by Design
-   Offline First
-   Repository Boundary
-   Dependency Direction
-   Server Authoritative Security
-   Long-term Maintainability

------------------------------------------------------------------------

## Phase Gate Policy

Implementation is divided into major phases.

At the end of every major phase the AI assistant MUST:

-   Stop implementation.
-   Produce a Phase Completion Report.
-   Summarize completed work.
-   List changed files.
-   List architectural decisions.
-   Identify risks and open questions.
-   Wait for explicit user approval.

Do not continue until approval is received.

------------------------------------------------------------------------

## Architecture Changes

Architecture is considered locked.

Any architectural modification must follow:

Architecture Review

↓

Approval

↓

Documentation Update

↓

Implementation

Never change the architecture directly in code.

------------------------------------------------------------------------

## Purpose of this Folder

This folder exists to ensure that:

-   The project is not dependent on chat history.
-   New developers can onboard quickly.
-   AI assistants follow the same rules.
-   Documentation remains the source of truth.

------------------------------------------------------------------------

End of README.
