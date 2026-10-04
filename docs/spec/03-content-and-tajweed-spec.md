# 03 — Content and Tajwīd Specification

- Status: draft v1 · 2026-10-03
- Related: ADR-0007 (text model), ADR-0008 (engine), ADR-0009 (sources), ADR-0017 (riwāyāt)

## 1. Content packs

| Pack                           | Contents                                                                                                               | Source                                                                                   | Status                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| `uthmani-hafs-juz30@2`         | ʿUthmānī text of Juzʾ ʿAmma per word (Tanzil 1.1), basmala per sūra, rule spans                                        | Tanzil (text), cpfair (rules), built by `tools/`                                         | built                         |
| `uthmani-hafs-fatiha-baqara@1` | the same for al-Fātiḥa and al-Baqara (293 āyāt, 300 KB)                                                                | Tanzil (text), cpfair (rules), built by `tools/`                                         | built                         |
| `indopak-hafs-juz30@1`         | IndoPak text of Juzʾ ʿAmma per word, page/line (15-line, the sheikh's edition), rule spans, al-Ḥuṣarī muʿallim timings | Tanzil (base), cpfair (rules), IndoPak source per ADR-0009, Quran.com timings (streamed) | waits for ADR-0009 question 1 |
| `units-2-4@1`                  | Rule cards, examples, games for units 2–4                                                                              | the sheikh's sheet, reviewed by him                                                      | first                         |
| `makharij@1`                   | 28 letters → point, area, ṣifāt; SVGs                                                                                  | own work, CC BY 4.0                                                                      | week 4                        |
| `madina-hafs-juz30@1`          | Madīna script layer                                                                                                    | Tanzil / DigitalKhatt Madīna                                                             | second                        |

Every pack has a manifest (id, version, sources with licence and attribution, checksum) and is
built reproducibly by `tools/` (see `tools/README.md`). The built packs and their index live in
`apps/web/public/packs/` for now, served same-origin under `/packs/`; they move to the
`arda-content` bucket under `/media/` when packs are released apart from the app (ADR-0010).

**Pack format (version 1).** `suras[].ayat[].words[]`, each word `{ t, r?, a? }`: its text
verbatim, its rule spans `[start, end, rule, "f"?]` (UTF-16 offsets into `t`; `rule` is one of
cpfair's categories, mapped to a colour family and, where the sheet teaches it, a rule by
`PACK_RULES` in `@arda/tajweed`; `"f"` marks the follower of a rule decided by the next letter),
and the pause or sajdah signs after it. A sūra carries its basmala as written before it. The
word key is `hafs:sura:aya:n` with n counting the words from 1.

## 2. Word keys

`riwaya:sura:aya:word` (e.g. `hafs:113:2:1` = مِنْ in al-Falaq 2). Ranges are
`from..to` inclusive. Stop signs and āya markers are not words; they are attached to the
preceding word as `after` marks per script.

## 3. Rule taxonomy (unit 2–4, from the sheet)

### Nūn sākina and tanwīn — the letter after decides

| Rule          | Arabic   | Meaning           | Letters after                 | Count | Ghunna                              |
| ------------- | -------- | ----------------- | ----------------------------- | ----- | ----------------------------------- |
| Iẓhār (ḥalqī) | إِظْهَار | pronounce clearly | ء ه ع ح غ خ                   | 6     | no                                  |
| Idghām        | إِدْغَام | merge             | ي ر م ل و ن (_yarmalūn_)      | 6     | with ي ن م و (_yanmū_), without ل ر |
| Iqlāb         | إِقْلَاب | turn into mīm     | ب                             | 1     | yes                                 |
| Ikhfāʾ        | إِخْفَاء | hide              | ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك | 15    | yes                                 |

**Invariant (test):** 6 + 6 + 1 + 15 = 28; each of the 28 letters (hamza standing for alif)
belongs to exactly one rule. Mnemonic for ikhfāʾ: the first letters of _ṣif dhā thanā kam jāda shakhṣun
qad samā / dum ṭayyiban zid fī tuqan ḍaʿ ẓālimā_.

**Exception (test):** nūn sākina followed by ي ن م و **inside one word** keeps iẓhār; exactly
four words in the Qurʾān: صِنْوَانٌ (ar-Raʿd 4), قِنْوَانٌ (al-Anʿām 99), الدُّنْيَا (e.g.
al-Baqara 85), بُنْيَانٌ (aṣ-Ṣaff 4).

**Iqlāb steps (rule card):** recognise nūn or tanwīn before ب → turn the n into m → close the
lips lightly and hold the ghunna 2 counts → open into the bāʾ. Three cases: inside a word
(أَنْبِئْهُمْ, يُنْبِتُ), across words after nūn (مِنْ بَعْدِ), after tanwīn (سَمِيعٌۢ بَصِيرٌ).
**Sources differ:** one source says without ghunna; we teach with ghunna (question 1 for the
sheikh).

### Ghunna and mīm sākina

- Ghunna is a nasal sound from the khayshūm; always **2 counts**. Test: holding the nose
  stops it.
- Strength (strong → light): mushaddad nūn/mīm → ikhfāʾ and iqlāb → idghām → plain nūn/mīm.
- Mīm sākina: **ikhfāʾ shafawī** before ب (ghunna), **idghām shafawī** before م (ghunna),
  **iẓhār shafawī** before all others (no ghunna).

### Qalqala

ق ط ب ج د (_quṭbu jadd_) with sukūn: touch the makhraj and release quickly; a short rebound.

### Colour families (display, design spec §4)

| Family                      | Rules                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| ghunna (green)              | ikhfāʾ, idghām with ghunna, iqlāb, ikhfāʾ/idghām shafawī, mushaddad nūn/mīm    |
| qalqala (blue)              | qalqala                                                                        |
| silent (grey)               | hamzat al-waṣl, lām shamsiyya, silent letters, idghām without ghunna (the nūn) |
| madd (red, darker = longer) | madd 2 (ṭabīʿī), 4–5 (muttaṣil, munfaṣil), 6 (lāzim)                           |
| none                        | iẓhār (clear is the default)                                                   |

## 4. Acceptance fixtures from the sheet

Every example of the sheet is a fixture `{ text, wordKey?, expectedRule, all? }` in
`packages/tajweed/test/sheet.fixtures.ts`; `detect(text)` must return exactly `all` (every
rule in the example, in reading order) or, when it is absent, only `expectedRule`. E.g.:

| Example                                                                                | Rule                            |
| -------------------------------------------------------------------------------------- | ------------------------------- |
| مَنْ آمَنَ, مِنْ هَادٍ, أَنْعَمْتَ, عَلِيمٌ حَكِيمٌ, مِنْ غَائِبَةٍ, وَالْمُنْخَنِقَةُ | iẓhār                           |
| مَنْ يَقُولُ, مِنْ نُورٍ, مِنْ مَاءٍ, مِنْ وَالٍ                                       | idghām with ghunna              |
| مِنْ لَدُنْهُ, غَفُورٌ رَحِيمٌ                                                         | idghām without ghunna           |
| مِنْ بَعْدِ, سَمِيعٌ بَصِيرٌ, زَوْجٍ بَهِيجٍ                                           | iqlāb                           |
| مِنْ تَابَ, مِنْ ثَمَرَةٍ, مَنْ جَاءَ, مِنْ دِيَارِهِمْ, نَفْسٍ ذَائِقَةٍ, مِنْكُمْ    | ikhfāʾ                          |
| تَرْمِيهِمْ بِحِجَارَةٍ / لَكُمْ مَا / عَلَيْهِمْ سَلَامٌ                              | ikhfāʾ / idghām / iẓhār shafawī |

## 5. Rendering checks (IndoPak font)

- DigitalKhatt IndoPak renders IndoPak text with U+0652 sukūn; the ʿUthmānī U+06E1 shows a
  missing glyph and is mapped on import (ADR-0007).
- Colouring single letters inside a word keeps their joining (checked in the deck and the
  scaffold).
- The iqlāb mark (small high mīm, U+06E2) after a final nūn is placed by the font to the left
  of the nūn; the sheikh confirms this matches his printed muṣḥaf (week 1 review).

## 6. Review workflow

Every rule text, example and makhraj drawing has `status: draft | reviewed`, `reviewed_by`,
`reviewed_at`. Drafts show a small "Entwurf" badge; packs for students contain only reviewed
items once the sheikh has started reviewing.
