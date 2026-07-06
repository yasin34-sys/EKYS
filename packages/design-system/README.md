# design-system

Shared design system package for EKYS CEPTE.

**Source of truth:** [`docs/implementation-blueprint/04-design-system.md`](../../docs/implementation-blueprint/04-design-system.md).
Nothing in this package may contradict that document. If this README and the
Blueprint ever disagree, the Blueprint wins.

## Status

Empty scaffold. No colors, fonts, icons, tokens, or components exist yet.

## Styling Approach

React Native `StyleSheet` + custom design tokens (Hybrid approach, approved
2026-07-02). No full component library, no NativeWind/Tailwind-style system.
Small, single-purpose UI libraries (e.g. for charts) may be added later, only
when justified and only through the Dependency Approval Rule
(Engineering Foundation 16).

## Consuming Packages

`apps/mobile` and `apps/admin` may depend on this package. This package must
never depend on either of them (Repository Boundary Rule).
