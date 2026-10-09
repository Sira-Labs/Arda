import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Pack, PackIndex } from '@arda/quran';
import {
  LAB_KEYS,
  LAB_PICKS,
  nasalBefore,
  PAUSE_SIGNS,
  buildLab,
  labModule,
  timedWord,
  type ShippedTimings,
} from '../src/lab';
import { FRAME_MS, serialiseClips, wordBounds, type LabClips } from '../src/labClips';

const web = (path: string) =>
  fileURLToPath(new URL(`../../apps/web/${path}`, import.meta.url));
const index = JSON.parse(
  readFileSync(web('public/packs/index.json'), 'utf8')
) as PackIndex;
const packs = index.packs.map(
  (entry) => JSON.parse(readFileSync(web(`public/packs/${entry.file}`), 'utf8')) as Pack
);
const timings = JSON.parse(
  readFileSync(web('public/audio/timings/husary-muallim.json'), 'utf8')
) as ShippedTimings;
const clipsFile = fileURLToPath(new URL('../lab-clips.json', import.meta.url));
const clips = JSON.parse(readFileSync(clipsFile, 'utf8')) as LabClips;
const shipped = {
  uthmani: packs.filter((p) => p.script === 'uthmani'),
  indopak: packs.filter((p) => p.script === 'indopak'),
};

describe('the letter lab’s words', () => {
  const lab = buildLab(shipped, timings, clips);

  it('are the ones the app ships, byte for byte', () => {
    expect(labModule(lab)).toBe(readFileSync(web('src/modules/lab/words.ts'), 'utf8'));
  });

  it('give every letter at least eight words, and rāʾ heavy and light ones', () => {
    for (const letter of Object.keys(LAB_PICKS)) {
      expect(lab.words.filter((w) => w.letter === letter).length).toBeGreaterThanOrEqual(
        8
      );
    }
    const ra = lab.words.filter((w) => w.letter === 'ra');
    expect(ra.filter((w) => w.weight === 'heavy').length).toBeGreaterThanOrEqual(5);
    expect(ra.filter((w) => w.weight === 'light').length).toBeGreaterThanOrEqual(5);
  });

  it('leave out the pause signs IndoPak writes into a word', () => {
    // al-ʿusr (al-Baqara 185) carries a small high zain, a pause sign, not the letter.
    const usr = lab.pairs.flatMap((p) => p.words).find((w) => w.key === 'hafs:2:185:35');
    expect(usr?.indopak).not.toMatch(PAUSE_SIGNS);
    expect(usr?.indopak.includes('ز')).toBe(false);
    for (const word of lab.words) expect(word.indopak, word.key).not.toMatch(PAUSE_SIGNS);
  });

  it('mark the letter in both scripts', () => {
    // Hamza on its seat (أ إ ؤ ئ) or alone; IndoPak writes one that opens a word as alif.
    const signs = {
      sin: ['س'],
      zay: ['ز'],
      sad: ['ص'],
      ra: ['ر'],
      hamza: [...'أإءؤئ'],
      ha: ['ه'],
      ayn: ['ع'],
      hha: ['ح'],
      ghayn: ['غ'],
      kha: ['خ'],
      qaf: ['ق'],
      kaf: ['ك'],
      jim: ['ج'],
      shin: ['ش'],
      ya: ['ي'],
      dad: ['ض'],
      tta: ['ط'],
      dal: ['د'],
      ta: ['ت'],
      tha: ['ث'],
      dha: ['ذ'],
      zza: ['ظ'],
      lam: ['ل'],
      nun: ['ن'],
    };
    for (const word of [...lab.words, ...lab.pairs.flatMap((p) => p.words)]) {
      expect(signs[word.letter], word.key).toContain(
        word.uthmani.slice(...word.focus.uthmani)[0]
      );
      expect(
        [...signs[word.letter], ...(word.letter === 'hamza' ? ['ا'] : [])],
        word.key
      ).toContain(word.indopak.slice(...word.focus.indopak)[0]);
    }
  });

  it('give each letter of the throat ten words, none holding a letter it is heard against', () => {
    const rivals = {
      hamza: 'أإءؤئع',
      ayn: 'أإءؤئع',
      ha: 'هحخ',
      hha: 'هحخ',
      kha: 'هحخغ',
      ghayn: 'غخ',
    };
    for (const [letter, chars] of Object.entries(rivals)) {
      const words = lab.words.filter((w) => w.letter === letter);
      expect(words, letter).toHaveLength(10);
      for (const word of words) {
        const kinds = new Set(
          [...word.uthmani]
            .filter((c) => chars.includes(c))
            .map((c) => ('أإءؤئ'.includes(c) ? 'ء' : c))
        );
        expect(kinds.size, word.key).toBe(1);
      }
    }
    // The throat's pairs differ in that one letter only: ʿalīm / alīm, khayr / ghayr …
    const throat = lab.pairs.filter((p) =>
      ['hamza', 'ha', 'ayn', 'hha', 'ghayn', 'kha'].includes(p.letters[0])
    );
    expect(throat).toHaveLength(6);
    expect(throat.every((p) => p.exact)).toBe(true);
  });

  it('give each letter of the tongue ten words, none holding a letter it is heard against', () => {
    // Yāʾ is heard in its dotless form too (شَىْءٍ), so that counts as a yāʾ.
    const rivals = { qaf: 'قك', kaf: 'قك', jim: 'جشيى', shin: 'جشيى', ya: 'جشيى' };
    for (const [letter, chars] of Object.entries(rivals)) {
      const words = lab.words.filter((w) => w.letter === letter);
      expect(words, letter).toHaveLength(10);
      for (const word of words) {
        const kinds = new Set(
          [...word.uthmani]
            .filter((c) => chars.includes(c))
            .map((c) => (c === 'ى' ? 'ي' : c))
        );
        expect(kinds.size, word.key).toBe(1);
      }
    }
    // qadḥan / kadḥan, jāʾa / shāʾa, sujjirat / suyyirat; qāla / kāna is a near pair.
    const tongue = lab.pairs.filter((p) => ['qaf', 'jim'].includes(p.letters[0]));
    expect(tongue.map((p) => p.exact)).toEqual([true, false, true, true]);
  });

  it('give ḍād and the tip of the tongue ten words each, one answer to every quiz', () => {
    // The tied tāʾ (ة) is a tāʾ when the reciter goes on; ḍād keeps clear of ẓāʾ too.
    const rivals = { dad: 'ضدظ', tta: 'طدتة', dal: 'طدتةض', ta: 'طدتة' };
    for (const [letter, chars] of Object.entries(rivals)) {
      const words = lab.words.filter((w) => w.letter === letter);
      expect(words, letter).toHaveLength(10);
      for (const word of words) {
        const kinds = new Set(
          [...word.uthmani]
            .filter((c) => chars.includes(c))
            .map((c) => (c === 'ة' ? 'ت' : c))
        );
        expect(kinds.size, word.key).toBe(1);
      }
    }
    // baʿḍa / baʿda, ṭaḥāhā / daḥāhā, hātū / hādū; ṭaḥāhā / talāhā is a near pair.
    const tip = lab.pairs.filter((p) => ['dad', 'tta', 'ta'].includes(p.letters[0]));
    expect(tip.map((p) => [...p.letters, p.exact])).toEqual([
      ['dad', 'dal', true],
      ['tta', 'dal', true],
      ['tta', 'ta', false],
      ['ta', 'dal', true],
    ]);
  });

  it('give the teeth, lām and nūn ten words each, one answer to every quiz', () => {
    // Ẓāʾ keeps clear of ḍād, the letter it is mixed up with in Arabic.
    const rivals = { tha: 'ثذظ', dha: 'ثذظ', zza: 'ثذظض', lam: 'لن', nun: 'لن' };
    for (const [letter, chars] of Object.entries(rivals)) {
      const words = lab.words.filter((w) => w.letter === letter);
      expect(words, letter).toHaveLength(10);
      for (const word of words) {
        const kinds = new Set([...word.uthmani].filter((c) => chars.includes(c)));
        expect(kinds.size, word.key).toBe(1);
      }
    }
    // Exact pairs of these three are not in these sūras; illā / innā and alā / anā are.
    const teeth = lab.pairs.filter((p) => ['tha', 'dha', 'lam'].includes(p.letters[0]));
    expect(teeth.map((p) => [...p.letters, p.exact])).toEqual([
      ['tha', 'dha', false],
      ['dha', 'zza', false],
      ['tha', 'zza', false],
      ['lam', 'nun', true],
      ['lam', 'nun', true],
    ]);
  });

  it('leave out a word the reciter joins to a nūn sākin or tanwīn before it', () => {
    // min sijjīl: the nūn is hidden in the sīn, the word starts in the ghunna.
    expect(nasalBefore(shipped.uthmani, '105:4:4')).toBe(true);
    // fa-man shāʾa; sabʿan shidādan: the same before shīn, after nūn and after tanwīn.
    expect(nasalBefore(shipped.uthmani, '78:39:5')).toBe(true);
    expect(nasalBefore(shipped.uthmani, '78:12:4')).toBe(true);
    // ṣabran wa-thabbit: a tanwīn merged into the wāw before the letter.
    expect(nasalBefore(shipped.uthmani, '2:250:10')).toBe(true);
    // min ʿalaqin: said plainly before a throat letter; mālik yawmi: no nūn; the āya's first.
    expect(nasalBefore(shipped.uthmani, '96:2:4')).toBe(false);
    expect(nasalBefore(shipped.uthmani, '1:4:2')).toBe(false);
    expect(nasalBefore(shipped.uthmani, '87:1:1')).toBe(false);
    for (const word of [...lab.words, ...lab.pairs.flatMap((p) => p.words)]) {
      expect(nasalBefore(shipped.uthmani, word.key.slice('hafs:'.length)), word.key).toBe(
        false
      );
    }
  });

  it('read heavy and light from the vowel on the rāʾ', () => {
    const weight = (key: string) => lab.words.find((w) => w.key === key)?.weight;
    expect(weight('hafs:1:2:3')).toBe('heavy'); // rabbi
    expect(weight('hafs:2:22:16')).toBe('light'); // rizqan
  });

  it('say which pair differs in one letter only', () => {
    expect(lab.pairs[0]).toMatchObject({ letters: ['sin', 'sad'], exact: true });
    expect(lab.pairs.some((p) => !p.exact)).toBe(true);
  });

  it('refuse a pick that is not timed as a word of its own', () => {
    expect(() => buildLab(shipped, { ayat: {} }, clips)).toThrow(/not timed/);
  });
});

describe('where a lab word sounds (owner, 2026-10-06: the sīn was cut off)', () => {
  /** An envelope of `ms` milliseconds of silence, with loud and quiet stretches set. */
  const sound = (ms: number, parts: [from: number, to: number, level: number][]) => {
    const frames = new Float64Array(ms / FRAME_MS);
    for (const [from, to, level] of parts) {
      for (let f = from / FRAME_MS; f < to / FRAME_MS; f++) frames[f] = level;
    }
    return frames;
  };

  it('reaches back to the hiss before the timed start, after the silence before it', () => {
    // A sīn's hiss from 150 ms, quiet but not silent; the vowel (timed start) at 300 ms.
    const word = sound(2000, [
      [150, 300, 120],
      [300, 1200, 2000],
    ]);
    expect(wordBounds(word, [300, 1200], false)).toEqual([120, 1260]);
  });

  it('keeps the timed start, a little earlier, when the word follows the one before', () => {
    // No pause before: a ghunna runs into the word (min sijjīl).
    const word = sound(3000, [
      [0, 1000, 1500],
      [1000, 2000, 2000],
    ]);
    expect(wordBounds(word, [1000, 2000], false)[0]).toBe(970);
  });

  it('lets the āya’s last word sound to its end, past a short stop inside it', () => {
    // sijjīl: si, the held jīm (a short stop), jīlin; the timing ends inside it.
    const word = sound(9000, [
      [5800, 6150, 1500],
      [6150, 6250, 0],
      [6250, 7450, 1800],
    ]);
    expect(wordBounds(word, [5780, 6780], true)).toEqual([5750, 7510]);
    // Any other word ends at the next pause, not at the end of the āya.
    expect(wordBounds(word, [5780, 6000], false)[1]).toBe(6210);
  });

  it('only ever grows the timed clip', () => {
    const silent = new Float64Array(500);
    const [start, end] = wordBounds(silent, [1000, 2000], true);
    expect(start).toBeLessThanOrEqual(1000);
    expect(end).toBeGreaterThanOrEqual(2000);
  });

  it('is measured for every word the lab plays, around its timing', () => {
    expect(Object.keys(clips.clips)).toEqual([...LAB_KEYS]);
    for (const key of LAB_KEYS) {
      const timed = timedWord(timings, key)!;
      const [start, end] = clips.clips[key]!;
      expect(start, key).toBeLessThanOrEqual(timed.start);
      expect(start, key).toBeGreaterThanOrEqual(timed.start - 400);
      expect(end, key).toBeGreaterThanOrEqual(timed.end);
      expect(end - timed.end, key).toBeLessThanOrEqual(timed.last ? 1600 : 400);
    }
    // qadḥan, the āya's last word, sounds well past its timed end.
    expect(clips.clips['100:2:2']![1]).toBeGreaterThan(4100);
    expect(serialiseClips(clips)).toBe(readFileSync(clipsFile, 'utf8'));
  });
});
