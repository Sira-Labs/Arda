import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PackIndex, PackIndexEntry } from '@arda/quran';
import { entryFor, loadPack, type PackCache, type PackLoaderDeps } from '@/content/packs';
import { de } from '@/i18n/messages/de';
import { Mushaf } from '@/modules/mushaf/Mushaf';
import { SuraView } from '@/modules/mushaf/SuraView';
import { PackLoaderContext } from '@/modules/mushaf/usePack';
import { packRuleName, wordSegments } from '@/modules/mushaf/words';
import { StudentAssignmentItem } from '@/modules/assignments/StudentAssignmentItem';
import { fakeApi, Providers } from './render';

const PACKS = resolve(__dirname, '../public/packs');
const index = JSON.parse(readFileSync(resolve(PACKS, 'index.json'), 'utf8')) as PackIndex;
const juz30 = index.packs[0]!;
const bytes = readFileSync(resolve(PACKS, juz30.file));

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
      return url === `/packs/${juz30.file}`
        ? new Response(new Uint8Array(options.body ?? bytes))
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
    expect((await loadPack(juz30, deps)).ok).toBe(true);
  });

  it('works without Cache Storage, online', async () => {
    const { deps } = loader({ cache: null });
    expect((await loadPack(juz30, deps)).ok).toBe(true);
  });

  it('knows which sūras the app has', () => {
    expect(entryFor(112, index)?.id).toBe('uthmani-hafs-juz30');
    expect(entryFor(2, index)).toBeUndefined();
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

function renderAt(path: string, deps: PackLoaderDeps, extra?: ReactNode) {
  const api = fakeApi({}, null);
  return render(
    <Providers client={api.client}>
      <PackLoaderContext.Provider value={deps}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/mushaf" element={<Mushaf />} />
            <Route path="/mushaf/:sura" element={<SuraView />} />
            <Route path="*" element={extra ?? null} />
          </Routes>
        </MemoryRouter>
      </PackLoaderContext.Provider>
    </Providers>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

describe('the muṣḥaf screen (S2.4)', () => {
  it('lists the sūras of Juzʾ ʿAmma and keeps them for offline use', async () => {
    renderAt('/mushaf', loader().deps);
    expect(await screen.findByRole('status')).toHaveTextContent('Offline gespeichert');
    const links = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.match(/^\/mushaf\/\d+$/));
    expect(links).toHaveLength(37);
    expect(within(links[34]!).getByText('الإخلاص')).toHaveAttribute('lang', 'ar');
    expect(screen.getByRole('link', { name: /Tanzil Project/ })).toHaveAttribute(
      'href',
      'https://tanzil.net'
    );
  });

  it('shows a sūra word by word with its basmala and its āyāt numbered', async () => {
    renderAt('/mushaf/112', loader().deps);
    expect(await screen.findByRole('heading', { name: 'الإخلاص' })).toHaveAttribute(
      'dir',
      'rtl'
    );
    expect(screen.getByText('Sūra 112 · 4 Āyāt')).toBeInTheDocument();
    const text = document.querySelector('.mushaf-text')!;
    expect(text).toHaveAttribute('lang', 'ar');
    expect(text.querySelector('.basmala')?.querySelectorAll('button')).toHaveLength(4);
    expect([...text.querySelectorAll('.aya-end')].map((e) => e.textContent)).toEqual([
      '۝١',
      '۝٢',
      '۝٣',
      '۝٤',
    ]);
    // Every coloured letter is named, so colour is never the only signal.
    for (const coloured of text.querySelectorAll('.tj')) {
      expect(coloured.getAttribute('title')).toBeTruthy();
    }
  });

  it('opens a tapped word with its rules and the way to the rule card', async () => {
    renderAt('/mushaf/113', loader().deps);
    const user = userEvent.setup();
    const aya2 = await screen.findByText((_, el) => el?.id === 'aya-2');
    const [min, sharr] = within(aya2).getAllByRole('button');
    await user.click(min!);
    const sheet = screen.getByRole('dialog', { name: 'Sūra 113, Āya 2, Wort 1' });
    expect(sheet).toHaveTextContent('Ikhfāʾ · Ghunna');
    expect(within(sheet).getByRole('link', { name: 'Zur Regelkarte' })).toHaveAttribute(
      'href',
      '/pfad/2/ikhfa'
    );
    expect(min).toHaveAttribute('aria-pressed', 'true');

    await user.click(sharr!);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'entscheidet die Regel davor: Ikhfāʾ'
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the later rules too, and says when a word has none', async () => {
    renderAt('/mushaf/112', loader().deps);
    const user = userEvent.setup();
    const aya2 = await screen.findByText((_, el) => el?.id === 'aya-2');
    const [allahu, samad] = within(aya2).getAllByRole('button');
    await user.click(samad!);
    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveTextContent('Hamzat al-waṣl · Stumm');
    expect(sheet).toHaveTextContent('Lām shamsiyya · Stumm');
    // ٱللَّهُ opens the āya: there its hamzat al-waṣl is pronounced, so nothing is marked.
    await user.click(allahu!);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Hier ist keine Regel markiert: klar lesen.'
    );
  });

  it('marks an assignment’s āyāt', async () => {
    renderAt('/mushaf/113?von=2&bis=3', loader().deps);
    expect(await screen.findByText('Deine Aufgabe: Āyāt 2–3')).toBeInTheDocument();
    const marked = [...document.querySelectorAll('.aya.in-range')].map((e) => e.id);
    expect(marked).toEqual(['aya-2', 'aya-3']);
  });

  it('ignores a range that is not in the sūra', async () => {
    renderAt('/mushaf/113?von=4&bis=9', loader().deps);
    await screen.findByRole('heading', { name: 'الفلق' });
    expect(document.querySelectorAll('.aya.in-range')).toHaveLength(0);
  });

  it('names a rule once when its family has the same name', async () => {
    renderAt('/mushaf/78', loader().deps);
    const user = userEvent.setup();
    const aya1 = await screen.findByText((_, el) => el?.id === 'aya-1');
    // عَمَّ: the mīm with shadda is the ghunna rule, in the ghunna family.
    await user.click(within(aya1).getAllByRole('button')[0]!);
    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveTextContent('Ghunna');
    expect(sheet).not.toHaveTextContent('Ghunna · Ghunna');
  });

  it('says when a sūra is not in the muṣḥaf yet, or cannot be loaded', async () => {
    renderAt('/mushaf/2', loader().deps);
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
      '/mushaf/112?von=1&bis=4'
    );
  });
});
