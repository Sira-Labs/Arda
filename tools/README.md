# @arda/tools

Content tools (ADR-0007, ADR-0008, ADR-0010): they turn open sources into the content packs the
app downloads. Nothing here runs in the app or the api.

```sh
npm run fetch -w @arda/tools   # the pinned sources into tools/.cache (not committed)
npm run pack -w @arda/tools    # build apps/web/public/packs/<id>.v<version>.json and index.json
npm test -w @arda/tools        # also rebuilds the pack byte for byte when the sources are there
```

## Sources (`sources.json`)

| Source                                            | Licence                         | Used for                            |
| ------------------------------------------------- | ------------------------------- | ----------------------------------- |
| Tanzil Quran Text (Uthmani 1.1, pause and sajdah) | CC BY 3.0, verbatim copies only | the words, exactly as Tanzil writes |
| cpfair/quran-tajweed annotations (riwāyat Ḥafṣ)   | CC BY 4.0                       | the tajwīd rule on each letter      |

Each source is pinned by SHA-256 (for Tanzil, of its text lines: the year in its copyright
block changes every January). A source that changed stops the build. Tanzil's copyright block
travels inside every pack, as its terms ask.

## How the pack is made

1. **Words** (`words.ts`): an āya is split on spaces; pause and sajdah signs are not words but
   marks after the word before. The basmala Tanzil writes before āya 1 is taken off and kept
   with the sūra, as written there (before at-Tīn and al-Qadr with a shadda on the bāʾ). A word
   is `hafs:sura:aya:n`, n from 1.
2. **Re-alignment** (`align.ts`): cpfair indexed Tanzil's text of 2017. Since then Tanzil
   writes a space before each pause sign, a hamza after a lām on a tatweel (ٱلْـَٔاخِرَةِ, was
   ٱلْءَاخِرَةِ) and the small yāʾ as tatweel with a mark. `toTanzil2017` rebuilds the old text
   with a map back to today's letters, which places 6215 of 6236 āyāt exactly. The rest (such
   as ٱلْـَٰٔنَ) fall back to a checked shift: each rule has a signature (the letter it starts
   on), an āya is accepted only when every annotation fits, and the build fails otherwise.
   cpfair's classifier has no licence, so it is not run.
3. **Spans** (`pack.ts`): each rule becomes spans of the word's text. For the rules decided by
   the next letter (ikhfāʾ, idghām, iqlāb), the nūn, mīm or tanwīn letter is the carrier, and
   the letter after it the follower.
4. **Cross-check**: in every pack, cpfair and `@arda/tajweed`'s `detect()` agree on every nūn
   and mīm rule; they differ only on qalqala at a stop and on mīms with shadda that begin an
   āya (three in Juzʾ ʿAmma, three in al-Baqara; tested in `test/pack.test.ts`).

The packs to build are listed in `src/packs.ts` (sūra range, id, version). A pack whose bytes
change gets a new version; the app's index names only the current one.

The pack file is written deterministically (no timestamps), so the same sources give the same
bytes and the checksum in `index.json` is reproducible.
