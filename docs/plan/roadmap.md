# Roadmap

- Status: v1 · 2026-10-03 · Each step ships to staging (`arda-stg.siralabs.org`) and is usable
  on its own.

| Phase                | When            | Outcome                                                                                                                                         | Depends on                          |
| -------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0 · Foundation       | day 1 (done)    | Repository from Suffa's skeleton; specs, ADRs, threat model; Suffa's auth ported and tested; CapRover files and CI; design system and app shell | —                                   |
| 1 · Sheet and inbox  | week 1          | Unit 2 from the sheet with its games; ḥalaqa, invites, assignments; "Von meinem Sheikh"; staging online                                         | answers 1, 4 from the sheikh        |
| 2 · IndoPak muṣḥaf   | weeks 2–3       | Juzʾ ʿAmma pack; coloured pages; tap for the rule; reciter word by word, slow and loop                                                          | ADR-0009 question 1; answers 2, 3   |
| 3 · Recite to him    | week 4          | Recording (offline-first upload), listening queue, voice notes, ʿarḍ log; letter lab; units 1, 3, 4                                             | RustFS buckets                      |
| 4 · Pilot            | weeks 5–8       | One ḥalaqa weekly; measure the speech check against the sheikh; production server                                                               | GPU/CPU budget for the speech model |
| 5 · Live and flags   | after the pilot | Live lessons (LiveKit), teacher-confirmed AI flags, units 5–7, Madīna muṣḥaf                                                                    | ADR-0013 gate met for first rules   |
| 6 · Riwāyāt and apps | later           | Warsh, Qālūn; iOS and Android                                                                                                                   | rule data beyond Ḥafṣ               |

## Risks

| Risk                                    | Mitigation                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| IndoPak text licence unclear            | ask Tarteel now; fallback: transform the Tanzil text per installation         |
| Speech model weak on learners           | it only hints to the teacher until it agrees with him (ADR-0013)              |
| The sheikh's time                       | assignments and review work in a few taps on a phone; voice instead of typing |
| Drift between Suffa and ʿArḍa auth code | same-week port rule (ADR-0002); later a shared package                        |
