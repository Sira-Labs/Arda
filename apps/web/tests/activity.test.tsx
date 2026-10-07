import type { ActivityEvent } from '@arda/engagement';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressCard } from '@/modules/today/ProgressCard';
import { ProgressSync } from '@/review/ProgressSync';
import { ReviewProvider, useReview, type Review } from '@/review/ReviewProvider';
import {
  MemoryReviewStore,
  mergeStates,
  parseState,
  sameState,
  unsentEvents,
  type LoggedEvent,
  type ReviewState,
} from '@/review/store';
import { EVENTS_PER_REQUEST, SYNC_DELAY_MS } from '@/review/useProgressSync';
import type { Me, ProgressPayload } from '@/services/auth';
import { fakeApi, Providers } from './render';

const NOW = Date.UTC(2026, 9, 7, 12);
const DAY = 86_400_000;
const ME = {
  id: 'u-amina',
  email: 'a@example.org',
  name: 'Amina',
  role: 'student',
} as Me;
let n = 0;
const event = (input: Partial<LoggedEvent> = {}): LoggedEvent => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  kind: 'which-rule',
  ref: '',
  at: NOW - 60_000,
  right: 8,
  total: 10,
  ...input,
});
const withLog = (...events: LoggedEvent[]): ReviewState => ({
  cards: {},
  bestTimes: {},
  activity: Object.fromEntries(events.map((e) => [e.id, e])),
});

describe('the activity log in the store (ADR-0023)', () => {
  it('merges two logs as their union, the numbered copy winning', () => {
    const a = event();
    const b = event();
    const numbered = { ...a, seq: 7 };
    const merged = mergeStates(withLog(a, b), { ...withLog(numbered), cursor: 7 });
    expect(merged.activity).toEqual({ [a.id]: numbered, [b.id]: b });
    expect(merged.cursor).toBe(7);
    // The device's unnumbered copy never replaces the account's.
    expect(mergeStates(withLog(numbered), withLog(a)).activity![a.id]).toEqual(numbered);
  });

  it('knows what the account has not confirmed, oldest first', () => {
    const late = event({ at: NOW });
    const early = event({ at: NOW - DAY });
    const sent = event({ seq: 3 });
    expect(unsentEvents(withLog(late, sent, early)).map((e) => e.id)).toEqual([
      early.id,
      late.id,
    ]);
  });

  it('drops damaged events and keeps a deck saved before the log existed', () => {
    const ok = event();
    const parsed = parseState({
      cards: {},
      bestTimes: {},
      activity: {
        [ok.id]: ok,
        x: { ...event(), id: 'x' },
        [event().id]: { ...event(), right: 99 },
      },
      cursor: 4,
    });
    expect(parsed).toEqual({ ...withLog(ok), cursor: 4 });
    expect(parseState({ cards: {}, bestTimes: {} })).toEqual({
      cards: {},
      bestTimes: {},
    });
  });

  it('tells a log that gained a number from the same log', () => {
    const a = event();
    expect(sameState(withLog(a), withLog({ ...a }))).toBe(true);
    expect(sameState(withLog(a), withLog({ ...a, seq: 1 }))).toBe(false);
    expect(sameState(withLog(a), { ...withLog(a), cursor: 1 })).toBe(false);
  });
});

/** The API's log: numbers events once, answers what came after `since`, `page` at a time. */
function fakeServer(page = 1000) {
  const log: (ActivityEvent & { seq: number })[] = [];
  const requests: ProgressPayload[] = [];
  let offline = false;
  const sync = vi.fn(async (deck: ProgressPayload) => {
    if (offline) return { ok: false as const, status: 0, code: 'offline' };
    requests.push(structuredClone(deck));
    const sent = (deck.events ?? []) as ActivityEvent[];
    for (const e of sent) {
      if (!log.some((l) => l.id === e.id)) log.push({ ...e, seq: log.length + 1 });
    }
    const ids = new Set(sent.map((e) => e.id));
    const after = log.filter((e) => e.seq > (deck.since ?? 0) || ids.has(e.id));
    return {
      ok: true as const,
      value: {
        cards: [],
        bestTimes: {},
        events: after.slice(0, page),
        more: after.length > page,
      },
    };
  });
  return { log, requests, sync, goOffline: (value: boolean) => (offline = value) };
}

function Probe({ onReview }: { onReview: (review: Review) => void }) {
  onReview(useReview());
  return null;
}

/** The app's providers, signed in as Amina, the sync going to `server`. */
function mount(server: ReturnType<typeof fakeServer>, store = new MemoryReviewStore()) {
  const { client } = fakeApi({}, ME);
  vi.spyOn(client, 'syncProgress').mockImplementation((deck) => server.sync(deck));
  const seen: { review?: Review } = {};
  render(
    <Providers client={client}>
      <ReviewProvider store={store} now={() => NOW}>
        <ProgressSync />
        <Probe onReview={(r) => (seen.review = r)} />
      </ReviewProvider>
    </Providers>
  );
  return { store, review: () => seen.review! };
}

describe('syncing the log (ADR-0023)', () => {
  afterEach(() => vi.useRealTimers());

  it("sends a guest's events at sign-in and takes their numbers", async () => {
    const server = fakeServer();
    const guest = event();
    const { store } = mount(server, new MemoryReviewStore(withLog(guest)));
    await waitFor(() => expect(store.load().activity![guest.id]!.seq).toBe(1));
    expect(server.requests[0]).toMatchObject({ since: 0, events: [guest] });
    expect(store.load().cursor).toBe(1);
  });

  it('sends a new round after a pause, then only asks for what came after', async () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
    const server = fakeServer();
    const { store, review } = mount(server);
    await waitFor(() => expect(server.requests).toHaveLength(1));
    // Another device practised meanwhile.
    server.log.push({ ...event(), seq: 1 });
    act(() => {
      review().logActivity({ kind: 'lab-quiz', ref: 'sin', right: 9, total: 10 });
    });
    await act(() => vi.advanceTimersByTimeAsync(SYNC_DELAY_MS));
    await waitFor(() => expect(server.requests).toHaveLength(2));
    expect(server.requests[1]!.events).toEqual([
      expect.objectContaining({ kind: 'lab-quiz', ref: 'sin', right: 9 }),
    ]);
    await waitFor(() => expect(store.load().cursor).toBe(2));
    expect(Object.keys(store.load().activity!)).toHaveLength(2);
    // Nothing new: the account's own answer is not sent back.
    await act(() => vi.advanceTimersByTimeAsync(SYNC_DELAY_MS * 3));
    expect(server.requests).toHaveLength(2);
  });

  it('fetches a long log page by page, at once', async () => {
    const server = fakeServer(2);
    for (let i = 1; i <= 5; i++) server.log.push({ ...event(), seq: i });
    const { store } = mount(server);
    await waitFor(() => expect(store.load().cursor).toBe(5));
    expect(server.requests.map((r) => r.since)).toEqual([0, 2, 4]);
    expect(Object.keys(store.load().activity!)).toHaveLength(5);
  });

  it('sends a long backlog in turns', async () => {
    const server = fakeServer();
    const backlog = Array.from({ length: EVENTS_PER_REQUEST + 1 }, (_, i) =>
      event({ at: NOW - DAY + i })
    );
    const { store } = mount(server, new MemoryReviewStore(withLog(...backlog)));
    await waitFor(() => expect(server.log).toHaveLength(EVENTS_PER_REQUEST + 1));
    expect(server.requests.map((r) => r.events!.length)).toEqual([EVENTS_PER_REQUEST, 1]);
    await waitFor(() => expect(unsentEvents(store.load())).toEqual([]));
  });
});

describe('"Dein Fortschritt" on Today', () => {
  beforeEach(() => localStorage.setItem('arda.language', 'de'));

  function renderCard(...events: LoggedEvent[]) {
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <ReviewProvider store={new MemoryReviewStore(withLog(...events))}>
          <MemoryRouter>
            <ProgressCard now={() => NOW} />
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
  }

  it('invites a first practice before anything was done', () => {
    renderCard();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Übe heute – dann beginnt deine Serie.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows the level, XP of today, the streak and its shields', () => {
    // Eight days in a row with a perfect round each (30 XP): 240 XP, level 3, one shield.
    const days = Array.from({ length: 8 }, (_, i) =>
      event({ at: NOW - (7 - i) * DAY, right: 10, total: 10 })
    );
    renderCard(...days);
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText(/240 XP/)).toBeInTheDocument();
    expect(screen.getByText('heute +30 XP')).toBeInTheDocument();
    expect(screen.getByText(/8 Tage in Folge/)).toBeInTheDocument();
    expect(screen.getByText('Heute schon geübt.')).toBeInTheDocument();
    expect(screen.getByText('1 Schutzschild')).toBeInTheDocument();
  });

  it('keeps a streak standing until today is over', () => {
    renderCard(event({ at: NOW - DAY }), event({ at: NOW - 2 * DAY }));
    expect(screen.getByText(/2 Tage in Folge/)).toBeInTheDocument();
    expect(
      screen.getByText('Übe heute, damit deine Serie weitergeht.')
    ).toBeInTheDocument();
  });
});
