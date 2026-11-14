# Working on ʿArḍa

Read before changing anything:

- `docs/spec/01-product-spec.md` (what and why), `docs/spec/02-technical-spec.md` (how),
  `docs/spec/04-design-system.md` (look), and the ADRs that touch your change (`docs/README.md`).
- Spec and ADR first, code second: a hard-to-reverse decision gets an ADR in the same PR.

Conventions:

- npm workspaces, Node 22, TypeScript strict, ESM. Prettier and ESLint configs at the root.
- API: Hono with dependency-injected routes; raw `pg` and plain SQL migrations in
  `apps/api/migrations` (never edit an applied migration; add a new one). Every protected route
  names one action from `apps/api/src/authz/policies.ts`; extend the policy test with it.
- Auth is ported from Suffa (ADR-0004). Keep it in step: a fix in one repository is ported to the
  other in the same week and recorded in the port log (`docs/plan/sprint-plan.md`).
- Web: CSS tokens in `apps/web/src/styles/tokens.css`; tajwīd colours always with a label; Arabic
  runs carry `lang="ar" dir="rtl"`.
- Repository text in English; learner-facing text in German.
- Configuration only from `ARDA_*` environment variables; no secrets in code, tests or logs.
- Before committing: `npm run format:check && npm run lint && npm run typecheck && npm test`
  (with `ARDA_TEST_DATABASE_URL` for the Postgres suite). Semantic commit messages.

Autonomous runs (owner, 2026-11-14; ADR-0006 update):

- No plan approval: plan, then implement. A hard-to-reverse decision gets an ADR in the same PR,
  not a question to the owner.
- The agent merges its own PRs: open them ready for review and enable auto-merge, or merge once
  every required check is green and every review thread is resolved. Never with a red or pending
  check; never by weakening a test, a lint rule, a ruleset or a workflow permission.
- One story per run, in the plan's order. What only the owner can give (a secret, an account, a
  server, a licence, the sheikh's answer, a product decision) blocks its story: one "Owner:" line
  under "Waiting on the owner" in `docs/plan/sprint-plan.md`, then the next story.
- Staging only; the production server (S5.3) is the owner's.
- Qurʾānic text, tajwīd rules, pause marks, riwāya data and recordings come only from the sources
  the specs name. Content the sheikh has not reviewed stays marked as draft and unpublished.
