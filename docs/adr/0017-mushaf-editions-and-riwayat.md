# ADR-0017: Muṣḥaf editions and riwāyāt: IndoPak Ḥafṣ first

- Status: accepted
- Date: 2026-10-03

## Context

The student reads an IndoPak muṣḥaf. Others read the Madīna muṣḥaf or other riwāyāt.

## Decision

| Muṣḥaf          | Riwāya                | Layout                    | In ʿArḍa  |
| --------------- | --------------------- | ------------------------- | --------- |
| IndoPak         | Ḥafṣ                  | 15 lines (also 13 and 16) | **first** |
| Madīna          | Ḥafṣ                  | 15 lines                  | second    |
| Madīna editions | Warsh, Qālūn, ad-Dūrī | 15 lines                  | later     |

- A riwāya is part of every word key (ADR-0007); rules, timings and recitations are per riwāya.
- The student chooses muṣḥaf and riwāya once; the teacher of a ḥalaqa can fix them for it.
- IndoPak's own stop signs and spellings are explained in unit 7 (waqf).
- Which IndoPak edition (13, 15 or 16 lines) the sheikh uses decides the first page layout
  (spec 01 §8, question 2).

## Consequences

Unit 8 (riwāyāt) and non-Ḥafṣ packs need rule data beyond cpfair's (ADR-0008).

## Update 2026-10-04: the ʿUthmānī layer comes first

The IndoPak word-by-word text still has no source with a clear licence (ADR-0009 question 1),
and building it from Tanzil would change the text, which Tanzil's terms forbid. So the first
pack, `uthmani-hafs-juz30` (now version 2), carries Tanzil's ʿUthmānī text (the Madīna spelling) with
cpfair's rules, and the first muṣḥaf screen shows it. Word keys are the same for every script
(ADR-0007): the IndoPak layer is added to them as a second pack when its source is cleared,
without touching assignments or progress. The student is told which script is shown.

## Update 2026-10-04: the sheikh's muṣḥaf is the 15-line IndoPak

The sheikh reads a 15-line IndoPak muṣḥaf with Urdu word meanings in the margin (_al-Bayān fī
maʿānī kalimāt al-Qurʾān al-Karīm bil-lugha al-Urdiyya_; owner's photos of pages 6, 7, 597 and
598). So the IndoPak layer targets the 15-line page: page and line breaks as in his copy, IndoPak
pause signs (ط ج لا ز صلے قلے), rukūʿ and manzil marks. His printed copy is the reference the
screen is checked against; it is not a source of the digital text, whose typesetting belongs to
its publisher (ADR-0009 question 1 stays open). The Urdu meanings are not wanted for now.
Until the IndoPak layer exists, the ʿUthmānī text shows Tanzil's Madīna pause signs
(ۖ ۗ ۚ ۛ ۘ ۙ ۜ), unchanged.

## Update 2026-10-04: the IndoPak layer ships, IndoPak first

- DigitalKhatt's 15-line IndoPak text (ADR-0009 update) breaks pages where the sheikh's copy
  does: the same āyāt on every page checked (6, 7, 597, 598), the page number one lower. Packs
  keep DigitalKhatt's numbers and `layout.pageOffset: 1` gives his; within a page, a line may
  break a word earlier or later than his print.
- `indopak-hafs-fatiha-baqara@1` and `indopak-hafs-juz30@1` carry the words verbatim with their
  page and line, the āya markers as printed, and the ʿUthmānī packs' rules. Word keys are
  identical in both scripts (same words per āya in all shipped sūras; in the whole muṣḥaf only
  37:130 and 72:16 differ, where IndoPak joins or splits a word).
- Al-Fātiḥa: the source numbers it the IndoPak way (basmala unnumbered, 6 ending at
  عَلَيْهِمْ); keys stay Ḥafṣ (Kūfan), the basmala is āya 1 and the printed 6–7 are āya 7.
- The muṣḥaf shows IndoPak first; the student can switch to the Madīna (ʿUthmānī) script, and
  the choice is kept on the device.

## Update 2026-10-04: the muṣḥaf as printed pages (S3.4)

- The muṣḥaf shows one page at a time (`/mushaf/seite/:page`), as the chosen edition prints it:
  IndoPak line by line, each printed line one line on screen (scaled to the width), with the
  sheikh's page numbers; Madīna by its 604 pages (Tanzil's Quran Metadata, in `@arda/quran`),
  as running text, since we have no line data for it. A page shows what the app's packs hold.
- `/mushaf/:sura` opens the page the sūra (or an assignment's first āya) starts on; the
  assignment is marked on every page it spans, and a teacher can pick words across pages
  within one sūra.
- Pages turn with the arrows, a swipe (right: next page, as the muṣḥaf opens) or the keyboard
  (← next, → previous).

## Update 2026-10-05: the page as a printed muṣḥaf (S3.5)

- The sheikh's copy, from its imprint: _Tafsīr al-Qurʾān al-Majīd_ in Urdu by Ḥāfiẓ al-Ḥaqq
  Amīn, Dār Ithrāʾ al-Fikr, Riyadh, 2nd ed. 1441 AH, 624 pages, 20 × 28 cm (ISBN
  978-603-02-8266-5), all rights reserved. Its text pages are the 15-line IndoPak layout
  DigitalKhatt follows. We take nothing from the print itself.
- Its calligraphy is the heavy South Asian hand (Qudratullah style). The faces drawn after it
  (QuranWBW's IndoPak Nastaleeq, PDMS Saleem) carry no licence that allows bundling, so the
  page keeps DigitalKhatt IndoPak (OFL), drawn a little heavier on screen; the closest we may
  ship. A licensed face in that hand would replace it without touching the packs.
- The page looks like the printed one: paper in a double blue frame, a rule under every line,
  the head with the para (name and number), the page number and the sūra, in Arabic-Indic
  digits. Each page's lines are sized so its longest line fills the width, as the calligrapher
  fills it, instead of leaving gaps between words.
- Plain ink: the student can switch the tajwīd colours off and read the page as printed; tap a
  word and its rules still show. The choice is kept on the device.
- Turning: the page follows a finger moving sideways and turns past 60 px; buttons below it.
  Pinch-zooming, two fingers and moving a zoomed-in view never turn the page.
