# 03 — Content and Tajwīd Specification

- Status: draft v1 · 2026-10-03
- Related: ADR-0007 (text model), ADR-0008 (engine), ADR-0009 (sources), ADR-0017 (riwāyāt)

## 1. Content packs

| Pack                           | Contents                                                                                   | Source                                                      | Status                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------- |
| `uthmani-hafs-juz30@2`         | ʿUthmānī text of Juzʾ ʿAmma per word (Tanzil 1.1), basmala per sūra, rule spans            | Tanzil (text), cpfair (rules), built by `tools/`            | built                                  |
| `uthmani-hafs-fatiha-baqara@1` | the same for al-Fātiḥa and al-Baqara (293 āyāt, 300 KB)                                    | Tanzil (text), cpfair (rules), built by `tools/`            | built                                  |
| `indopak-hafs-juz30@1`         | IndoPak text of Juzʾ ʿAmma per word, 15-line page and line, rule spans carried from cpfair | DigitalKhatt (text, MIT), cpfair (rules), built by `tools/` | built                                  |
| `indopak-hafs-fatiha-baqara@1` | the same for al-Fātiḥa and al-Baqara                                                       | DigitalKhatt (text, MIT), cpfair (rules), built by `tools/` | built                                  |
| `units-2-4@1`                  | Rule cards, examples, games for units 2–4                                                  | the sheikh's sheet, reviewed by him                         | in the app (`content/units.ts`), draft |
| `makharij@1`                   | 28 letters → point, area, ṣifāt; SVGs                                                      | own work, CC BY 4.0                                         | first set (س ز ص ر) in the app, draft  |
| `madina-hafs-juz30@1`          | Madīna script layer                                                                        | Tanzil / DigitalKhatt Madīna                                | second                                 |

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

| Family                      | Rules                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------- |
| ghunna (green)              | ikhfāʾ, idghām with ghunna, iqlāb, ikhfāʾ/idghām shafawī, mushaddad nūn/mīm           |
| qalqala (blue)              | qalqala                                                                               |
| silent (grey)               | hamzat al-waṣl, lām shamsiyya, silent letters, idghām without ghunna (the nūn)        |
| madd (red, darker = longer) | madd 2 (ṭabīʿī), 4–5 (muttaṣil, munfaṣil), 6 (lāzim)                                  |
| tafkhīm (violet)            | the seven heavy letters, the lām of Allāh and the rāʾ when heavy (unit 6, cards only) |
| none                        | iẓhār (clear is the default)                                                          |

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

## 4a. Examples beyond the sheet (units 3–7, draft)

The sheet gives one example per mīm sākina rule and none for the ghunna of a shadda, for
qalqala, madd, tafkhīm or waqf. `UNIT_EXAMPLES` in `@arda/tajweed` adds real words, spelt like the sheet
(every sukūn written, and the madda where the muṣḥaf writes it); `tools/test/examples.test.ts`
checks every word key against the Tanzil text in the packs, and the engine test checks the
rule. Drafts until the sheikh has reviewed them.

| Rule                | Examples (word key of the first word)                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Ghunna (shadda)     | إِنَّ (103:2:1), النَّاسِ (114:1:4), ثُمَّ (102:4:1), عَمَّ (78:1:1)                                                                         |
| Ikhfāʾ shafawī      | وَمَا هُمْ بِمُؤْمِنِينَ (2:8:9)                                                                                                             |
| Idghām shafawī      | كَمْ مِنْ فِئَةٍ (2:249:49)                                                                                                                  |
| Iẓhār shafawī       | أَلَمْ تَرَ (105:1:1)                                                                                                                        |
| Qalqala (ق ط ب ج د) | قَدْ أَفْلَحَ (87:14:1), أَطْعَمَهُمْ (106:4:2), الْأَبْتَرُ (108:3:4), النَّجْدَيْنِ (90:10:2), خَلَقْنَا (90:4:2)                          |
| Madd ṭabīʿī         | الرَّحْمَٰنِ (1:1:3), الدِّينِ (1:4:3), سَيَعْلَمُونَ (78:4:2), سِرَاجًا (78:13:2)                                                           |
| Madd muttaṣil       | جَآءَ (110:1:2), السَّمَآءُ (82:1:2), جَزَآءً (78:26:1), حَدَآئِقَ (78:32:1)                                                                 |
| Madd munfaṣil       | إِنَّآ أَعْطَيْنَاكَ (108:1:1), بِمَآ أُنْزِلَ (2:4:3), لَآ أُقْسِمُ (90:1:1), فِيٓ أَيِّ (82:8:1)                                           |
| Madd lāzim          | الضَّآلِّينَ (1:7:9), الطَّآمَّةُ (79:34:3), الصَّآخَّةُ (80:33:3), دَآبَّةٍ (2:164:33)                                                      |
| Tafkhīm (letters)   | خَلَقَ (96:1:5), الصَّمَدُ (112:2:2), وَالضُّحَى (93:1:1), الْغَٰشِيَةِ (88:1:4), وَالطَّارِقِ (86:1:2), قُلْ (112:1:1), الْعَظِيمِ (78:2:3) |
| Lām of Allāh, heavy | نَصْرُ اللَّهِ (110:1:3), إِنَّ اللَّهَ (2:20:20), رَسُولُ اللَّهِ (91:13:3), اللَّهُ الصَّمَدُ (112:2:1)                                    |
| Lām of Allāh, light | بِسْمِ اللَّهِ (1:1:1), الْحَمْدُ لِلَّهِ (1:2:1), دِينِ اللَّهِ (110:2:5), بِاللَّهِ (2:8:6)                                                |
| Rāʾ, heavy          | رَبِّ (1:2:3), مَرْيَمَ (2:87:12), ارْجِعِي (89:28:1), مِرْصَادًا (78:21:4)                                                                  |
| Rāʾ, light          | رِزْقًا (2:22:16), فِرْعَوْنَ (79:17:3), فَذَكِّرْ (87:9:1), وَالْفَجْرِ (89:1:1)                                                            |
| Waqf: sukūn         | أَحَدٌ (112:1:4), الْفَلَقِ (113:1:4), لَهَبٍ (111:3:4), عَلَقٍ (96:2:4)                                                                     |
| Waqf: madd al-ʿiwaḍ | أَوْتَادًا (78:7:2), سُبَاتًا (78:9:3), لِبَاسًا (78:10:3), أَفْوَاجًا (110:2:7)                                                             |
| Waqf: tāʾ marbūṭa   | الْقَارِعَةُ (101:1:1), الْبَيِّنَةُ (98:1:12), الْحُطَمَةُ (104:5:4), الْمُوقَدَةُ (104:6:3)                                                |
| Madd ʿāriḍ          | الرَّحِيمِ (1:1:4), الْعَٰلَمِينَ (1:2:4), نَسْتَعِينُ (1:5:4), الْمُسْتَقِيمَ (1:6:3)                                                       |
| Madd līn            | قُرَيْشٍ (106:1:2), وَالصَّيْفِ (106:2:4), الْبَيْتِ (106:3:4), خَوْفٍ (106:4:7)                                                             |
| Ibtidāʾ: fatḥa      | الْحَمْدُ (1:2:1), الَّذِي (78:3:1), النَّجْمُ (86:3:1), النَّارِ (85:5:1)                                                                   |
| Ibtidāʾ: ḍamma      | ادْعُ (2:68:2), اعْبُدُوا (2:21:3), اسْكُنْ (2:35:3), ادْخُلُوا (2:58:3)                                                                     |
| Ibtidāʾ: kasra      | اقْرَأْ (96:1:1), اهْدِنَا (1:6:1), اذْهَبْ (79:17:1)                                                                                        |

## 4b. Madd (unit 5, engine)

`detect(text, { madd: true })` also finds the madd rules; without the option it returns only
the rules of units 2–4, so their cards and games are unchanged. A madd letter is alif (or alif
maqṣūra) after fatḥa, wāw after ḍamma, yāʾ (ʿUthmānī ى) after kasra, each without a vowel of
its own, or a letter with a long-vowel sign (small alif, small wāw or yāʾ). What is read after
it decides (Ḥafṣ by way of ash-Shāṭibiyya, counts in `RULES[id].counts`):

| Rule          | After the madd letter                                    | Counts | Example                         |
| ------------- | -------------------------------------------------------- | ------ | ------------------------------- |
| Madd ṭabīʿī   | nothing that lengthens it                                | 2      | قَالَ, فِيهِ, يَقُولُونَ        |
| Madd muttaṣil | a hamza in the same word                                 | 4–5    | ٱلسَّمَآءِ, جَآءَ               |
| Madd munfaṣil | a hamza starting the next word                           | 4–5    | بِمَآ أُنزِلَ, فِىٓ أَنفُسِكُمْ |
| Madd lāzim    | a shadda or sukūn in the same word (with the madda sign) | 6      | ٱلضَّآلِّينَ, ٱلْحَآقَّةُ       |

- The vocative yā and the hā of attention are written joined to the next word but are words of
  their own: يَٰٓأَيُّهَا, هَٰٓؤُلَآءِ, يَٰٓـَٔادَمُ are munfaṣil (ḥukmī).
- Not madd: a madd letter before alif waṣla (فِى ٱلْأَرْضِ), līn (شَىْءٍ, خَوْفٌ), letters marked
  silent, the seat of fatḥatān.
- Badal and the other madds of two counts in Ḥafṣ are ṭabīʿī here (ءَامَنُوا۟).
- Left to the cards and to waqf (unit 7): the ʿāriḍ at a stop and the opening letters of sūras
  (الٓمٓ).
- Checked against cpfair in both ʿUthmānī packs (`tools/test/pack.test.ts`): the long madds
  agree word by word, and every natural madd cpfair marks (only where a sign writes it) is found.
  The only differences are the munfaṣil ḥukmī above (cpfair: muttaṣil) and الٓمٓ. The engine
  reads ʿUthmānī and plainly vocalised text; IndoPak's madd signs differ, and the muṣḥaf takes its
  rules from the pack anyway (ADR-0008).

## 4c. Heavy and light letters (unit 6, engine)

`detect(text, { tafkhim: true })` also finds the heavy (tafkhīm) and light (tarqīq) letters,
read joined (waṣl), in Ḥafṣ by way of ash-Shāṭibiyya. Each occurrence says why (`reason`), for
the cards and the game's feedback. The muṣḥaf does not colour them (cpfair has no such
category), so its legend leaves the family out; the cards of unit 6 do.

| Rule              | Heavy                                                                                                 | Light                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| The seven letters | خ ص ض غ ط ق ظ (istiʿlāʾ, خُصَّ ضَغْطٍ قِظْ): always                                                   | –                                     |
| Lām of Allāh      | after fatḥa or ḍamma (قَالَ ٱللَّهُ, رَسُولُ ٱللَّهِ), at the start of reading                        | after kasra (بِسْمِ ٱللَّهِ, لِلَّهِ) |
| Rāʾ with a vowel  | with fatḥa or ḍamma (رَبِّ, خَيْرٌ)                                                                   | with kasra (رِجَالٌ)                  |
| Rāʾ sākina        | after fatḥa or ḍamma (مَرْيَمَ), after hamzat al-waṣl (ٱرْجِعِىٓ), before a heavy letter (مِرْصَادًا) | after kasra (فِرْعَوْنَ)              |

- The vowel before the lām of Allāh is the one heard: letters without a vowel of their own
  (alif waṣla, the lām of "al", madd letters, silent letters) are passed over (قَالُوا۟ ٱللَّهُ is
  heavy, فِى ٱللَّهِ light), and a tanwīn before alif waṣla is read with kasra (أَحَدٌ ٱللَّهُ).
- Alif waṣla counts also where the spelling writes it as a bare alif at the start of a word
  (ارْجِعِي, the examples' spelling).
- Only the doubled lām of the name is the lām of Allāh: ٱللَّهْوِ, لَعَلَّهُمْ and لَّهُمْ are not.
- A rāʾ merged into the next one (وَٱذْكُر رَّبَّكَ) is read once.
- Left to waqf (unit 7) and the cards: the rāʾ at a stop, the words where both are allowed
  (فِرْقٍ, مِصْرَ), the alif after a heavy letter and the degrees of tafkhīm.
- Checked on both ʿUthmānī packs (all 305 lāms of Allāh and 1,335 rāʾs read as above) and
  against every rāʾ word of the letter lab (`tools/test/lab.test.ts`).

## 4d. Stopping and starting (unit 7, engine)

`detect(text, { waqf: true })` reads the end of the text as a stop (waqf) and its start as a
beginning (ibtidāʾ), in Ḥafṣ by way of ash-Shāṭibiyya. Joined readings of the same letter give
way to the stop's: madd ʿāriḍ for ṭabīʿī, the rāʾ at a stop for its own vowel.

| At the stop                 | The last word                                                                  | Example                              |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| Sukūn (`waqf-sukun`)        | the last vowel, tanwīn of ḍamma or kasra, and the ṣila of a hāʾ fall away      | أَحَدْ, بِهْ                         |
| Madd al-ʿiwaḍ (`madd-iwad`) | fatḥatān (not on tāʾ marbūṭa) becomes a long ā, 2 counts                       | عَلِيمَا, هُدَى                      |
| Tāʾ marbūṭa (`waqf-ha`)     | is read as a hāʾ sākina                                                        | رَحْمَهْ                             |
| Madd ʿāriḍ (`madd-arid`)    | a madd letter before the last letter: 2, 4 or 6 counts, kept the same          | ٱلْعَٰلَمِينْ, نَسْتَعِينْ           |
| Madd līn (`madd-lin`)       | wāw or yāʾ sākina after fatḥa before the last letter: 2, 4 or 6 counts         | قُرَيْشْ, خَوْفْ                     |
| Qalqala                     | on a qalqala letter at the end, also with shadda                               | ٱلْفَلَقْ, ٱلْحَقّْ                  |
| Rāʾ                         | light after kasra or yāʾ sākina (one sākin letter between allowed), else heavy | حِجْرْ, خَبِيرْ / ٱلْقَدْرْ, غَفُورْ |

- A word ending in a long vowel stays as it is (قَالُوا۟, ٱلضُّحَىٰ). A madd before a final hamza
  stays muttaṣil (ٱلسَّمَآءِ), not ʿāriḍ.
- Ibtidāʾ on alif waṣla: fatḥa in the article (ٱلْحَمْدُ, ٱلَّذِى, ٱلْـَٔاخِرَةِ), ḍamma where the
  third letter has an original ḍamma (ٱنظُرْ, ٱدْعُ, ٱتُّبِعُوا۟; with a shadda the doubled second
  letter is the third), kasra otherwise (ٱرْجِعِىٓ, ٱتَّقُوا۟) and in the nouns (ٱسْمُهُۥ, ٱبْنُ,
  ٱمْرُؤٌ) and the verbs whose ḍamma is not their own (ٱمْشُوا۟, ٱقْضُوٓا۟).
- The pause signs of the Madīna muṣḥaf (`WAQF_SIGNS`, kept by the packs after a word): ۘ lāzim
  (stop), ۙ mamnūʿ (do not stop), ۚ jāʾiz (either), ۖ al-waṣl awlā (continuing is better), ۗ
  al-waqf awlā (stopping is better), ۛ muʿānaqa (stop at one of the two), and ۜ sakta (a short
  stop without breath). IndoPak signs (ط, ز, ص, قف …) are not taught yet.
- Checked against cpfair at every āya end of both ʿUthmānī packs (`tools/test/pack.test.ts`):
  all 452 madd_246 and all 131 qalqala at the end agree. The ibtidāʾ vowel was read for all
  1,266 words with alif waṣla in the packs (fatḥa 1,161, kasra 89, ḍamma 16).
- The cards hear a stop example only where an āya ends with it and a start only where an āya
  begins with it (`tools/src/cardAudio.ts`): within an āya the reciter runs on. Two starts on
  ḍamma begin no āya anywhere in the Qurʾān and stay silent. The signs' places are in
  `apps/web/src/content/signs.ts`.
- Left to the cards and the sheikh: rawm and ishmām, the rāʾ where both are allowed, the madd
  ʿāriḍ's length chosen per recitation, and stopping in the middle of an āya by meaning.

## 5. Rendering checks (IndoPak font)

- DigitalKhatt IndoPak renders IndoPak text with U+0652 sukūn; the ʿUthmānī U+06E1 shows a
  missing glyph and is mapped on import (ADR-0007).
- Colouring single letters inside a word keeps their joining (checked in the deck and the
  scaffold).
- The iqlāb mark (small high mīm, U+06E2) after a final nūn is placed by the font to the left
  of the nūn; the sheikh confirms this matches his printed muṣḥaf (week 1 review).

## 5a. Letter lab, first set (draft for the sheikh)

The lab's first set (owner, 2026-10-06) is س ز ص (the whistling letters) and ر. Until the
`makharij@1` pack exists, the letters live in `apps/web/src/modules/lab/letters.ts` (point,
area, ṣifāt; texts in the catalogs) and their words in `words.ts`, generated by
`npm run lab -w @arda/tools` from picks in `tools/src/lab.ts`: only word keys are picked; the
text, the marked letter and, for rāʾ, heavy (fatḥa, ḍamma) or light (kasra) are read from the
packs and checked, and every word must be timed on its own in al-Ḥuṣarī's teaching recitation.
Whistling words hold one whistling letter only, so the listening quiz has one answer. IndoPak
pause signs inside a word are left out (a word alone is no stop). Pairs are exact when letters
and harakāt agree but for the one letter (only وَعَسَىٰٓ / وَعَصَىٰ here), else near.

Each word plays from where it really sounds, measured once in the recitation itself
(`npm run lab-clips -w @arda/tools`, `tools/src/labClips.ts`, into `tools/lab-clips.json`):
the word timings start a word at its first vowel and end an āya's last word early, which cut
off a sīn's hiss and the end of سِجِّيلٍ (owner, 2026-10-06). A clip reaches back to the
silence before the word when there is one within 300 ms, forward to the next pause (for the
āya's last word, to the silence after it), and only ever grows the timed clip.

| Letter | Makhraj (as drafted)                                                                         | Ṣifāt                                                     |
| ------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| س      | tip of the tongue at the lower incisors (some: upper), a narrow gap                          | hams, rakhāwa, istifāl, infitāḥ, iṣmāt, ṣafīr             |
| ز      | as س                                                                                         | jahr, rakhāwa, istifāl, infitāḥ, iṣmāt, ṣafīr             |
| ص      | as س, the back of the tongue raised and spread to the palate                                 | hams, rakhāwa, istiʿlāʾ, iṭbāq, iṣmāt, ṣafīr              |
| ر      | tip of the tongue with a little of its back on the gum ridge, slightly behind the point of ن | jahr, tawassuṭ, istifāl, infitāḥ, idhlāq, inḥirāf, takrīr |

The lab asks rāʾ only in its clear cases (vowelled: heavy with fatḥa or ḍamma, light with
kasra); rāʾ sākina is taught in unit 6 (§4c), a draft for the sheikh like the rest.

## 6. Review workflow

Every rule text, example and makhraj drawing has `status: draft | reviewed`, `reviewed_by`,
`reviewed_at`. Drafts show a small "Entwurf" badge; packs for students contain only reviewed
items once the sheikh has started reviewing.
