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
