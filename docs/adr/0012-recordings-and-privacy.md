# ADR-0012: Recordings and privacy: private by default, only the teacher hears them

- Status: accepted
- Date: 2026-10-03

## Context

A recitation is a recording of a person's voice. Students may be minors. Recordings are the core
of step 5 of the loop ("recite") and of the teacher's listening queue.

## Decision

- Recordings are stored in the private bucket `arda-recordings` on the shared RustFS, never on
  a third-party service, and reached only through short-lived presigned URLs served under
  `/media/` on the app's own origin.
- **Who hears what:** the student, and the teachers of the ḥalaqa the recording was sent to
  (`halaqa:review`, ADR-0005). Admins cannot listen without an audit-logged reason.
- **Consent:** the first recording asks for consent; for students under 16 a guardian's
  consent is recorded by the teacher. Live lessons are recorded only when every participant
  agrees (ADR-0015).
- **Retention:** recordings are kept until the student deletes them or the account; the
  teacher's verdicts and marks stay in the ʿarḍ log as text.
- **No training without consent:** recordings are used to improve the speech check only with a
  separate, revocable opt-in (ADR-0013).
- The GDPR export (account page) lists recordings and their marks; deletion removes them.

## Consequences

The microphone is allowed only for the app's own origin (`Permissions-Policy`), and recording
works offline with upload from the outbox.

## Update 2026-10-06: built before the bucket

The owner wants the sheikh to hear recitations before the RustFS buckets exist, so S4.1 and
S4.2 shipped with an interim store:

- **Where the sound lives:** in Postgres, table `recording_audio` (migration `0006`), apart
  from the `recordings` list. The repository interface hides it; moving to `arda-recordings`
  is a copy of the bytes and a new `object_key` column, the rows and the routes stay. The size
  limits keep the database small: 6 MB and 10 minutes a take, 500 takes a student.
- **How it is served:** by the api on the app's own origin, after the same policy check
  (`halaqa:review` for the ḥalaqa's teachers, `recitation:own` for the student), with byte
  ranges (Safari plays media only from servers that answer them) and
  `Cache-Control: private, no-store`; the service worker never caches `/api/`.
- **Consent** is asked once per device before the first take and kept there; a guardian's
  consent for a student under 16 is still to be recorded by the teacher (next with T4).
- **Deleting:** the student deletes any take; leaving the ḥalaqa or deleting the account
  deletes them (foreign keys to the membership). The export lists them without the sound.

## Update 2026-10-10: marks on words

The teacher's answer can mark words of the recited āyāt (spec T3), stored in `recording_marks`
(migration `0011`) beside the verdict, remark and note. They follow the same rules: only the
student and the ḥalaqa's teachers see them, the export lists them, and they are deleted with
the recording. Keeping verdicts and marks as text after a recording is gone is the ʿarḍ log's
job (T4); until it exists, deleting a recording deletes its answer too.
