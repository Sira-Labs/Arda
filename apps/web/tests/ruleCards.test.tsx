import { IZHAR_EXCEPTIONS, RULES, SHEET_EXAMPLES, detect } from '@arda/tajweed';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { CARD_AUDIO } from '@/content/cardAudio';
import { UNIT2, UNIT2_CARDS } from '@/content/units';
import type { Timings } from '@/modules/mushaf/timings';
import { PlayerContext, type PlayerDeps } from '@/modules/mushaf/usePlayer';
import { Path } from '@/modules/path/Path';
import { RuleCardPage } from '@/modules/path/RuleCard';
import { ReviewProvider } from '@/review/ReviewProvider';
import { MemoryReviewStore } from '@/review/store';
import { segmentsOf } from '@/tajweed/segments';
import { fakeApi, Providers } from './render';

const NUN_RULES = new Set([
  'izhar',
  'idgham-ghunna',
  'idgham-no-ghunna',
  'iqlab',
  'ikhfa',
]);

/** An audio element that records what it is asked to play. */
class FakeAudio extends EventTarget {
  src = '';
  currentTime = 0;
  readyState = 4;
  playbackRate = 1;
  defaultPlaybackRate = 1;
  paused = true;
  played: string[] = [];
  play() {
    this.paused = false;
    this.played.push(this.src);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

function fakePlayer() {
  const audio = new FakeAudio();
  const deps: PlayerDeps = {
    createAudio: () => audio as unknown as HTMLAudioElement,
    fetchTimings: async () => ({ ayat: {} }) as unknown as Timings,
  };
  return { audio, deps };
}

function renderAt(
  path: string,
  store = new MemoryReviewStore(),
  player: PlayerDeps = fakePlayer().deps
) {
  const { client } = fakeApi({});
  return render(
    <Providers client={client}>
      <PlayerContext.Provider value={player}>
        <ReviewProvider store={store}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/pfad" element={<Path />} />
              <Route path="/pfad/:unit/:rule" element={<RuleCardPage />} />
            </Routes>
          </MemoryRouter>
        </ReviewProvider>
      </PlayerContext.Provider>
    </Providers>
  );
}

describe('unit 2 content (S1.3, F2)', () => {
  it('puts every nūn sākina example of the sheet on a card, and the four exceptions', () => {
    const onCards = UNIT2_CARDS.flatMap((id) =>
      UNIT2[id].groups.flatMap((group) => group.examples.map((example) => example.text))
    );
    const fromSheet = SHEET_EXAMPLES.filter((e) => NUN_RULES.has(e.expectedRule)).map(
      (e) => e.text
    );
    expect(onCards.sort()).toEqual(fromSheet.sort());
    expect(UNIT2.idgham.exceptions).toEqual(IZHAR_EXCEPTIONS.map((e) => e.text));
  });

  it('shows on each card only examples the engine reads as that card’s rule', () => {
    for (const id of UNIT2_CARDS) {
      for (const group of UNIT2[id].groups) {
        for (const example of group.examples) {
          expect(
            detect(example.text).map((o) => o.rule),
            example.text
          ).toContain(group.rule);
        }
      }
    }
  });

  it('names the case of each example: inside a word, across words, after tanwīn', () => {
    const cases = Object.fromEntries(
      UNIT2.iqlab.groups[0]!.examples.map((example) => [example.text, example.case])
    );
    expect(cases['مِنْ بَعْدِ']).toBe('across');
    expect(cases['سَمِيعٌ بَصِيرٌ']).toBe('tanwin');
    expect(UNIT2.ikhfa.groups[0]!.examples.find((e) => e.text === 'مِنْكُمْ')?.case).toBe(
      'inside'
    );
  });

  it('keeps every card a draft until the sheikh has reviewed it', () => {
    for (const id of UNIT2_CARDS) expect(UNIT2[id].review.status).toBe('draft');
  });
});

describe('segmentsOf', () => {
  it('keeps the text, colours the carrier and marks the letter that decides', () => {
    const segments = segmentsOf('مِنۢ بَعْدِ');
    expect(segments.map((s) => s.text).join('')).toBe('مِنۢ بَعْدِ');
    expect(segments.find((s) => s.role === 'carrier')).toMatchObject({
      text: 'نۢ',
      rule: RULES.iqlab.family,
      ruleId: 'iqlab',
    });
    expect(segments.find((s) => s.role === 'follower')?.text).toBe('بَ');
  });

  it('leaves iẓhār uncoloured but still marks it', () => {
    const carrier = segmentsOf('مِنْ هَادٍ').find((s) => s.role === 'carrier');
    expect(carrier).toMatchObject({ text: 'نْ', ruleId: 'izhar' });
    expect(carrier?.rule).toBeUndefined();
  });
});

describe('the rule card', () => {
  beforeEach(() => {
    localStorage.setItem('arda.language', 'de');
  });

  it('shows the rule, its draft state, the examples in IndoPak and a label for each colour', () => {
    renderAt('/pfad/2/iqlab');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Iqlāb – Nūn wird zu Mīm vor Bāʾ' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Entwurf').length).toBeGreaterThan(0);
    const examples = screen.getByLabelText('Beispiele');
    const quran = examples.querySelectorAll('p.quran');
    expect(quran).toHaveLength(4);
    for (const p of quran) {
      expect(p).toHaveAttribute('lang', 'ar');
      expect(p).toHaveAttribute('dir', 'rtl');
      expect(p).toHaveAttribute('data-script', 'indopak');
    }
    expect(within(examples).getAllByTitle('Iqlāb · Ghunna').length).toBe(4);
    expect(
      screen.getByText(/grün = Ghunna, Nasenklang, 2 Zählzeiten/)
    ).toBeInTheDocument();
    expect(screen.getByText('Quellen unterscheiden sich')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByRole('link', { name: 'Weiter: Ikhfāʾ' })).toHaveAttribute(
      'href',
      '/pfad/2/ikhfa'
    );
  });

  it('counts a card read to its end for XP and the streak (ADR-0023)', async () => {
    const store = new MemoryReviewStore();
    renderAt('/pfad/2/iqlab', store);
    await userEvent.click(screen.getByRole('link', { name: 'Weiter: Ikhfāʾ' }));
    expect(Object.values(store.load().activity ?? {})).toEqual([
      expect.objectContaining({ kind: 'rule-card', ref: 'iqlab', right: 0, total: 0 }),
    ]);
  });

  it('teaches idghām with and without ghunna and the four exceptions', () => {
    renderAt('/pfad/2/idgham');
    expect(screen.getByText('mit Ghunna')).toBeInTheDocument();
    expect(screen.getByText('ohne Ghunna')).toBeInTheDocument();
    expect(screen.getByText(/grau = Stumm/)).toBeInTheDocument();
    const exceptions = screen.getByRole('heading', {
      name: 'Ausnahme: in einem Wort bleibt es klar (Iẓhār)',
    }).parentElement!;
    expect(exceptions.querySelectorAll('p.quran')).toHaveLength(4);
  });

  it('reads in Arabic with the Arabic rule names', () => {
    localStorage.setItem('arda.language', 'ar');
    renderAt('/pfad/2/ikhfa');
    expect(
      screen.getByRole('heading', { level: 1, name: 'إِخْفَاء – تُخفى النون مع الغنة' })
    ).toBeInTheDocument();
    expect(screen.getByText('البطاقة ٤ من ٤')).toBeInTheDocument();
  });

  it('answers an unknown rule with “not found”', () => {
    renderAt('/pfad/2/madd');
    expect(screen.getByRole('heading', { name: 'Nicht gefunden' })).toBeInTheDocument();
  });
});

describe('units 3 and 4 (S5.1)', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it("teaches ikhfāʾ shafawī with the sheet's example and one more, coloured and labelled", () => {
    renderAt('/pfad/3/ikhfa-shafawi');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Ikhfāʾ shafawī – Mīm sākina vor Bāʾ: verborgen, mit Ghunna'
    );
    expect(screen.getByText('Einheit 3 · Verstehen')).toBeInTheDocument();
    expect(screen.getByText('Karte 2 von 4')).toBeInTheDocument();
    const examples = screen.getByLabelText('Beispiele');
    expect(within(examples).getAllByTitle('Ikhfāʾ shafawī · Ghunna')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Weiter: Idghām shafawī' })).toHaveAttribute(
      'href',
      '/pfad/3/idgham-shafawi'
    );
  });

  it('says iẓhār shafawī holds before every letter but bāʾ and mīm', () => {
    renderAt('/pfad/3/izhar-shafawi');
    expect(screen.getByText('Alle Buchstaben außer Bāʾ und Mīm')).toBeInTheDocument();
    expect(screen.getByText('ohne Ghunna')).toBeInTheDocument();
  });

  it('shows the ghunna of a shadda on nūn and mīm, without a deciding letter', () => {
    renderAt('/pfad/3/ghunna');
    expect(screen.getByText('Diese Buchstaben mit Shadda')).toBeInTheDocument();
    expect(screen.queryByText(/der Buchstabe, der entscheidet/)).toBeNull();
    expect(
      within(screen.getByLabelText('Beispiele')).getAllByTitle(/Ghunna/)
    ).toHaveLength(4);
  });

  it('teaches qalqala on ق ط ب ج د with sukūn, one example for each', () => {
    renderAt('/pfad/4/qalqala');
    expect(screen.getByText('Diese Buchstaben mit Sukūn')).toBeInTheDocument();
    expect(screen.queryByText('mit Ghunna')).toBeNull();
    // Where in the word does not decide qalqala: no case under the examples.
    expect(screen.queryByText('in einem Wort')).toBeNull();
    expect(
      within(screen.getByLabelText('Beispiele')).getAllByTitle(/Qalqala/)
    ).toHaveLength(5);
    // The only card of unit 4 leads back to the path.
    expect(screen.getByRole('link', { name: 'Zur Einheit' })).toHaveAttribute(
      'href',
      '/pfad'
    );
  });

  it('does not open a card under another unit', () => {
    renderAt('/pfad/2/qalqala');
    expect(screen.queryByRole('heading', { name: /Qalqala/ })).toBeNull();
  });
});

describe('unit 5 (madd)', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('teaches madd muttaṣil: its length, the hamza after it, four real words coloured', () => {
    renderAt('/pfad/5/madd-muttasil');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Madd muttaṣil – Hamza im selben Wort: 4–5 Zählzeiten'
    );
    expect(screen.getByText('Einheit 5 · Verstehen')).toBeInTheDocument();
    expect(screen.getByText('Karte 2 von 4')).toBeInTheDocument();
    expect(screen.getByText('4–5 Zählzeiten')).toBeInTheDocument();
    expect(screen.queryByText('ohne Ghunna')).toBeNull();
    expect(screen.getByText(/Danach folgt ein Hamza:/)).toBeInTheDocument();
    // The hamza decides the length, and is underlined as the letter that decides.
    expect(screen.getByText(/der Buchstabe, der entscheidet/)).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Beispiele')).getAllByTitle(/Madd muttaṣil/)
    ).toHaveLength(4);
    // Each example is heard where the Qurʾān says it.
    expect(
      screen.getByRole('button', { name: 'Anhören: Sūra 110, Āya 1' })
    ).toBeInTheDocument();
  });

  it('holds the natural madd two counts, with nothing after it that decides', () => {
    renderAt('/pfad/5/madd-tabii');
    expect(screen.getByText('2 Zählzeiten')).toBeInTheDocument();
    expect(screen.queryByText(/der Buchstabe, der entscheidet/)).toBeNull();
    expect(
      within(screen.getByLabelText('Beispiele')).getAllByTitle(/Madd ṭabīʿī/)
    ).toHaveLength(4);
  });

  it('ends the unit with madd lāzim, six counts', () => {
    renderAt('/pfad/5/madd-lazim');
    expect(screen.getByText('6 Zählzeiten')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zur Einheit' })).toHaveAttribute(
      'href',
      '/pfad'
    );
  });
});

describe('unit 6 (tafkhīm and tarqīq)', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('teaches the seven heavy letters, always heavy, one word for each, in violet', () => {
    renderAt('/pfad/6/tafkhim');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Istiʿlāʾ – Die sieben schweren Buchstaben'
    );
    expect(screen.getByText('Einheit 6 · Verstehen')).toBeInTheDocument();
    expect(
      screen.getByText('Diese sieben Buchstaben sind immer schwer')
    ).toBeInTheDocument();
    expect(screen.getByText('schwer (Tafkhīm)')).toBeInTheDocument();
    const examples = screen.getByLabelText('Beispiele');
    expect(within(examples).getAllByRole('figure')).toHaveLength(7);
    expect(within(examples).getAllByTitle('Tafkhīm').length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText(/violett = Tafkhīm/)).toBeInTheDocument();
  });

  it('teaches the lām of Allāh heavy and light, each example with its reason', () => {
    renderAt('/pfad/6/lam-jalala');
    expect(screen.getByText('Karte 2 von 3')).toBeInTheDocument();
    expect(screen.getByText('schwer (Tafkhīm)')).toBeInTheDocument();
    expect(screen.getByText('leicht (Tarqīq)')).toBeInTheDocument();
    expect(screen.getByText('Nach Kasra, auch nach Tanwīn')).toBeInTheDocument();
    expect(screen.getAllByText('Lām von Allāh nach Kasra')).toHaveLength(4);
    expect(screen.getByText('Lām von Allāh am Anfang der Lesung')).toBeInTheDocument();
    // Light is left clear, and the legend says so.
    expect(screen.getByText('ohne Farbe = leicht (Tarqīq)')).toBeInTheDocument();
  });

  it('ends the unit with the rāʾ, the heavy letter after a rāʾ sākina underlined', () => {
    renderAt('/pfad/6/ra');
    expect(
      screen.getByText('Rāʾ sākin vor einem schweren Buchstaben')
    ).toBeInTheDocument();
    expect(screen.getByText('Rāʾ sākin nach dem Verbindungs-Hamza')).toBeInTheDocument();
    expect(screen.getByText(/der Buchstabe, der entscheidet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zur Einheit' })).toHaveAttribute(
      'href',
      '/pfad'
    );
  });
});

describe('the path', () => {
  it('lists units 1–6: the lab, then the cards of each unit in the order of the sheet and its games', () => {
    localStorage.setItem('arda.language', 'en');
    renderAt('/pfad');
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toEqual([
      '/labor',
      '/pfad/1/test',
      '/pfad/2/izhar',
      '/pfad/2/idgham',
      '/pfad/2/iqlab',
      '/pfad/2/ikhfa',
      '/pfad/2/spiel/welche-regel',
      '/pfad/2/spiel/sortieren',
      '/pfad/2/test',
      '/pfad/3/ghunna',
      '/pfad/3/ikhfa-shafawi',
      '/pfad/3/idgham-shafawi',
      '/pfad/3/izhar-shafawi',
      '/pfad/3/spiel/welche-regel',
      '/pfad/3/test',
      '/pfad/4/qalqala',
      '/pfad/4/spiel/buchstaben',
      '/pfad/4/test',
      '/pfad/5/madd-tabii',
      '/pfad/5/madd-muttasil',
      '/pfad/5/madd-munfasil',
      '/pfad/5/madd-lazim',
      '/pfad/5/spiel/wie-lang',
      '/pfad/5/test',
      '/pfad/6/tafkhim',
      '/pfad/6/lam-jalala',
      '/pfad/6/ra',
      '/pfad/6/spiel/schwer-oder-leicht',
      '/pfad/6/test',
    ]);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    ).toEqual([
      'Unit 1 · Makhārij and ṣifāt',
      'Unit 2 · Nūn sākina and tanwīn',
      'Unit 3 · Ghunna and mīm sākina',
      'Unit 4 · Qalqala',
      'Unit 5 · Madd',
      'Unit 6 · Tafkhīm and tarqīq',
      'Review',
    ]);
    expect(screen.getByText('15 letters')).toBeInTheDocument();
    expect(screen.getByText('Nothing is due right now. Well done!')).toBeInTheDocument();
  });
});

describe('accessible names', () => {
  it('tell the two idghām groups apart', () => {
    localStorage.setItem('arda.language', 'de');
    renderAt('/pfad/2/idgham');
    expect(
      screen.getByRole('region', { name: 'Idghām · mit Ghunna' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Idghām · ohne Ghunna' })
    ).toBeInTheDocument();
  });
});

describe('the examples heard (F2)', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  it('plays an example where the Qurʾān says it, in the teaching recitation', async () => {
    const { audio, deps } = fakePlayer();
    renderAt('/pfad/2/izhar', new MemoryReviewStore(), deps);
    const button = await screen.findByRole('button', { name: 'Anhören: Sūra 1, Āya 7' });
    await act(async () => {
      await userEvent.click(button);
    });
    // anʿamta: al-Fātiḥa 7, from its measured start.
    const { clip } = CARD_AUDIO['أَنْعَمْتَ']!;
    expect(audio.played).toEqual([
      'https://everyayah.com/data/Husary_Muallim_128kbps/001007.mp3',
    ]);
    expect(audio.currentTime).toBe(clip[0] / 1000);
    expect(button).toHaveAttribute('data-playing', 'true');
    // Outside the shipped sūras too: min hādin is ar-Raʿd 33.
    expect(
      screen.getByRole('button', { name: 'Anhören: Sūra 13, Āya 33' })
    ).toBeEnabled();
  });

  it('shows the Qurʾān’s wording where the reciter’s vowels differ from the sheet', () => {
    renderAt('/pfad/2/ikhfa');
    const example = screen
      .getByRole('button', { name: 'Anhören: Sūra 19, Āya 60' })
      .closest('figure')!;
    expect(example).toHaveTextContent('Im Qurʾān: مَن تَابَ');
  });

  it('leaves an example silent that the Qurʾān does not have as written', () => {
    renderAt('/pfad/3/izhar-shafawi');
    const examples = screen.getByLabelText('Beispiele');
    const silent = [...examples.querySelectorAll('figure')].find((f) =>
      f.textContent?.includes('سَلَامٌ')
    );
    expect(silent).toBeDefined();
    expect(silent!.querySelector('button')).toBeNull();
    // Its partner from the units' examples is heard.
    expect(
      within(examples).getByRole('button', { name: 'Anhören: Sūra 105, Āya 1' })
    ).toBeVisible();
  });
});
