# ADR-0009: Content sources and licensing: bundle only what is clearly open

- Status: accepted (open questions listed below)
- Date: 2026-10-03
- Source: research of 2 October 2026 (deck "ʿArḍa — Tajweed", slide "Free resources")

## Context

Not everything that is free to use may be put into open-source code or redistributed in an
offline pack. The repository is Apache-2.0; content packs are downloaded by every installation.

## Decision

| Need        | Resource                                                                         | Licence                                                             | How ʿArḍa uses it                                     |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| Text        | Tanzil ʿUthmānī text                                                             | CC BY 3.0, verbatim only                                            | Base for the rules; never altered                     |
| Structure   | Tanzil Quran metadata (sūra names, āya counts)                                   | CC BY 3.0                                                           | `@arda/quran`, verbatim, credited                     |
| Text        | IndoPak text, word by word (Tarteel QUL)                                         | not stated                                                          | **Ask Tarteel first**; not bundled until answered     |
| Rules       | cpfair/quran-tajweed (17 rules, Ḥafṣ)                                            | CC BY 4.0                                                           | Imported, mapped to IndoPak, credited                 |
| Muṣḥaf font | DigitalKhatt IndoPak (© Amine Anane, Tarteel Inc.)                               | OFL 1.1 (in the font file)                                          | Bundled as WOFF2, licence alongside                   |
| Muṣḥaf font | DigitalKhatt Madīna, Amiri Quran                                                 | OFL 1.1                                                             | Bundled                                               |
| Muṣḥaf font | King Fahd Complex (QPC) fonts                                                    | free to share, not to modify                                        | Optional download per installation, never in the repo |
| Reciters    | Quran.com word timings (al-Ḥuṣarī muʿallim, Alafasy, al-Minshāwī, ʿAbd al-Bāsiṭ) | registered API; no caching > 7 days; no ML training without consent | Streamed with credit through the registered client    |
| Reciters    | mp3quran.net (242 reciters, 20 riwāyāt)                                          | no published terms                                                  | Streamed with credit; ask before mirroring            |
| Reciters    | EveryAyah / QuranicAudio                                                         | non-commercial personal use                                         | Streamed with credit; confirm terms                   |
| Feedback    | Quran Muʿallim (obadx), phonemes + 10 ṣifāt                                      | MIT                                                                 | Self-hosted speech check (ADR-0013)                   |
| Lessons     | LiveKit                                                                          | Apache 2.0                                                          | Self-hosted (ADR-0015)                                |
| Makhārij    | no usable open drawings                                                          | —                                                                   | Our own SVGs, CC BY 4.0 (ADR-0018)                    |

Rules: (1) bundle only what is clearly open; (2) stream or link the rest with credit, or let
each installation download it; (3) never use third-party audio or text to train models without
the owner's consent; (4) every source is listed with its licence on an in-app "Quellen" page.

## Open questions (owner: product owner)

1. Tarteel: licence of the QUL IndoPak word-by-word text and layouts.
2. EveryAyah: terms for streaming in a free, open-source app.
3. mp3quran.net: permission to mirror selected teaching recitations.

## Consequences

Until question 1 is answered, IndoPak text in packs comes from a source with a clear licence,
or the pack is built per installation from the Tanzil text plus a published transformation.

## Update 2026-10-04: the IndoPak text from DigitalKhatt (question 1 no longer blocks)

- **Source:** `quran_text_indopak_15.ts` in [DigitalKhatt/digitalkhatt-js](https://github.com/DigitalKhatt/digitalkhatt-js).
  It is the IndoPak text as the 15-line muṣḥaf prints it: 610 pages, with sūra headings, āya
  markers and IndoPak stop signs. The repository's MIT licence allows copying and redistribution
  with the notice; the notice travels in every IndoPak pack (`copyright`), and the source is
  credited on the "Quellen" page. Pinned by commit and SHA-256 in `tools/sources.json`.
- **Other IndoPak texts:** the Quran.com/QUL text carries "do not distribute without credits"
  for charitable use only, and Quran Foundation's developer terms forbid redistribution, so
  they are not used (checked 2026-10-04; `risan/quran-json` came to the same result).
- **Provenance:** DigitalKhatt is sponsored by Tarteel, and the text may share an origin with
  QUL's. We rely on the licence the DigitalKhatt repository publishes; question 1 to Tarteel
  stays open as a courtesy, no longer as a blocker.
- **Rules:** cpfair's annotations (CC BY 4.0) are carried letter by letter from the ʿUthmānī
  text onto the IndoPak words (`tools/src/carry.ts`); every rule of every shipped pack lands.
