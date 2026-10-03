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
