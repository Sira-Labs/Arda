import type { Pack } from '@arda/quran';

/**
 * The words of the letter lab (spec F5, first set: س ز ص ر), taken from the shipped packs
 * rather than typed by hand. The picks below are only word keys; the text in both scripts,
 * the letter to mark and, for rāʾ, whether it is heavy or light are read from the words and
 * checked here, so a pick that does not show what it is meant to show fails the build.
 */

export type LabLetter = 'sin' | 'zay' | 'sad' | 'ra';
export type Weight = 'heavy' | 'light';

const LETTER: Record<LabLetter, string> = { sin: 'س', zay: 'ز', sad: 'ص', ra: 'ر' };
const WHISTLING = ['س', 'ز', 'ص'];

const FATHA = '\u064E';
const DAMMA = '\u064F';
const KASRA = '\u0650';
const SHADDA = '\u0651';

/** Harakāt and the other marks that sit on a letter (not letters themselves). */
const MARK = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;

/**
 * Picks, `sura:aya:n`, al-Ḥuṣarī's teaching recitation timing each as a word of its own. The
 * letter with a vowel at the start of the word (after the article or wa/fa at most), short
 * well-known words from Juzʾ ʿAmma, al-Fātiḥa and al-Baqara; whistling words hold no other
 * whistling letter, so a listening quiz has one answer.
 */
export const LAB_PICKS: Record<LabLetter, readonly string[]> = {
  sin: [
    '87:1:1', // sabbiḥ
    '97:5:1', // salāmun
    '102:3:2', // sawfa
    '93:2:3', // sajā
    '78:13:2', // sirājan
    '105:4:4', // sijjīl
    '81:8:3', // suʾilat
    '2:32:2', // subḥānaka
    '2:93:13', // samiʿnā
    '2:154:6', // sabīli
  ],
  zay: [
    '99:1:2', // zulzilati
    '102:2:2', // zurtumu
    '79:13:3', // zajratun
    '81:7:3', // zuwwijat
    '91:9:4', // zakkāhā
    '95:1:2', // wa-z-zaytūni
    '98:5:13', // az-zakāta
    '2:212:1', // zuyyina
    '2:230:10', // zawjan
    '2:10:4', // fa-zādahumu
  ],
  sad: [
    '1:6:2', // aṣ-ṣirāṭa
    '78:38:5', // ṣaffan
    '80:25:4', // ṣabban
    '87:19:1', // ṣuḥufi
    '81:18:1', // wa-ṣ-ṣubḥi
    '89:13:1', // fa-ṣabba
    '2:3:5', // aṣ-ṣalāta
    '2:158:2', // aṣ-ṣafā
    '2:250:9', // ṣabran
    '2:138:1', // ṣibghata
  ],
  ra: [
    '1:2:3', // rabbi (heavy)
    '1:1:3', // ar-raḥmāni (heavy)
    '98:2:1', // rasūlun (heavy)
    '88:18:4', // rufiʿat (heavy)
    '78:38:3', // ar-rūḥu (heavy)
    '90:13:2', // raqabatin (heavy)
    '2:185:2', // ramaḍāna (heavy)
    '2:22:16', // rizqan (light)
    '2:59:13', // rijzan (light)
    '2:164:35', // ar-riyāḥi (light)
    '2:177:31', // ar-riqābi (light)
    '89:16:7', // rizqahu (light)
    '106:2:2', // riḥlata (light)
    '2:239:3', // fa-rijālan (light)
  ],
};

/**
 * Pairs to compare. Exact pairs (the same letters but the one) are rare in these sūras, so
 * most are near pairs; the build says which is which.
 */
export const LAB_PAIR_PICKS: readonly {
  letters: readonly [LabLetter, LabLetter];
  keys: readonly [string, string];
}[] = [
  { letters: ['sin', 'sad'], keys: ['2:216:7', '79:21:2'] }, // wa-ʿasā / wa-ʿaṣā
  { letters: ['sin', 'sad'], keys: ['2:185:35', '103:1:1'] }, // al-ʿusr / wa-l-ʿaṣr
  { letters: ['sin', 'sad'], keys: ['79:3:2', '100:3:2'] }, // sabḥan / ṣubḥan
  { letters: ['sin', 'sad'], keys: ['2:184:9', '2:69:14'] }, // safarin / ṣafrāʾu
  { letters: ['sin', 'zay'], keys: ['78:20:4', '88:16:1'] }, // sarāban / wa-zarābiyyu
  { letters: ['sin', 'zay'], keys: ['2:273:20', '2:217:30'] }, // yasʾalūna / yazālūna
  { letters: ['sin', 'zay'], keys: ['2:205:10', '2:176:4'] }, // wa-n-nasla / nazzala
];

/** One word of the lab, in both scripts, with the letter to mark as UTF-16 offsets. */
export interface LabWord {
  key: string;
  letter: LabLetter;
  weight?: Weight;
  uthmani: string;
  indopak: string;
  focus: { uthmani: [number, number]; indopak: [number, number] };
}

export interface LabPair {
  letters: readonly [LabLetter, LabLetter];
  /** The same letters and harakāt but the one letter that differs (else a near pair). */
  exact: boolean;
  words: readonly [LabWord, LabWord];
}

export interface LabData {
  words: LabWord[];
  pairs: LabPair[];
}

/** al-Ḥuṣarī's teaching recitation timings as shipped: segments per `sura:aya`. */
export interface ShippedTimings {
  ayat: Record<string, readonly (readonly number[])[]>;
}

/** Letters and harakāt only: what makes two words sound the same (not the madd sign). */
const HARAKA = /[\u064B-\u0652]/;
const sounds = (text: string) =>
  [...text].filter((c) => !MARK.test(c) || HARAKA.test(c)).join('');

/** Where the first `letter` stands in `text`, with the marks on it. */
function focusOf(text: string, letter: string, key: string): [number, number] {
  const start = text.indexOf(letter);
  if (start < 0) throw new Error(`${key}: ${text} has no ${letter}`);
  let end = start + 1;
  while (end < text.length && MARK.test(text[end]!)) end++;
  return [start, end];
}

/** The vowel on the letter at `start` (after a shadda), if any. */
function vowelAt(text: string, start: number): string | undefined {
  let i = start + 1;
  if (text[i] === SHADDA) i++;
  return [FATHA, DAMMA, KASRA].includes(text[i] ?? '') ? text[i] : undefined;
}

/**
 * The pause signs IndoPak writes into a word (ط ز ج لا قف …, and the disputed āya end). A
 * word heard on its own is not a place to stop, and a small high zain over a sīn word would
 * read as the very letter the learner listens for, so the lab leaves them out.
 */
export const PAUSE_SIGNS =
  /(?:[\u0615\u0617\u06D6-\u06DB\u08D5\u08D7\u08DD-\u08DF\u08E2]|\u034F)+$/u;

function wordIn(packs: readonly Pack[], key: string): string {
  const [sura, aya, n] = key.split(':').map(Number);
  const word = packs
    .find((p) => p.suras.some((s) => s.sura === sura))
    ?.suras.find((s) => s.sura === sura)
    ?.ayat.find((a) => a.aya === aya)?.words[n! - 1];
  if (!word) throw new Error(`${key}: no such word in the packs`);
  return word.t;
}

function timed(timings: ShippedTimings, key: string): boolean {
  const [sura, aya, n] = key.split(':').map(Number);
  return (timings.ayat[`${sura}:${aya}`] ?? []).some(
    ([from, to]) => from === n! - 1 && to === n
  );
}

function labWord(
  key: string,
  letter: LabLetter,
  packs: { uthmani: readonly Pack[]; indopak: readonly Pack[] },
  timings: ShippedTimings,
  strict: boolean
): LabWord {
  if (!timed(timings, key)) throw new Error(`${key}: not timed as a word of its own`);
  const uthmani = wordIn(packs.uthmani, key);
  const indopak = wordIn(packs.indopak, key).replace(PAUSE_SIGNS, '');
  const sign = LETTER[letter];
  const focus = {
    uthmani: focusOf(uthmani, sign, key),
    indopak: focusOf(indopak, sign, key),
  };
  const word: LabWord = { key: `hafs:${key}`, letter, uthmani, indopak, focus };
  if (letter === 'ra') {
    if ([...uthmani].filter((c) => c === sign).length !== 1) {
      throw new Error(`${key}: ${uthmani} should have one rāʾ`);
    }
    const vowel = vowelAt(uthmani, focus.uthmani[0]);
    if (!vowel) throw new Error(`${key}: the rāʾ of ${uthmani} has no vowel`);
    word.weight = vowel === KASRA ? 'light' : 'heavy';
    return word;
  }
  const whistling = new Set([...uthmani].filter((c) => WHISTLING.includes(c)));
  if (whistling.size !== 1) {
    throw new Error(`${key}: ${uthmani} holds more than one whistling letter`);
  }
  if (strict && !vowelAt(uthmani, focus.uthmani[0])) {
    throw new Error(`${key}: the ${sign} of ${uthmani} has no vowel`);
  }
  return word;
}

/** The lab's words and pairs from the shipped packs and timings, checked. */
export function buildLab(
  packs: { uthmani: readonly Pack[]; indopak: readonly Pack[] },
  timings: ShippedTimings
): LabData {
  const words = (Object.keys(LAB_PICKS) as LabLetter[]).flatMap((letter) =>
    LAB_PICKS[letter].map((key) => labWord(key, letter, packs, timings, true))
  );
  const pairs = LAB_PAIR_PICKS.map(({ letters, keys }): LabPair => {
    const a = labWord(keys[0], letters[0], packs, timings, false);
    const b = labWord(keys[1], letters[1], packs, timings, false);
    const swapped = sounds(a.uthmani).replaceAll(LETTER[letters[0]], LETTER[letters[1]]);
    return { letters, exact: swapped === sounds(b.uthmani), words: [a, b] };
  });
  return { words, pairs };
}

/**
 * `apps/web/src/modules/lab/words.ts`. One word per line as JSON; the file is generated, so
 * Prettier leaves it alone (.prettierignore).
 */
export function labModule(data: LabData): string {
  const line = (value: unknown) => `  ${JSON.stringify(value)},`;
  return `/**
 * The letter lab's words (spec F5): real words from the shipped packs, each timed as a word of
 * its own in al-Ḥuṣarī's teaching recitation. Generated by \`npm run lab -w @arda/tools\` from
 * the picks in tools/src/lab.ts; do not edit.
 */
import type { LabPair, LabWord } from './types';

export const LAB_WORDS: readonly LabWord[] = [
${data.words.map(line).join('\n')}
];

export const LAB_PAIRS: readonly LabPair[] = [
${data.pairs.map(line).join('\n')}
];
`;
}
