import { describe, expect, it } from 'vitest';
import {
  CHANGE_GROUP,
  RIWAYAT,
  RIWAYA_CHANGES,
  RIWAYA_EXAMPLES,
  changeMark,
  examplesOf,
} from '../src';

/** The letters the change is marked on. */
const marked = (text: string, change: (typeof RIWAYA_CHANGES)[number]) => {
  const example = RIWAYA_EXAMPLES.find((e) => e.text === text && e.change === change)!;
  const { start, end } = changeMark(example);
  return text.slice(start, end);
};

describe('the riwāyāt of unit 8', () => {
  it('name Ḥafṣ first and four others, each reader with his narrator', () => {
    expect(RIWAYAT.map((r) => r.id)).toEqual(['hafs', 'shuba', 'warsh', 'qalun', 'duri']);
    for (const { arabic } of RIWAYAT) expect(arabic).toContain(' عَنْ ');
  });

  it('give every change an example, and never one that Ḥafṣ reads', () => {
    expect(new Set(RIWAYA_EXAMPLES.map((e) => e.change))).toEqual(
      new Set(RIWAYA_CHANGES)
    );
    for (const example of RIWAYA_EXAMPLES) {
      expect(example.by.length, example.text).toBeGreaterThan(0);
      expect(example.by, example.text).not.toContain('hafs');
    }
  });

  it('fill each card: four madds, four of the hamza, four sounds, six words', () => {
    expect(examplesOf('madd')).toHaveLength(4);
    expect(examplesOf('hamza')).toHaveLength(4);
    expect(examplesOf('sound')).toHaveLength(4);
    expect(examplesOf('word')).toHaveLength(6);
    expect(Object.keys(CHANGE_GROUP)).toEqual([...RIWAYA_CHANGES]);
  });

  it('let Warsh be heard wherever he reads differently, but for two words of al-Baqara', () => {
    const unheard = RIWAYA_EXAMPLES.filter((e) => e.by.includes('warsh') && !e.audio);
    expect(unheard.map((e) => e.wordKey)).toEqual(['hafs:2:9:6', 'hafs:2:10:12']);
    for (const { wordKey, audio } of RIWAYA_EXAMPLES) {
      if (!audio) continue;
      const [, sura = 0, aya = 0] = wordKey.split(':').map(Number);
      const file = `${String(sura).padStart(3, '0')}${String(aya).padStart(3, '0')}`;
      expect(audio.hafs).toBe(file);
      // The Madanī count leaves the basmala out of al-Fātiḥa; the other sūras chosen count alike.
      expect(audio.warsh).toBe(
        sura === 1 ? `001${String(aya - 1).padStart(3, '0')}` : file
      );
    }
  });

  it('write the changed letters as they are spoken where letters change', () => {
    const spoken = RIWAYA_EXAMPLES.filter((e) => e.spoken).map((e) => e.change);
    expect(new Set(spoken)).toEqual(new Set(['naql', 'ibdal', 'word', 'sila']));
    for (const e of RIWAYA_EXAMPLES) {
      if (e.spoken) expect(e.spoken, e.text).not.toBe(e.text);
    }
  });
});

describe('marking the change in the Ḥafṣ text', () => {
  it('marks the madd held longer', () => {
    expect(marked('إِنَّآ أَعْطَيْنَاكَ', 'madd-munfasil')).toBe('آ');
    expect(marked('قُلْ يَٰٓأَيُّهَا', 'madd-munfasil')).toBe('يَٰٓ');
    expect(marked('ءَامَنُوا', 'madd-badal')).toBe('ا');
  });

  it('marks the hamza that moves or turns', () => {
    expect(marked('قَدْ أَفْلَحَ', 'naql')).toBe('أَ');
    expect(marked('مَأْكُولٍ', 'ibdal')).toBe('أْ');
    expect(marked('مُؤْصَدَةٌ', 'ibdal')).toBe('ؤْ');
  });

  it('marks the alif maqṣūra, the rāʾ and the lām', () => {
    expect(marked('وَالضُّحَىٰ', 'taqlil')).toBe('ىٰ');
    expect(marked('بَصِيرًا', 'ra-tarqiq')).toBe('رً');
    expect(marked('صَلَاتِهِمْ', 'lam-taghliz')).toBe('لَ');
  });

  it('marks the whole word where a word changes', () => {
    expect(marked('مَٰلِكِ', 'word')).toBe('مَٰلِكِ');
    expect(marked('عَلَيْهِمْ', 'sila')).toBe('عَلَيْهِمْ');
    expect(marked('النَّاسِ', 'imala')).toBe('النَّاسِ');
  });

  it('finds a mark in every example', () => {
    for (const example of RIWAYA_EXAMPLES) {
      const { start, end } = changeMark(example);
      expect(end, example.text).toBeGreaterThan(start);
    }
  });
});
