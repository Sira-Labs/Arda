import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetColoursForTests } from '@/modules/mushaf/colours';
import { chooseScript, resetScriptForTests } from '@/modules/mushaf/script';
import type { PackIndex, PackIndexEntry } from '@arda/quran';
import type { Me } from '@/services/auth';
import { entryFor, loadPack, type PackCache, type PackLoaderDeps } from '@/content/packs';
import { de } from '@/i18n/messages/de';
import { Mushaf } from '@/modules/mushaf/Mushaf';
import { MushafPage } from '@/modules/mushaf/MushafPage';
import { SuraView } from '@/modules/mushaf/SuraView';
import { PackLoaderContext } from '@/modules/mushaf/usePack';
import {
  resetReciterForTests,
  resetSpeedForTests,
  type ReciterId,
} from '@/modules/mushaf/reciters';
import type { Timings } from '@/modules/mushaf/timings';
import { PlayerContext, type PlayerDeps } from '@/modules/mushaf/usePlayer';
import { packRuleName, wordSegments } from '@/modules/mushaf/words';
import { StudentAssignmentItem } from '@/modules/assignments/StudentAssignmentItem';
import { fakeApi, Providers } from './render';

const PACKS = resolve(__dirname, '../public/packs');
const index = JSON.parse(readFileSync(resolve(PACKS, 'index.json'), 'utf8')) as PackIndex;
const juz30 = index.packs.find((p) => p.id === 'uthmani-hafs-juz30')!;
const bytes = readFileSync(resolve(PACKS, juz30.file));
const fileOf = (name: string) => readFileSync(resolve(PACKS, name));

const sha256 = async (data: ArrayBuffer) =>
  createHash('sha256').update(new Uint8Array(data)).digest('hex');

/** A Cache Storage stand-in. */
class MemoryCache implements PackCache {
  entries = new Map<string, Response>();
  async match(url: string) {
    return this.entries.get(url)?.clone();
  }
  async put(url: string, response: Response) {
    this.entries.set(url, response.clone());
  }
  async delete(url: string) {
    return this.entries.delete(url);
  }
}

/** A loader over the pack in the repository; `online` false makes every download fail. */
function loader(
  options: { online?: boolean; body?: Buffer; cache?: MemoryCache | null } = {}
) {
  const calls: string[] = [];
  const cache = options.cache === undefined ? new MemoryCache() : options.cache;
  const deps: PackLoaderDeps = {
    index,
    fetch: async (url) => {
      calls.push(url);
      if (options.online === false) throw new TypeError('offline');
      if (url === `/packs/${juz30.file}`)
        return new Response(new Uint8Array(options.body ?? bytes));
      const other = index.packs.find((p) => url === `/packs/${p.file}`);
      return other
        ? new Response(new Uint8Array(fileOf(other.file)))
        : new Response(null, { status: 404 });
    },
    cache: async () => cache,
    sha256,
  };
  return { deps, calls, cache };
}

describe('loading a pack (S2.3)', () => {
  it('downloads once, checks it and keeps it for offline use', async () => {
    const { deps, calls, cache } = loader();
    const first = await loadPack(juz30, deps);
    expect(first.ok && first.fromCache).toBe(false);
    expect(first.ok && first.stored).toBe(true);
    expect(first.ok && first.pack.suras).toHaveLength(37);
    expect(cache?.entries.has(`/packs/${juz30.file}`)).toBe(true);

    const offline = {
      ...deps,
      fetch: async () => Promise.reject(new TypeError('offline')),
    };
    const again = await loadPack(juz30, offline);
    expect(again.ok && again.fromCache).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('refuses a pack whose checksum is not the one the app was built with', async () => {
    const tampered = Buffer.from(bytes);
    tampered[200] = tampered[200]! ^ 1;
    const { deps, cache } = loader({ body: tampered });
    expect(await loadPack(juz30, deps)).toEqual({ ok: false, failure: 'checksum' });
    expect(cache?.entries.size).toBe(0);
  });

  it('drops a damaged offline copy', async () => {
    const cache = new MemoryCache();
    await cache.put(`/packs/${juz30.file}`, new Response('{"format":1}'));
    const { deps } = loader({ cache, online: false });
    expect(await loadPack(juz30, deps)).toEqual({ ok: false, failure: 'checksum' });
    expect(cache.entries.size).toBe(0);
  });

  it('says so when there is no connection and no copy yet', async () => {
    const { deps } = loader({ online: false });
    expect(await loadPack(juz30, deps)).toEqual({ ok: false, failure: 'offline' });
  });

  it('refuses a file with an unknown rule, even with the right checksum', async () => {
    const odd = Buffer.from(bytes.toString('utf8').replace('"ghunnah"', '"other"'));
    const entry: PackIndexEntry = {
      ...juz30,
      sha256: await sha256(odd.buffer as ArrayBuffer),
    };
    const { deps } = loader({ body: odd });
    expect(await loadPack(entry, deps)).toEqual({ ok: false, failure: 'invalid' });
  });

  it('says offline when the connection drops during the download', async () => {
    const { deps } = loader();
    const broken = {
      ...deps,
      fetch: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new TypeError('network'));
            },
          })
        ),
    };
    expect(await loadPack(juz30, broken)).toEqual({ ok: false, failure: 'offline' });
  });

  it('still shows the pack when it cannot be kept (storage full or blocked)', async () => {
    const full = new MemoryCache();
    full.put = async () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const { deps } = loader({ cache: full });
    const result = await loadPack(juz30, deps);
    expect(result.ok).toBe(true);
    // …and does not claim it opens offline.
    expect(result.ok && result.stored).toBe(false);
  });

  it('works without Cache Storage, online', async () => {
    const { deps } = loader({ cache: null });
    const result = await loadPack(juz30, deps);
    expect(result.ok && !result.stored).toBe(true);
  });

  it('knows which sūras the app has', () => {
    expect(entryFor(112, 'uthmani', index)?.id).toBe('uthmani-hafs-juz30');
    expect(entryFor(2, 'uthmani', index)?.id).toBe('uthmani-hafs-fatiha-baqara');
    expect(entryFor(3, 'uthmani', index)).toBeUndefined();
  });
});

describe('a word and its rules', () => {
  it('colours the nūn of ikhfāʾ and underlines the letter that decides it', () => {
    expect(wordSegments({ t: 'مِن', r: [[2, 3, 'ikhfa']] })).toEqual([
      { text: 'مِ' },
      { text: 'ن', rule: 'ghunna', ruleId: 'ikhfa', role: 'carrier' },
    ]);
    expect(wordSegments({ t: 'شَرِّ', r: [[0, 2, 'ikhfa', 'f']] })).toEqual([
      { text: 'شَ', role: 'follower' },
      { text: 'رِّ' },
    ]);
  });

  it('lets a coloured rule win over the follower of another', () => {
    // كَٰتِبِينَ: the kāf decides an ikhfāʾ before it and carries a madd itself.
    const segments = wordSegments({
      t: 'كَٰتِبِينَ',
      r: [
        [0, 3, 'ikhfa', 'f'],
        [2, 3, 'madd_2'],
      ],
    });
    expect(segments.slice(0, 2)).toEqual([
      { text: 'كَ', role: 'follower' },
      { text: 'ٰ', rule: 'madd-2' },
    ]);
  });

  it('names every rule: the sheet’s, the later ones by their term, in Arabic in Arabic', () => {
    expect(packRuleName('idghaam_no_ghunnah', 'de', de)).toBe('Idghām ohne Ghunna');
    expect(packRuleName('madd_muttasil', 'de', de)).toBe('Madd muttaṣil');
    expect(packRuleName('madd_muttasil', 'ar', de)).toBe('مَدّ مُتَّصِل');
    expect(packRuleName('silent', 'de', de)).toBe('Stumm');
  });
});

/** An audio element that plays nothing: it remembers what it was asked to play. */
class FakeAudio extends EventTarget {
  src = '';
  currentTime = 0;
  /** The file's length is known at once: seeking needs no waiting. */
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
  fire(type: 'ended' | 'error') {
    act(() => {
      this.dispatchEvent(new Event(type));
    });
  }
}

/**
 * A player that records into one fake audio element. Al-Aʿlā 1 is timed word by word: by āya
 * for al-Ḥuṣarī, and for Māhir al-Muʿayqilī within the sūra's file, al-Aʿlā 2 after it.
 */
function fakePlayer() {
  const audio = new FakeAudio();
  const asked: ReciterId[] = [];
  const byAya: Timings = {
    reciter: 'husary-muallim',
    by: 'aya',
    ayat: {
      '87:1': [
        [0, 1, 0, 1000],
        [1, 2, 1000, 2000],
        [2, 3, 2000, 3000],
      ],
    },
  };
  const bySura: Timings = {
    reciter: 'maher',
    by: 'sura',
    ayat: {
      '87:1': [
        [0, 1, 8020, 8820],
        [1, 2, 8820, 9290],
        [2, 3, 9290, 10070],
        [3, 4, 10070, 11800],
      ],
      '87:2': [
        [0, 1, 13130, 14080],
        [1, 2, 14080, 14820],
        [2, 3, 14820, 16600],
      ],
    },
    spans: { '87:1': [7930, 11940], '87:2': [13010, 16740] },
  };
  const deps: PlayerDeps = {
    createAudio: () => audio as unknown as HTMLAudioElement,
    fetchTimings: async (id) => {
      asked.push(id);
      return id === 'maher' ? bySura : byAya;
    },
  };
  return { audio, asked, deps };
}

/** A word's button, by its key (`hafs:113:2:1`). */
const wordAt = (key: string) =>
  document.querySelector<HTMLElement>(`[data-word="${key}"] > button`)!;

function renderAt(
  path: string,
  deps: PackLoaderDeps,
  extra?: ReactNode,
  api: ReturnType<typeof fakeApi> = fakeApi({}, null),
  player: PlayerDeps = fakePlayer().deps
) {
  render(
    <Providers client={api.client}>
      <PlayerContext.Provider value={player}>
        <PackLoaderContext.Provider value={deps}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/mushaf" element={<Mushaf />} />
              <Route path="/mushaf/seite/:page" element={<MushafPage />} />
              <Route path="/mushaf/:sura" element={<SuraView />} />
              <Route path="*" element={extra ?? null} />
            </Routes>
          </MemoryRouter>
        </PackLoaderContext.Provider>
      </PlayerContext.Provider>
    </Providers>
  );
  return api;
}

beforeEach(() => {
  localStorage.clear();
  resetScriptForTests();
  resetColoursForTests();
  resetReciterForTests();
  resetSpeedForTests();
  localStorage.setItem('arda.language', 'de');
});

describe('the muṣḥaf screen (S2.4)', () => {
  it('does not say saved when the device cannot keep the packs', async () => {
    const full = new MemoryCache();
    full.put = async () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    renderAt('/mushaf', loader({ cache: full }).deps);
    const juz30 = await screen.findByRole('region', { name: 'Juzʾ ʿAmma' });
    expect(await within(juz30).findByRole('status')).toHaveTextContent(
      'Nur mit Verbindung: Dieses Gerät kann ihn nicht speichern.'
    );
  });

  it('lists the sūras of each pack and keeps the packs for offline use', async () => {
    renderAt('/mushaf', loader().deps);
    const baqara = await screen.findByRole('region', { name: 'al-Fātiḥa und al-Baqara' });
    const juz30 = screen.getByRole('region', { name: 'Juzʾ ʿAmma' });
    expect(await within(baqara).findByRole('status')).toHaveTextContent(
      'Offline gespeichert'
    );
    expect(await within(juz30).findByRole('status')).toHaveTextContent(
      'Offline gespeichert'
    );
    expect(within(baqara).getAllByRole('link')).toHaveLength(2);
    const links = within(juz30).getAllByRole('link');
    expect(links).toHaveLength(37);
    expect(within(links[34]!).getByText('الإخلاص')).toHaveAttribute('lang', 'ar');
    expect(within(baqara).getByText('البقرة')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('link', { name: /Tanzil Project/ })).toHaveAttribute(
      'href',
      'https://tanzil.net'
    );
  });

  it('opens a sūra on its page, as printed, and turns the pages', async () => {
    renderAt('/mushaf/2?von=2&bis=2', loader().deps);
    // IndoPak: al-Baqara 2 is on the sheikh's page 3, the first after al-Fātiḥa's.
    expect(await screen.findByText('Seite 3 · IndoPak')).toBeInTheDocument();
    expect(document.querySelectorAll('.basmala button')).toHaveLength(4);
    const lines = [...document.querySelectorAll('.mushaf-line')].map((l) =>
      Number(l.getAttribute('data-line'))
    );
    expect(Math.max(...lines)).toBeLessThanOrEqual(15);
    const user = userEvent.setup();
    // al-Baqara 2: "hudan li-l-muttaqīn", the tanwīn merging into the lām without ghunna.
    const hudan = wordAt('hafs:2:2:6');
    expect(hudan.parentElement).toHaveClass('in-range');
    await user.click(hudan);
    expect(
      screen.getByRole('dialog', { name: 'Sūra 2, Āya 2, Wort 6' })
    ).toHaveTextContent('Idghām ohne Ghunna · Stumm');
    await user.keyboard('{Escape}');
    // The next page lies to the left; the assignment stays marked across pages.
    await user.click(screen.getByRole('button', { name: 'Nächste Seite' }));
    expect(await screen.findByText('Seite 4 · IndoPak')).toBeInTheDocument();
    expect(screen.getByText('Deine Aufgabe: Āya 2')).toBeInTheDocument();
    // The turned-to page slides in from the left, where the next page lies.
    expect(document.querySelector('.mushaf-page')).toHaveAttribute(
      'data-entering',
      'next'
    );
    await user.keyboard('{ArrowRight}');
    expect(await screen.findByText('Seite 3 · IndoPak')).toBeInTheDocument();
    expect(document.querySelector('.mushaf-page')).toHaveAttribute(
      'data-entering',
      'previous'
    );
    // In a field the arrows move the cursor, never the page.
    const note = document.body.appendChild(document.createElement('textarea'));
    note.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('Seite 3 · IndoPak')).toBeInTheDocument();
    note.remove();
  });

  it('shows the page as printed: its head, and plain ink on request', async () => {
    renderAt('/mushaf/seite/7', loader().deps);
    expect(await screen.findByText('Seite 7 · IndoPak')).toBeInTheDocument();
    // The head names the para (al-Baqara 30 is in the first) and the sūra, as printed.
    const head = document.querySelector('.mushaf-head')!;
    expect(head).toHaveAttribute('dir', 'rtl');
    expect(head).toHaveTextContent('الٓمّٓ ١');
    expect(head).toHaveTextContent('البقرة ٢');
    expect(head).toHaveTextContent('٧');
    const colours = screen.getByRole('button', { name: 'Tajwīd-Farben' });
    expect(colours).toHaveAttribute('aria-pressed', 'true');
    await userEvent.setup().click(colours);
    expect(colours).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('.mushaf-page')).toHaveAttribute(
      'data-colours',
      'plain'
    );
    expect(localStorage.getItem('arda.mushafColours')).toBe('plain');
  });

  describe('turning by swiping', () => {
    const at = (x: number, y = 300) => ({ clientX: x, clientY: y });
    const swipe = (from: object[], to: object[]) => {
      const page = document.querySelector('.mushaf-page')!;
      fireEvent.touchStart(page, { touches: from });
      fireEvent.touchMove(page, { touches: to });
      fireEvent.touchEnd(page, { touches: [], changedTouches: to });
    };
    afterEach(() => vi.unstubAllGlobals());

    it('turns with one finger sideways, never while scrolling or pinching', async () => {
      renderAt('/mushaf/seite/7', loader().deps);
      expect(await screen.findByText('Seite 7 · IndoPak')).toBeInTheDocument();
      // Mostly up or down: scrolling.
      swipe([at(100, 500)], [at(170, 300)]);
      // Two fingers apart: zooming in.
      swipe([at(150), at(250)], [at(60), at(340)]);
      expect(screen.getByText('Seite 7 · IndoPak')).toBeInTheDocument();
      // To the right: the next page of a right-to-left book.
      swipe([at(100)], [at(300)]);
      expect(await screen.findByText('Seite 8 · IndoPak')).toBeInTheDocument();
      swipe([at(300)], [at(100)]);
      expect(await screen.findByText('Seite 7 · IndoPak')).toBeInTheDocument();
    });

    it('moves a zoomed-in view instead of turning the page', async () => {
      vi.stubGlobal('visualViewport', { scale: 2.5 });
      renderAt('/mushaf/seite/7', loader().deps);
      expect(await screen.findByText('Seite 7 · IndoPak')).toBeInTheDocument();
      swipe([at(100)], [at(300)]);
      expect(screen.getByText('Seite 7 · IndoPak')).toBeInTheDocument();
    });
  });

  describe('the reciter (S3.1)', () => {
    const recording = (folder: string, file: string) =>
      `https://everyayah.com/data/${folder}/${file}.mp3`;

    it('recites the page āya by āya, marking each word as it is recited', async () => {
      const { audio, deps } = fakePlayer();
      renderAt('/mushaf/seite/598', loader().deps, undefined, undefined, deps);
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'Seite anhören' }));
      // Al-Aʿlā opens the page: its basmala first, al-Ḥuṣarī's teaching recitation.
      expect(audio.played).toEqual([recording('Husary_Muallim_128kbps', '001001')]);
      audio.fire('ended');
      expect(audio.played.at(-1)).toBe(recording('Husary_Muallim_128kbps', '087001'));
      audio.at(1.5);
      expect(wordAt('hafs:87:1:2').parentElement).toHaveAttribute('data-playing', 'true');
      expect(wordAt('hafs:87:1:1').parentElement).not.toHaveAttribute('data-playing');
      audio.at(2.5);
      expect(wordAt('hafs:87:1:3').parentElement).toHaveAttribute('data-playing', 'true');
      // Slower, then paused and on again where it stopped.
      await user.click(screen.getByRole('button', { name: '0.5×' }));
      expect(audio.playbackRate).toBe(0.5);
      expect(localStorage.getItem('arda.speed')).toBe('0.5');
      // The player stays docked at the bottom: paused, on again where it stopped, stopped.
      const dock = screen.getByRole('region', { name: 'Es läuft' });
      expect(dock).toHaveTextContent('Sūra 87 · Āya 1');
      await user.click(within(dock).getByRole('button', { name: 'Anhalten' }));
      expect(audio.paused).toBe(true);
      await user.click(within(dock).getByRole('button', { name: 'Weiter' }));
      expect(audio.paused).toBe(false);
      expect(audio.currentTime).toBe(2.5);
      await user.click(within(dock).getByRole('button', { name: 'Stopp' }));
      expect(audio.paused).toBe(true);
      expect(screen.queryByRole('region', { name: 'Es läuft' })).toBeNull();
    });

    it('plays a tapped word’s āya, again and again when asked to repeat', async () => {
      const { audio, deps } = fakePlayer();
      renderAt('/mushaf/seite/598', loader().deps, undefined, undefined, deps);
      const user = userEvent.setup();
      await screen.findByRole('button', { name: 'Seite anhören' });
      await user.click(wordAt('hafs:87:2:1'));
      // The tapped word's āya is marked, and its sheet offers to play or repeat it.
      expect(wordAt('hafs:87:2:2').parentElement).toHaveAttribute('data-chosen', 'true');
      expect(wordAt('hafs:87:1:1').parentElement).not.toHaveAttribute('data-chosen');
      const sheet = screen.getByRole('dialog', { name: 'Sūra 87, Āya 2, Wort 1' });
      expect(sheet).toHaveTextContent('Sūra 87 · Āya 2');
      await user.click(within(sheet).getByRole('button', { name: 'Wiederholen' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(audio.played).toEqual([recording('Husary_Muallim_128kbps', '087002')]);
      const dock = screen.getByRole('region', { name: 'Es läuft' });
      expect(within(dock).getByRole('button', { name: 'Wiederholen' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      audio.fire('ended');
      // After a pause to repeat after him, the āya again.
      await waitFor(() => expect(audio.played).toHaveLength(2), { timeout: 2500 });
      expect(audio.played[1]).toBe(recording('Husary_Muallim_128kbps', '087002'));
    });

    it('ends the āya when repeat is turned off in the pause before it comes again', async () => {
      const { audio, deps } = fakePlayer();
      renderAt('/mushaf/seite/598', loader().deps, undefined, undefined, deps);
      const user = userEvent.setup();
      await screen.findByRole('button', { name: 'Seite anhören' });
      await user.click(wordAt('hafs:87:2:1'));
      await user.click(screen.getByRole('button', { name: 'Wiederholen' }));
      audio.fire('ended');
      const dock = screen.getByRole('region', { name: 'Es läuft' });
      await user.click(within(dock).getByRole('button', { name: 'Wiederholen' }));
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(audio.played).toHaveLength(1);
      expect(screen.queryByRole('region', { name: 'Es läuft' })).toBeNull();
    });

    it('does not repeat a page that was left during the pause before the repeat', async () => {
      const { audio, deps } = fakePlayer();
      renderAt('/mushaf/seite/598', loader().deps, undefined, undefined, deps);
      const user = userEvent.setup();
      await screen.findByRole('button', { name: 'Seite anhören' });
      await user.click(wordAt('hafs:87:2:1'));
      await user.click(screen.getByRole('button', { name: 'Wiederholen' }));
      audio.fire('ended');
      await user.click(screen.getByRole('button', { name: 'Nächste Seite' }));
      expect(await screen.findByText('Seite 599 · IndoPak')).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(audio.played).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Seite anhören' })).toBeInTheDocument();
    });

    it('plays Māhir al-Muʿayqilī from his sūra’s file, word by word, on into the next āya', async () => {
      const { audio, deps } = fakePlayer();
      renderAt('/mushaf/seite/598', loader().deps, undefined, undefined, deps);
      const user = userEvent.setup();
      await user.selectOptions(
        await screen.findByRole('combobox', { name: 'Rezitator' }),
        'Māhir al-Muʿayqilī'
      );
      await user.click(wordAt('hafs:87:1:1'));
      await user.click(screen.getByRole('button', { name: 'Abspielen' }));
      const sura =
        'https://download.quranicaudio.com/quran/maher_almu3aiqly/year1440/087.mp3';
      // The sūra's file, from where al-Aʿlā 1 starts in it.
      await waitFor(() => expect(audio.played).toEqual([sura]));
      expect(audio.currentTime).toBeCloseTo(7.93);
      audio.at(9);
      expect(wordAt('hafs:87:1:2').parentElement).toHaveAttribute('data-playing', 'true');
      expect(wordAt('hafs:87:1:3').parentElement).not.toHaveAttribute('data-playing');
      // The āya's end is in the middle of the file: on into al-Aʿlā 2, no seek, same file.
      audio.at(11.95);
      expect(screen.getByRole('region', { name: 'Es läuft' })).toHaveTextContent(
        'Sūra 87 · Āya 2'
      );
      expect(audio.src).toBe(sura);
      expect(audio.currentTime).toBe(11.95);
      audio.at(13.5);
      expect(wordAt('hafs:87:2:1').parentElement).toHaveAttribute('data-playing', 'true');
    });

    it('repeats Māhir al-Muʿayqilī’s āya from its start in the sūra’s file', async () => {
      const { audio, deps } = fakePlayer();
      renderAt('/mushaf/seite/598', loader().deps, undefined, undefined, deps);
      const user = userEvent.setup();
      await user.selectOptions(
        await screen.findByRole('combobox', { name: 'Rezitator' }),
        'Māhir al-Muʿayqilī'
      );
      await user.click(wordAt('hafs:87:2:1'));
      await user.click(screen.getByRole('button', { name: 'Wiederholen' }));
      await waitFor(() => expect(audio.currentTime).toBeCloseTo(13.01));
      // At the āya's end the file is paused for the pause to repeat, then the āya again.
      audio.at(16.75);
      expect(audio.paused).toBe(true);
      await waitFor(() => expect(audio.currentTime).toBeCloseTo(13.01), {
        timeout: 2500,
      });
      expect(audio.paused).toBe(false);
    });

    it('says when the recitation cannot be loaded, and falls silent on a turned page', async () => {
      const { audio, deps } = fakePlayer();
      renderAt('/mushaf/seite/598', loader().deps, undefined, undefined, deps);
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'Seite anhören' }));
      audio.fire('error');
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Der Vortrag lädt nicht. Prüfe deine Verbindung.'
      );
      await user.click(screen.getByRole('button', { name: 'Seite anhören' }));
      expect(audio.paused).toBe(false);
      await user.click(screen.getByRole('button', { name: 'Nächste Seite' }));
      expect(await screen.findByText('Seite 599 · IndoPak')).toBeInTheDocument();
      expect(audio.paused).toBe(true);
      expect(screen.getByRole('button', { name: 'Seite anhören' })).toBeInTheDocument();
    });
  });

  it('says when a page is not in the muṣḥaf yet', async () => {
    renderAt('/mushaf/seite/300', loader().deps);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Seite ist noch nicht im Muṣḥaf.'
    );
  });

  it('shows a sūra word by word in the IndoPak script, as the sheikh’s muṣḥaf prints it', async () => {
    renderAt('/mushaf/112', loader().deps);
    expect(await screen.findByText('Seite 610 · IndoPak')).toBeInTheDocument();
    expect(screen.getByText('الإخلاص', { selector: '.page-sura' })).toHaveAttribute(
      'dir',
      'rtl'
    );
    const text = document.querySelector('.mushaf-text')!;
    expect(text).toHaveAttribute('lang', 'ar');
    expect(text).toHaveAttribute('data-script', 'indopak');
    expect(text).toHaveAttribute('data-layout', 'lines');
    expect(text.querySelectorAll('[data-word^="basmala:112:"]')).toHaveLength(4);
    expect(wordAt('hafs:112:1:4')).toHaveTextContent('اَحَدٌ');
    // The āya ends as printed: the marker with its number and the stop sign after it.
    const ends = [
      ...text.querySelectorAll('[data-word^="basmala:112:"] .aya-end'),
      ...text.querySelectorAll('[data-word^="hafs:112:"] .aya-end'),
    ].map((e) => e.textContent);
    expect(ends).toEqual(['۝', '۝١ۚ', '۝٢ۚ', '۝٣ۙ', '۝٤ࣖ']);
    // Every coloured letter is named, so colour is never the only signal.
    for (const coloured of text.querySelectorAll('.tj')) {
      expect(coloured.getAttribute('title')).toBeTruthy();
    }
  });

  it('shows the Madīna (ʿUthmānī) page when chosen, numbering the āyāt itself', async () => {
    chooseScript('uthmani');
    renderAt('/mushaf/112', loader().deps);
    expect(await screen.findByText('Seite 604 · Madīna')).toBeInTheDocument();
    const text = document.querySelector('.mushaf-text')!;
    expect(text).toHaveAttribute('data-script', 'madina');
    expect(text).toHaveAttribute('data-layout', 'flow');
    expect(wordAt('hafs:112:1:4')).toHaveTextContent('أَحَدٌ');
    expect(
      [...text.querySelectorAll('[data-word^="hafs:112:"] .aya-end')].map(
        (e) => e.textContent
      )
    ).toEqual(['۝١', '۝٢', '۝٣', '۝٤']);
    // al-Ikhlāṣ, al-Falaq and an-Nās share the last page.
    expect([...document.querySelectorAll('.sura-heading')]).toHaveLength(3);
  });

  it('lets the student choose the script, IndoPak first, and keeps the choice', async () => {
    renderAt('/mushaf', loader().deps);
    const user = userEvent.setup();
    const indopak = await screen.findByRole('radio', { name: 'IndoPak' });
    expect(indopak).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByText(
        'IndoPak-Schrift wie im Muṣḥaf deines Sheikhs (15 Zeilen), riwāyat Ḥafṣ.'
      )
    ).toBeInTheDocument();
    // One tab stop for the group; the arrows choose within it.
    expect(screen.getByRole('radio', { name: 'Madīna' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
    indopak.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Madīna' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Madīna' })).toHaveAttribute(
      'tabindex',
      '0'
    );
    await user.keyboard('{ArrowLeft}');
    expect(indopak).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'Madīna' }));
    expect(screen.getByRole('radio', { name: 'Madīna' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(localStorage.getItem('arda.mushafScript')).toBe('uthmani');
    expect(screen.getByRole('link', { name: /DigitalKhatt/ })).toHaveAttribute(
      'href',
      'https://github.com/DigitalKhatt/digitalkhatt-js'
    );
  });

  it('opens a tapped word with its rules and the way to the rule card', async () => {
    renderAt('/mushaf/113', loader().deps);
    const user = userEvent.setup();
    await screen.findByText('الفلق', { selector: '.page-sura' });
    const min = wordAt('hafs:113:2:1');
    await user.click(min);
    const sheet = screen.getByRole('dialog', { name: 'Sūra 113, Āya 2, Wort 1' });
    expect(sheet).toHaveTextContent('Ikhfāʾ · Ghunna');
    expect(within(sheet).getByRole('link', { name: 'Zur Regelkarte' })).toHaveAttribute(
      'href',
      '/pfad/2/ikhfa'
    );
    expect(min).toHaveAttribute('aria-pressed', 'true');

    await user.click(wordAt('hafs:113:2:2'));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'entscheidet die Regel davor: Ikhfāʾ'
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the later rules too, and says when a word has none', async () => {
    chooseScript('uthmani');
    renderAt('/mushaf/112', loader().deps);
    const user = userEvent.setup();
    await screen.findByText('الإخلاص', { selector: '.page-sura' });
    await user.click(wordAt('hafs:112:2:2'));
    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveTextContent('Hamzat al-waṣl · Stumm');
    expect(sheet).toHaveTextContent('Lām shamsiyya · Stumm');
    // ٱللَّهُ opens the āya: there its hamzat al-waṣl is pronounced, so nothing is marked.
    await user.click(wordAt('hafs:112:2:1'));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Hier ist keine Regel markiert: klar lesen.'
    );
  });

  it('marks an assignment’s āyāt', async () => {
    renderAt('/mushaf/113?von=2&bis=3', loader().deps);
    expect(await screen.findByText('Deine Aufgabe: Āyāt 2–3')).toBeInTheDocument();
    const marked = [...document.querySelectorAll('.in-range[data-word]')].map((e) =>
      e.getAttribute('data-word')!.split(':').slice(1, 3).join(':')
    );
    expect([...new Set(marked)]).toEqual(['113:2', '113:3']);
    expect(marked).toHaveLength(9);
  });

  it('records an āya from its sheet, and an assignment from its marked range (S4.1)', async () => {
    const user = userEvent.setup();
    renderAt('/mushaf/112', loader().deps);
    await screen.findByText('الإخلاص', { selector: '.page-sura' });
    await user.click(wordAt('hafs:112:2:1'));
    await user.click(screen.getByRole('button', { name: 'Aufnehmen' }));
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveTextContent('Sūra 112 · Āya 2 aufnehmen');
    // Nobody is signed in: recording asks to sign in first.
    expect(within(panel).getByRole('link', { name: 'Anmelden' })).toBeInTheDocument();
  });

  it('offers to record the assignment it opened', async () => {
    const id = '33333333-3333-4333-8333-333333333333';
    renderAt(`/mushaf/113?von=2&bis=3&aufgabe=${id}&halaqa=${id}`, loader().deps);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufgabe aufnehmen' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Sūra 113 · Āyāt 2–3 aufnehmen');
  });

  it('ignores a range that is not in the sūra', async () => {
    renderAt('/mushaf/113?von=4&bis=9', loader().deps);
    await screen.findByText('الفلق', { selector: '.page-sura' });
    expect(document.querySelectorAll('.in-range')).toHaveLength(0);
  });

  it('names a rule once when its family has the same name', async () => {
    renderAt('/mushaf/78', loader().deps);
    const user = userEvent.setup();
    await screen.findByText('النبإ', { selector: '.page-sura' });
    // عَمَّ: the mīm with shadda is the ghunna rule, in the ghunna family.
    await user.click(wordAt('hafs:78:1:1'));
    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveTextContent('Ghunna');
    expect(sheet).not.toHaveTextContent('Ghunna · Ghunna');
  });

  it('says when a sūra is not in the muṣḥaf yet, or cannot be loaded', async () => {
    renderAt('/mushaf/3', loader().deps);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Sūra ist noch nicht im Muṣḥaf.'
    );
  });

  it('asks to open it once online when there is no offline copy yet', async () => {
    renderAt('/mushaf/112', loader({ online: false }).deps);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Öffne den Muṣḥaf einmal mit Verbindung'
    );
  });
});

describe('assignments in the muṣḥaf', () => {
  it('open their āyāt from the assignment', () => {
    renderAt(
      '/heute',
      loader().deps,
      <ul>
        <StudentAssignmentItem
          assignment={{
            id: 'a',
            kind: 'recite',
            studentId: null,
            range: { sura: 112, from: 1, to: 4 },
            focusRule: null,
            repetitions: null,
            note: null,
            dueOn: '2026-10-09',
            createdAt: '2026-10-01T10:00:00Z',
            halaqaId: 'h',
            halaqaName: 'H',
            fromName: null,
            doneAt: null,
          }}
          busy={false}
          onMark={() => {}}
        />
      </ul>
    );
    expect(screen.getByRole('link', { name: 'Im Muṣḥaf öffnen' })).toHaveAttribute(
      'href',
      '/mushaf/112?von=1&bis=4&aufgabe=a&halaqa=h'
    );
  });
});

const HALAQA = '11111111-1111-4111-8111-111111111111';
const TEACHER: Me = {
  id: 't',
  email: 'sheikh@example.org',
  name: 'Sheikh Ahmad',
  role: 'teacher',
  timeZone: null,
  language: 'de',
};
const teacherApi = () =>
  fakeApi(
    {
      'GET /api/v1/halaqat': () =>
        Response.json({
          halaqat: [
            {
              id: HALAQA,
              name: 'Juzʾ ʿAmma',
              oneToOne: false,
              role: 'teacher',
              status: 'active',
              teacherName: 'Sheikh Ahmad',
              students: 1,
              pending: 0,
            },
          ],
        }),
      [`GET /api/v1/halaqat/${HALAQA}`]: () =>
        Response.json({
          role: 'teacher',
          halaqa: {
            id: HALAQA,
            name: 'Juzʾ ʿAmma',
            oneToOne: false,
            teacherName: null,
            createdAt: '',
          },
          members: [
            {
              userId: 's',
              name: 'Amina',
              email: 'amina@example.org',
              role: 'student',
              status: 'active',
              joinedAt: '',
            },
          ],
          invite: null,
        }),
      [`POST /api/v1/halaqat/${HALAQA}/assignments`]: () =>
        Response.json({ id: 'new' }, { status: 201 }),
    },
    TEACHER
  );

describe('assigning on the page (S3.2)', () => {
  it('gives the words a teacher picks, from a word to a word', async () => {
    const api = renderAt('/mushaf/113', loader().deps, undefined, teacherApi());
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufgabe hier geben' }));
    expect(
      screen.getByText('Tippe auf das erste und dann auf das letzte Wort der Aufgabe.')
    ).toBeInTheDocument();
    // The last word first: picking works in either order.
    await user.click(wordAt('hafs:113:3:4'));
    await user.click(wordAt('hafs:113:2:2'));
    const panel = await screen.findByRole('dialog', { name: 'Aufgabe hier geben' });
    expect(panel).toHaveTextContent('Sūra 113, Āya 2 Wort 2 bis Āya 3 Wort 4');
    expect(within(panel).queryByLabelText('Sūra')).not.toBeInTheDocument();
    expect(
      await within(panel).findByRole('option', { name: 'Amina' })
    ).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Aufgabe geben' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Aufgabe gegeben.');
    expect(api.calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      kind: 'recite',
      range: { sura: 113, from: 2, to: 3, words: { from: 2, to: 4 } },
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts again when the second word is in another sūra', async () => {
    renderAt('/mushaf/113', loader().deps, undefined, teacherApi());
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufgabe hier geben' }));
    await user.click(wordAt('hafs:113:5:1'));
    await user.click(wordAt('hafs:114:1:1'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(wordAt('hafs:114:1:1').parentElement).toHaveClass('picked');
    expect(wordAt('hafs:113:5:1').parentElement).not.toHaveClass('picked');
  });

  it('can be left before both words are picked', async () => {
    renderAt('/mushaf/113', loader().deps, undefined, teacherApi());
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufgabe hier geben' }));
    await user.click(wordAt('hafs:113:2:2'));
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.getByText(de.mushaf.tap)).toBeInTheDocument();
    expect(document.querySelector('.picked')).toBeNull();
    // Tapping a word shows its rules again.
    await user.click(wordAt('hafs:113:2:1'));
    expect(
      screen.getByRole('dialog', { name: 'Sūra 113, Āya 2, Wort 1' })
    ).toBeInTheDocument();
  });

  it('gives whole āyāt when the pick begins and ends with them', async () => {
    const api = renderAt('/mushaf/113', loader().deps, undefined, teacherApi());
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufgabe hier geben' }));
    await user.click(wordAt('hafs:113:1:1'));
    await user.click(wordAt('hafs:113:2:4'));
    const panel = await screen.findByRole('dialog');
    expect(panel).toHaveTextContent('Sūra 113, Āyāt 1–2');
    await user.click(within(panel).getByRole('button', { name: 'Aufgabe geben' }));
    await screen.findByRole('status');
    expect(api.calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      range: { sura: 113, from: 1, to: 2 },
    });
    expect(
      (api.calls.find((c) => c.method === 'POST')?.body as { range: object }).range
    ).not.toHaveProperty('words');
  });

  it('is offered to teachers only', async () => {
    renderAt('/mushaf/113', loader().deps);
    await screen.findByText('الفلق', { selector: '.page-sura' });
    expect(
      screen.queryByRole('button', { name: 'Aufgabe hier geben' })
    ).not.toBeInTheDocument();
  });

  it('marks exactly the words of an assignment', async () => {
    renderAt('/mushaf/113?von=2&bis=3&wvon=2&wbis=4', loader().deps);
    expect(
      await screen.findByText('Sūra 113, Āya 2 Wort 2 bis Āya 3 Wort 4')
    ).toBeInTheDocument();
    const marks = (aya: number, count: number) =>
      Array.from({ length: count }, (_, i) =>
        wordAt(`hafs:113:${aya}:${i + 1}`).parentElement!.classList.contains('in-range')
      );
    // al-Falaq 2 has four words (from the second on), 3 has five (to the fourth).
    expect(marks(2, 4)).toEqual([false, true, true, true]);
    expect(marks(3, 5)).toEqual([true, true, true, true, false]);
  });

  it('links from an assignment to its words', () => {
    renderAt(
      '/heute',
      loader().deps,
      <ul>
        <StudentAssignmentItem
          assignment={{
            id: 'a',
            kind: 'read',
            studentId: null,
            range: { sura: 113, from: 2, to: 3, words: { from: 2, to: 4 } },
            focusRule: null,
            repetitions: 2,
            note: null,
            dueOn: '2026-10-09',
            createdAt: '2026-10-01T10:00:00Z',
            halaqaId: 'h',
            halaqaName: 'H',
            fromName: null,
            doneAt: null,
          }}
          busy={false}
          onMark={() => {}}
        />
      </ul>
    );
    // The Arabic name of the sūra follows in the same line.
    expect(
      screen.getByText(/^Sūra 113, Āya 2 Wort 2 bis Āya 3 Wort 4/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Im Muṣḥaf öffnen' })).toHaveAttribute(
      'href',
      '/mushaf/113?von=2&bis=3&wvon=2&wbis=4&aufgabe=a&halaqa=h'
    );
  });
});
