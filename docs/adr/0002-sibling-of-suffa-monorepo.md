# ADR-0002: A separate repository, built from Suffa's skeleton (npm workspaces monorepo)

- Status: accepted
- Date: 2026-10-03

## Context

Suffa already has most of what a learning app with teachers needs: sign-in, roles and
classes, offline-first PWA, engagement (XP, quests, streaks), al-Muʿallim and the LLM gateway,
pronunciation checks, teacher recordings, CapRover deployment, CI and backups. ʿArḍa's
audience (Qurʾān students and their sheikh), its content and its content rights differ
(ADR-0009), and it needs its own domain and release cadence.

## Decision

- **Own repository** `Sira-Labs/arda`, **own domain** and **own CapRover apps**.
- **Same skeleton as Suffa**: npm workspaces (`apps/*`, `packages/*`), Node 22, TypeScript,
  Hono API with raw `pg` and plain SQL migrations, React + Vite PWA, Vitest, ESLint flat
  config and Prettier with Suffa's settings.
- **Copy, then share.** Parts are ported from Suffa with their tests and renamed (`SUFFA_*` →
  `ARDA_*`), keeping comments that say where they came from. Once a part is stable in both
  apps and changes in lockstep (auth first, then engagement), it moves into a shared package
  published from one repository. Until then a fix in one is ported to the other in the same
  week (tracked in `docs/plan/sprint-plan.md`).
- Repository content is English; learner-facing text is German first (spec 01 §6).

## Alternatives

- **A course inside Suffa**: fastest, but mixes two audiences, two content licences and two
  release cycles, and Suffa's navigation is built around a textbook.
- **Shared packages from day one**: right in the long run, but it would block both projects on
  a package refactor before ʿArḍa has its first user.

## Consequences

Duplicate code for a while, with a written rule for keeping it in step. Suffa's ADRs stay the
reference for the ported parts; ʿArḍa's ADRs say only what differs.

## Update 2026-10-03: the api bundles the shared packages

The packages under `packages/` stay TypeScript source without a build of their own. The web
app compiles them with Vite; the api, which first imports them for assignments (T2), is now
built by esbuild into one ESM file that inlines `@arda/*` and leaves the npm packages external,
after `tsc` has checked the types. The runtime image is unchanged otherwise: production
dependencies only, no test tooling.
