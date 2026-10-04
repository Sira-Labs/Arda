# ADR-0010: Offline-first, with content packs

- Status: accepted
- Date: 2026-10-03
- Source: Suffa ADR-0002 (sync, last write wins), ADR-0014 and ADR-0023 (packs)

## Context

Students practise on the train, in the masjid, abroad. The muṣḥaf, the rules and the games
must work without a connection; only the teacher's queue and recordings need the server.

## Decision

- The PWA precaches its shell and fonts (vite-plugin-pwa, Workbox).
- **Content packs**: versioned, checksummed bundles (text layer, rule spans, word timings,
  unit texts) downloaded once into IndexedDB, e.g. `indopak-hafs-juz30@1`. Packs live in the
  `arda-content` bucket and are served same-origin under `/media/`.
- Learning progress (spaced-repetition cards, unit results, XP) is local-first and synced to
  the API with Suffa's outbox and last-write-wins protocol when it is ported (spec story L3).
- Recordings are made offline too and uploaded from the outbox when a connection returns.
- The last known profile is cached so the right screens render offline; role-gated actions are
  always enforced by the API.

## Consequences

Content updates are pack releases with a changelog; the app shows when a newer pack exists.

## Update 2026-10-04: where the first pack lives

Until packs are released apart from the app, they are built into `apps/web/public/packs/` and
served same-origin under `/packs/`, with an `index.json` naming each file, its size and its
SHA-256. They are not precached with the shell: the app downloads a pack when it is first
needed, checks its SHA-256 and keeps it for offline use (S2.3). The index is part of the app
build, so the checksum a pack must match ships with the app itself (threat T6). Packs are kept
in Cache Storage (`arda-packs-v1`), which holds whole files as they were served; IndexedDB is
for data the app changes, such as progress.
