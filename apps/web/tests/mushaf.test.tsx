import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { chooseScript, resetScriptForTests } from '@/modules/mushaf/script';
import type { PackIndex, PackIndexEntry } from '@arda/quran';
import type { Me } from '@/services/auth';
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

function renderAt(
  path: string,
  deps: PackLoaderDeps,
  extra?: ReactNode,
  api: ReturnType<typeof fakeApi> = fakeApi({}, null)
) {
  render(
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
  return api;
}

beforeEach(() => {
  localStorage.clear();
  resetScriptForTests();
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

  it('shows al-Baqara, all 286 āyāt, with its rules', async () => {
    renderAt('/mushaf/2?von=2&bis=2', loader().deps);
    expect(await screen.findByRole('heading', { name: 'البقرة' })).toBeInTheDocument();
    // The āyāt come in batches (40 at first), so that a long sūra shows at once.
    expect(document.querySelectorAll('.aya').length).toBeLessThan(286);
    await waitFor(() => expect(document.querySelectorAll('.aya')).toHaveLength(286), {
      timeout: 10_000,
    });
    expect(document.querySelectorAll('.basmala button')).toHaveLength(4);
    const user = userEvent.setup();
    // al-Baqara 2: "hudan li-l-muttaqīn", the tanwīn merging into the lām without ghunna.
    const aya2 = screen.getByText((_, el) => el?.id === 'aya-2');
    expect(aya2).toHaveClass('in-range');
    await user.click(within(aya2).getAllByRole('button')[5]!);
    expect(
      screen.getByRole('dialog', { name: 'Sūra 2, Āya 2, Wort 6' })
    ).toHaveTextContent('Idghām ohne Ghunna · Stumm');
  });

  it('shows a sūra word by word in the IndoPak script, as the sheikh’s muṣḥaf prints it', async () => {
    renderAt('/mushaf/112', loader().deps);
    expect(await screen.findByRole('heading', { name: 'الإخلاص' })).toHaveAttribute(
      'dir',
      'rtl'
    );
    expect(screen.getByText('Sūra 112 · 4 Āyāt')).toBeInTheDocument();
    const text = document.querySelector('.mushaf-text')!;
    expect(text).toHaveAttribute('lang', 'ar');
    expect(text).toHaveAttribute('data-script', 'indopak');
    expect(text.querySelector('.basmala')?.querySelectorAll('button')).toHaveLength(4);
    const words = () =>
      [...text.querySelectorAll('.mushaf-word')].map((b) => b.textContent);
    expect(words()).toContain('اَحَدٌ');
    // The āya ends as printed: the marker with its number and the stop sign after it.
    expect([...text.querySelectorAll('.aya-end')].map((e) => e.textContent)).toEqual([
      '۝',
      '۝١ۚ',
      '۝٢ۚ',
      '۝٣ۙ',
      '۝٤\u08D6',
    ]);
    // Every coloured letter is named, so colour is never the only signal.
    for (const coloured of text.querySelectorAll('.tj')) {
      expect(coloured.getAttribute('title')).toBeTruthy();
    }
  });

  it('shows the Madīna (ʿUthmānī) script when chosen, numbering the āyāt itself', async () => {
    chooseScript('uthmani');
    renderAt('/mushaf/112', loader().deps);
    await screen.findByRole('heading', { name: 'الإخلاص' });
    const text = document.querySelector('.mushaf-text')!;
    expect(text).toHaveAttribute('data-script', 'madina');
    expect(
      [...text.querySelectorAll('.mushaf-word')].map((b) => b.textContent)
    ).toContain('أَحَدٌ');
    expect([...text.querySelectorAll('.aya-end')].map((e) => e.textContent)).toEqual([
      '۝١',
      '۝٢',
      '۝٣',
      '۝٤',
    ]);
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
      '/mushaf/112?von=1&bis=4'
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
    const aya = (n: number) => screen.getByText((_, el) => el?.id === `aya-${n}`);
    // The last word first: picking works in either order.
    await user.click(within(aya(3)).getAllByRole('button')[3]!);
    await user.click(within(aya(2)).getAllByRole('button')[1]!);
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

  it('can be left before both words are picked', async () => {
    renderAt('/mushaf/113', loader().deps, undefined, teacherApi());
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufgabe hier geben' }));
    const aya2 = screen.getByText((_, el) => el?.id === 'aya-2');
    await user.click(within(aya2).getAllByRole('button')[1]!);
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(
      screen.getByText('Tippe auf ein Wort, um seine Regeln zu sehen.')
    ).toBeInTheDocument();
    expect(document.querySelector('.picked')).toBeNull();
    // Tapping a word shows its rules again.
    await user.click(within(aya2).getAllByRole('button')[0]!);
    expect(
      screen.getByRole('dialog', { name: 'Sūra 113, Āya 2, Wort 1' })
    ).toBeInTheDocument();
  });

  it('gives whole āyāt when the pick begins and ends with them', async () => {
    const api = renderAt('/mushaf/113', loader().deps, undefined, teacherApi());
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Aufgabe hier geben' }));
    const aya = (n: number) => screen.getByText((_, el) => el?.id === `aya-${n}`);
    await user.click(within(aya(1)).getAllByRole('button')[0]!);
    await user.click(within(aya(2)).getAllByRole('button').at(-1)!);
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
    await screen.findByRole('heading', { name: 'الفلق' });
    expect(
      screen.queryByRole('button', { name: 'Aufgabe hier geben' })
    ).not.toBeInTheDocument();
  });

  it('marks exactly the words of an assignment', async () => {
    renderAt('/mushaf/113?von=2&bis=3&wvon=2&wbis=4', loader().deps);
    expect(
      await screen.findByText('Sūra 113, Āya 2 Wort 2 bis Āya 3 Wort 4')
    ).toBeInTheDocument();
    const words = (n: number) =>
      [...document.querySelectorAll(`#aya-${n} > span`)].filter((s) =>
        s.querySelector('button')
      );
    // al-Falaq 2 has four words (from the second on), 3 has five (to the fourth).
    expect(words(2).map((w) => w.classList.contains('in-range'))).toEqual([
      false,
      true,
      true,
      true,
    ]);
    expect(words(3).map((w) => w.classList.contains('in-range'))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
    expect(document.querySelectorAll('.aya.in-range')).toHaveLength(0);
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
      '/mushaf/113?von=2&bis=3&wvon=2&wbis=4'
    );
  });
});
