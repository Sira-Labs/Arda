# ADR-0027: Unit 8 teaches the riwāyāt by contrast with Ḥafṣ

- Status: accepted
- Date: 2026-10-16
- Related: ADR-0007 (text model), ADR-0008 (engine), ADR-0009 (sources), ADR-0017 (editions and
  riwāyāt), ADR-0024 (unit tests), spec 01 §4 (unit 8), spec 03 §4e

## Context

Unit 8 is about the riwāyāt: what changes in Warsh, Qālūn, Shuʿba and others (spec 01 §4).
ADR-0017 noted that it needs rule data beyond cpfair's, which covers Ḥafṣ only. No other
riwāya has an open digital text we may bundle (ADR-0009 rule 1): the King Fahd Complex texts
may be shared but not changed, and the reader of ʿArḍa reads Ḥafṣ in an IndoPak muṣḥaf anyway.
What the learner needs is to know that the other readings exist, are Qurʾān as much as Ḥafṣ,
and to recognise them when an imām recites one.

## Decision

- **By contrast, not by muṣḥaf.** Unit 8 shows Ḥafṣ words from the packs and says, for each,
  who reads it how. There are no packs for other riwāyāt yet, and no word keys other than
  `hafs:` (ADR-0007 keeps the riwāya in the key for when they come).
- **Five riwāyāt** (`RIWAYAT` in `@arda/tajweed`): Ḥafṣ and Shuʿba ʿan ʿĀṣim, Warsh and
  Qālūn ʿan Nāfiʿ, ad-Dūrī ʿan Abī ʿAmr: the ones read across the Muslim world today.
- **Warsh in depth, the others by example.** Warsh is the most widely read after Ḥafṣ and
  the one the learner is most likely to hear. His changes are taught as four groups (spec 03
  §4e): the madds (separated madd 6, badal 2/4/6), the hamza (naql, ibdāl), the sounds (taqlīl,
  thinner rāʾ, heavier lām) and other words; Qālūn's ṣila, ad-Dūrī's imāla and Shuʿba's word
  differences are named with one example each.
- **Hand-picked, checked examples.** Each is a Ḥafṣ word with its Tanzil key (checked by the
  tools test like units 3–7), the change, who reads it so, and, where letters change, how it
  is spoken, written as spoken (قَدَ ٱفْلَحَ), not as another muṣḥaf spells it. What each riwāya
  reads follows ash-Shāṭibiyya as commonly taught; every example is a draft for the sheikh.
- **Heard with one voice.** ʿAbd al-Bāsiṭ ʿAbd aṣ-Ṣamad recorded both Ḥafṣ and Warsh
  murattal; EveryAyah hosts both, āya by āya. The cards and the listening game play the same
  āya in both, streamed from EveryAyah with credit (ADR-0009 rule 2, its question 2 still
  open). His Warsh files follow the Madanī count: the chosen āyāt were matched to the Kūfan
  count by the clips' lengths (al-Fātiḥa: Ḥafṣ 1:4 is Warsh 001003; al-Baqara's counts differ
  in several places, so its two examples are not heard). No word timings exist for these
  recordings, so the whole āya is played.

## Alternatives

- **A Warsh muṣḥaf in the app:** needs a text we may bundle and Warsh rule data; neither exists
  openly. Revisit when one does (ADR-0017).
- **Detecting Warsh's changes across the packs:** naql and the separated madd could be found
  mechanically, but ibdāl depends on the root and taqlīl on the sūra; a wrong mark teaches a
  wrong reading. The marks are computed only on the chosen examples (`changeMark`), where the
  tests hold them.
- **Another Warsh reciter with the Kūfan count (Ibrāhīm ad-Dawsarī):** different voices for
  Ḥafṣ and Warsh would let the voice give the answer away in the listening game.

## Consequences

- The unit names the five riwāyāt and their places; the learner hears Warsh beside Ḥafṣ.
- The sheikh reviews the examples and what is said about each riwāya.
- If EveryAyah declines streaming (ADR-0009 question 2), the unit loses its sound but keeps its
  texts and the text game.
