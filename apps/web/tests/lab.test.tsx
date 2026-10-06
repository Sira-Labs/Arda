import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Pack, PackIndex } from '@arda/quran';
import { Lab } from '@/modules/lab/Lab';
import { LabQuizPage } from '@/modules/lab/LabQuiz';
import { LetterPage } from '@/modules/lab/LetterPage';
import { labRound } from '@/modules/lab/quiz';
import { LAB_LETTERS } from '@/modules/lab/types';
import { LAB_PAIRS, LAB_WORDS } from '@/modules/lab/words';
import { resetSpeedForTests } from '@/modules/mushaf/reciters';
import { chooseScript, resetScriptForTests } from '@/modules/mushaf/script';
import type { Timings } from '@/modules/mushaf/timings';
import { PlayerContext, type PlayerDeps } from '@/modules/mushaf/usePlayer';
import { fakeApi, Providers } from './render';

const PUBLIC = resolve(__dirname, '../public');
const index = JSON.parse(
  readFileSync(resolve(PUBLIC, 'packs/index.json'), 'utf8')
) as PackIndex;
const packs = index.packs.map(
  (entry) =>
    JSON.parse(readFileSync(resolve(PUBLIC, 'packs', entry.file), 'utf8')) as Pack
);
const timings = JSON.parse(
  readFileSync(resolve(PUBLIC, 'audio/timings/husary-muallim.json'), 'utf8')
) as Timings;

/** An audio element that records what it is asked to do. */
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
  /** The recording reaches `seconds`, as the browser reports it. */
  at(seconds: number) {
    this.currentTime = seconds;
    act(() => {
      this.dispatchEvent(new Event('timeupdate'));
    });
  }
}

/** The lab's player over a fake audio element and the shipped timings. */
function fakePlayer() {
  const audio = new FakeAudio();
  const deps: PlayerDeps = {
    createAudio: () => audio as unknown as HTMLAudioElement,
    fetchTimings: async () => timings,
  };
  return { audio, deps };
}

const MUALLIM = 'https://everyayah.com/data/Husary_Muallim_128kbps/';

function renderAt(path: string, player: PlayerDeps = fakePlayer().deps) {
  const api = fakeApi({});
  render(
    <Providers client={api.client}>
      <PlayerContext.Provider value={player}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/labor" element={<Lab />} />
            <Route path="/labor/:letter" element={<LetterPage />} />
            <Route
              path="/labor/:letter/quiz"
              element={<LabQuizPage random={() => 0} />}
            />
          </Routes>
        </MemoryRouter>
      </PlayerContext.Provider>
    </Providers>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
  resetSpeedForTests();
  resetScriptForTests();
});

describe('the lab’s words (generated from the packs)', () => {
  const wordAt = (key: string, script: Pack['script']) => {
    const [, sura, aya, n] = key.split(':').map(Number);
    return packs
      .filter((p) => p.script === script)
      .flatMap((p) => p.suras)
      .find((s) => s.sura === sura)
      ?.ayat.find((a) => a.aya === aya)?.words[n! - 1]?.t;
  };
  const all = [...LAB_WORDS, ...LAB_PAIRS.flatMap((p) => p.words)];

  it('exist in the packs, in both scripts, as written there', () => {
    for (const word of all) {
      expect(wordAt(word.key, 'uthmani'), word.key).toBe(word.uthmani);
      // IndoPak without the pause signs written into the word (a word alone is no stop).
      const indopak = wordAt(word.key, 'indopak') ?? '';
      expect(indopak.startsWith(word.indopak), word.key).toBe(true);
      expect(indopak.slice(word.indopak.length), word.key).toMatch(
        /^(?:[\u0615\u0617\u06D6-\u06DB\u08D5\u08D7\u08DD-\u08DF\u08E2]|\u034F)*$/u
      );
    }
  });

  it('are each timed as a word of their own in the teaching recitation', () => {
    for (const word of all) {
      const [, sura, aya, n] = word.key.split(':').map(Number);
      const segments = timings.ayat[`${sura}:${aya}`] ?? [];
      expect(
        segments.some(([from, to]) => from === n! - 1 && to === n),
        word.key
      ).toBe(true);
    }
  });

  it('give every letter eight words or more', () => {
    for (const letter of LAB_LETTERS) {
      expect(LAB_WORDS.filter((w) => w.letter === letter).length).toBeGreaterThanOrEqual(
        8
      );
    }
  });

  it('make a round of ten: the letter’s own and the two it is mixed up with', () => {
    const round = labRound('sin', () => 0);
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.answer))).toEqual(new Set(['sin', 'zay', 'sad']));
    const ra = labRound('ra', () => 0.5);
    expect(ra.filter((q) => q.answer === 'heavy')).toHaveLength(5);
    expect(ra.filter((q) => q.answer === 'light')).toHaveLength(5);
  });
});

describe('the letter lab (F5)', () => {
  it('shows the head with its five areas named, and the four letters', () => {
    renderAt('/labor');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Buchstaben-Labor'
    );
    expect(
      screen.getByRole('img', { name: /Der Kopf von der Seite/ })
    ).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: 'Die fünf Bereiche' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual([
      '1Jawf · Mund- und Rachenraum: die Dehnungslaute',
      '2Ḥalq · Kehle: sechs Buchstaben',
      '3Lisān · Zunge: achtzehn Buchstaben',
      '4Shafatān · Lippen: vier Buchstaben',
      '5Khayshūm · Nasenraum: die Ghunna',
    ]);
    for (const [name, href] of [
      ['Sīn', '/labor/sin'],
      ['Zāy', '/labor/zay'],
      ['Ṣād', '/labor/sad'],
      ['Rāʾ', '/labor/ra'],
    ]) {
      expect(screen.getByRole('link', { name: new RegExp(name!) })).toHaveAttribute(
        'href',
        href
      );
    }
    expect(screen.getByText('Entwurf – der Sheikh prüft noch')).toBeInTheDocument();
  });

  it('shows a letter in Arabic, its point and its ṣifāt with their names', async () => {
    renderAt('/labor/sin');
    const letter = screen.getByText('س');
    expect(letter).toHaveAttribute('lang', 'ar');
    expect(letter).toHaveAttribute('dir', 'rtl');
    expect(
      screen.getByRole('img', { name: /Zungenspitze – Schneidezähne/ })
    ).toBeVisible();
    const sifat = screen.getByRole('region', { name: 'Ṣifāt · seine Eigenschaften' });
    const chips = within(sifat)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.chip')?.textContent);
    expect(chips).toEqual(['Hams', 'Rakhāwa', 'Istifāl', 'Infitāḥ', 'Iṣmāt', 'Ṣafīr']);
    expect(within(sifat).getByText(/Flüstern/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Typische Fehler' })).toHaveTextContent(
      'So wird aus Sīn schnell Zāy.'
    );
  });

  it('records an āya with the letter for the sheikh', async () => {
    renderAt('/labor/sin');
    const user = userEvent.setup();
    const self = screen.getByRole('region', { name: 'Selbst üben' });
    const aya = within(self).getByRole('combobox', { name: 'Āya' });
    const first = within(aya).getAllByRole('option')[0]!;
    await user.click(within(self).getByRole('button', { name: 'Diese Āya aufnehmen' }));
    const panel = screen.getByRole('dialog');
    const [sura, ayaNumber] = (first.getAttribute('value') ?? '').split(':');
    expect(panel).toHaveTextContent(`Sūra ${sura} · Āya ${ayaNumber} aufnehmen`);
  });

  it('says the rāʾ rules are a summary the sheikh still checks', () => {
    renderAt('/labor/ra');
    const rules = screen.getByRole('region', { name: 'Rāʾ: schwer oder leicht' });
    expect(rules).toHaveTextContent('Mit Kasra ist Rāʾ leicht');
    expect(rules).toHaveTextContent('Entwurf – der Sheikh prüft noch');
    expect(screen.getByText('Takrīr').closest('li')).toHaveTextContent('vermeiden');
  });

  it('plays one word of the āya’s recording, from its start to its end, slowly', async () => {
    const { audio, deps } = fakePlayer();
    renderAt('/labor/sin', deps);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '0.5×' }));
    const word = await screen.findByRole('button', {
      name: 'Anhören: Sūra 87, Āya 1, Wort 1',
    });
    await user.click(word);
    // sabbiḥ: the first word of al-Aʿlā 1 in al-Ḥuṣarī's teaching recitation.
    const [, , start, end] = timings.ayat['87:1']![0]!;
    expect(audio.played).toEqual([`${MUALLIM}087001.mp3`]);
    expect(audio.currentTime).toBe(start / 1000);
    expect(audio.playbackRate).toBe(0.5);
    expect(word).toHaveAttribute('data-playing', 'true');
    audio.at(end / 1000);
    expect(audio.paused).toBe(true);
    expect(word).not.toHaveAttribute('data-playing');
  });

  it('shows the words in the chosen muṣḥaf script, the letter marked', async () => {
    chooseScript('uthmani');
    renderAt('/labor/sad');
    const word = await screen.findByRole('button', {
      name: 'Anhören: Sūra 1, Āya 6, Wort 2',
    });
    const text = word.querySelector('[lang="ar"]')!;
    expect(text).toHaveAttribute('dir', 'rtl');
    expect(text).toHaveAttribute('data-script', 'madina');
    expect(text.textContent).toBe(LAB_WORDS.find((w) => w.key === 'hafs:1:6:2')?.uthmani);
    expect(text.querySelector('.lab-focus')).toHaveAttribute('title', 'Ṣād');
  });

  it('plays a pair one word after the other', async () => {
    const { audio, deps } = fakePlayer();
    renderAt('/labor/sin', deps);
    const user = userEvent.setup({ advanceTimers: () => undefined });
    const pairs = screen.getByRole('region', { name: 'Paare vergleichen' });
    expect(pairs).toHaveTextContent('Nur dieser Laut ist anders.');
    const both = await within(pairs).findAllByRole('button', { name: /Beide hören/ });
    await user.click(both[0]!);
    // wa-ʿasā (al-Baqara 216), then wa-ʿaṣā (an-Nāziʿāt 21).
    expect(audio.played).toEqual([`${MUALLIM}002216.mp3`]);
    const [, , , end] = timings.ayat['2:216']!.find(([from]) => from === 6)!;
    audio.at(end / 1000);
    await act(() => new Promise((done) => setTimeout(done, 800)));
    expect(audio.played).toEqual([`${MUALLIM}002216.mp3`, `${MUALLIM}079021.mp3`]);
  });
});

describe('Welcher Buchstabe? (the listening quiz)', () => {
  it('plays a word, then shows it with the answer and moves on', async () => {
    const { audio, deps } = fakePlayer();
    renderAt('/labor/sin/quiz', deps);
    const user = userEvent.setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Welcher Buchstabe?'
    );
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    // Heard, not seen: no Arabic word before the answer.
    expect(document.querySelector('.paper [lang="ar"]')).toBeNull();
    await user.click(await screen.findByRole('button', { name: /Anhören/ }));
    expect(audio.played).toHaveLength(1);

    const first = labRound('sin', () => 0)[0]!;
    const options = screen.getByRole('group', { name: 'Antworten' });
    const wrong = first.answer === 'sad' ? /Zāy/ : /Ṣād/;
    await user.click(within(options).getByRole('button', { name: wrong }));
    const feedback = screen.getByRole('status');
    expect(feedback).toHaveTextContent('prüfen');
    expect(feedback).not.toHaveTextContent('falsch');
    expect(feedback).toHaveTextContent('Richtig ist');
    const shown = document.querySelector('.paper [lang="ar"]');
    expect(shown?.textContent).toBe(first.word.indopak);

    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByText('2 / 10')).toBeInTheDocument();
    // The next word plays at once.
    expect(audio.played).toHaveLength(2);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('asks heavy or light for rāʾ', async () => {
    renderAt('/labor/ra/quiz');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Schwer oder leicht?'
    );
    const options = screen.getByRole('group', { name: 'Antworten' });
    expect(
      within(options)
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['schwer', 'leicht']);
    const user = userEvent.setup();
    const first = labRound('ra', () => 0)[0]!;
    await user.click(
      within(options).getByRole('button', {
        name: first.answer === 'heavy' ? 'schwer' : 'leicht',
      })
    );
    expect(screen.getByRole('status')).toHaveTextContent('gut');
  });
});
