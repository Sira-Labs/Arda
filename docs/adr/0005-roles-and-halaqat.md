# ADR-0005: Roles: student, teacher (sheikh), admin; ḥalaqāt as the teaching scope

- Status: accepted; built: policies and tests, ḥalaqa tables and routes (spec T1, migration 0003)
- Date: 2026-10-03
- Source: Suffa ADR-0009 (platform roles + class roles)

## Context

ʿArḍa is built around one relation: a student recites, a sheikh listens and corrects. A sheikh
may teach one-to-one or a circle (_ḥalqa_, plural _ḥalaqāt_). He must hear only the
recitations of students who joined his ḥalaqa.

## Decision

- **Platform role** (`users.role`): `student` (default), `teacher`, `admin`. Only an admin
  changes it (`PATCH /api/v1/admin/users/:id`, audit-logged). A sheikh is a `teacher`.
- **Ḥalaqa role** (`halaqa_members.halaqa_role`, with status `pending | active`): `teacher` or
  `student`. A ḥalaqa may be one-to-one. Students join by invite link or QR code (Suffa's
  invite design: 192-bit token, only its SHA-256 stored, 14 days, the teacher approves).
- **Policies are pure functions** (`apps/api/src/authz/policies.ts`): routes name one action,
  `authorize()` answers 401/403 before the handler runs, and a table-driven test checks every
  action against every role. Current actions: `profile:read|write`, `halaqa:create|manage|
join|read|review`, `admin:users:read|write`, `admin:audit:read`.
- **Scope rules:** `halaqa:manage` and `halaqa:review` need ḥalaqa role `teacher` (admins see
  all); `halaqa:read` needs an active membership. The platform role is checked first, so a
  stale membership row can never widen a student's rights. Scoped actions without a scope are
  denied.
- **Admin actions** need the second factor (ADR-0004). Every privileged change is written to
  the append-only `audit_log`.

## Update 2026-10-03: T1 built

- The invite link is `/beitreten#<token>`: the token sits in the fragment, which browsers never
  send to a server, so it cannot end up in access logs or `Referer` headers. The web app moves
  it out of the address bar and keeps it in the browser's storage only while the person signs
  in. Preview and join send it in a request body.
- A new link revokes the previous one; the teacher can also withdraw it. The token is shown
  once; afterwards the page says only that a link is active and until when.
- A one-to-one ḥalaqa takes one student: joins lock the ḥalaqa row, so two students can never
  both take the place.
- Approving and removing students and making or withdrawing links are audit-logged; deleting
  the teacher's account deletes their ḥalaqāt.

## Alternatives

A separate "sheikh" platform role: rejected; a teacher is a teacher, and the ḥalaqa says whom
he teaches.

## Consequences

Recitations, assignments and the ʿarḍ log (spec 01 F6–F8) all hang off a ḥalaqa and inherit
these checks.
