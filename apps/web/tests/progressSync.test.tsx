import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Path } from '@/modules/path/Path';
import { Today } from '@/modules/today/Today';
import type { ReviewCard } from '@/review/leitner';
import { ProgressSync } from '@/review/ProgressSync';
import { ReviewProvider, useReview, type Review } from '@/review/ReviewProvider';
import { MemoryReviewStore, type ReviewState } from '@/review/store';
import { SYNC_DELAY_MS, useProgressSync } from '@/review/useProgressSync';
import { AuthClient, type Me } from '@/services/auth';
import { fakeApi, Providers } from './render';

const NOW = Date.UTC(2026, 9, 7, 12);
const ME: Me = {
  id: 'u-amina',
  email: 'amina@example.org',
  name: 'Amina',
  role: 'student',
} as Me;
const card = (prompt: string, updatedAt: number, box = 1): ReviewCard => ({
  id: `which-rule:${prompt}`,
  kind: 'which-rule',
  prompt,
  answer: 'ikhfa',
  box,
  due: updatedAt,
  lapses: 1,
  updatedAt,
});
const deckOf = (...cards: ReviewCard[]): ReviewState => ({
  cards: Object.fromEntries(cards.map((c) => [c.id, c])),
  bestTimes: {},
});

/** The account on the server: merges like the API does and records what was sent. */
function fakeAccount(stored: ReviewCard[] = [], times: Record<string, number> = {}) {
  const account = { cards: new Map(stored.map((c) => [c.id, c])), times: { ...times } };
  const sent: { cards: ReviewCard[]; bestTimes: Record<string, number> }[] = [];
  let offline = false;
  const fetchImpl = vi.fn(async (_path: RequestInfo | URL, init?: RequestInit) => {
    if (offline) throw new TypeError('Failed to fetch');
    const body = JSON.parse(String(init?.body)) as (typeof sent)[number];
    sent.push(body);
    for (const c of body.cards) {
      const other = account.cards.get(c.id);
      if (!other || c.updatedAt >= other.updatedAt) account.cards.set(c.id, c);
    }
    for (const [game, ms] of Object.entries(body.bestTimes)) {
      if (account.times[game] === undefined || ms < account.times[game]!)
        account.times[game] = ms;
    }
    return Response.json({
      cards: [...account.cards.values()],
      bestTimes: account.times,
    });
  }) as unknown as typeof fetch;
  return {
    client: new AuthClient(fetchImpl),
    sent,
    account,
    goOffline: (value: boolean) => (offline = value),
  };
}

/** The hook over a deck and owner held in the test, merged and claimed like the provider. */
function mountHook(
  initial: ReviewState,
  client: AuthClient,
  userId: string | null,
  initialOwner: string | null = null
) {
  let deck = initial;
  let owner = initialOwner;
  const replaced: ReviewState[] = [];
  // Unset while the first render runs: a change during it shows at the next render.
  const mounted: { hook?: { rerender(props: { userId: string | null }): void } } = {};
  const review = (): Pick<Review, 'deck' | 'receive' | 'claim' | 'owns'> => ({
    deck,
    receive: (incoming) => {
      const cards = { ...deck.cards };
      for (const [id, c] of Object.entries(incoming.cards))
        if (!cards[id] || c.updatedAt >= cards[id]!.updatedAt) cards[id] = c;
      deck = { cards, bestTimes: { ...deck.bestTimes, ...incoming.bestTimes } };
      mounted.hook?.rerender({ userId });
    },
    claim: (id) => {
      const drop = owner !== null && owner !== id;
      owner = id;
      if (drop) {
        deck = { cards: {}, bestTimes: {} };
        replaced.push(deck);
      }
      return drop;
    },
    owns: (id) => owner === id,
  });
  const hook = renderHook(({ userId }) => useProgressSync(client, review(), userId), {
    initialProps: { userId },
  });
  mounted.hook = hook;
  return {
    deck: () => deck,
    owner: () => owner,
    replaced,
    change: (next: ReviewState) => {
      deck = next;
      hook.rerender({ userId });
    },
    signIn: (id: string | null) => {
      userId = id;
      hook.rerender({ userId: id });
    },
    /** Another tab signs a different account in. */
    handOver: (id: string) => (owner = id),
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe('progress sync (ADR-0022)', () => {
  it('sends nothing for a guest', () => {
    const server = fakeAccount();
    const view = mountHook(deckOf(card('a', NOW)), server.client, null);
    expect(server.sent).toHaveLength(0);
    expect(view.owner()).toBeNull();
  });

  it("joins a guest's deck with the account at sign-in, and takes the account's cards in", async () => {
    const server = fakeAccount([card('from-phone', NOW - 1000)], { 'sort-28': 30_000 });
    const view = mountHook(deckOf(card('from-laptop', NOW)), server.client, null);
    view.signIn(ME.id);
    await waitFor(() => expect(Object.keys(view.deck().cards)).toHaveLength(2));
    expect(server.sent[0]!.cards.map((c) => c.prompt)).toEqual(['from-laptop']);
    expect(view.deck().bestTimes).toEqual({ 'sort-28': 30_000 });
    expect(view.owner()).toBe(ME.id);
    expect(server.account.cards.size).toBe(2);
  });

  it("drops another account's deck instead of sending it", async () => {
    const server = fakeAccount([card('aminas', NOW - 1000)]);
    const view = mountHook(deckOf(card('yusufs', NOW)), server.client, ME.id, 'u-yusuf');
    await waitFor(() =>
      expect(Object.keys(view.deck().cards)).toEqual(['which-rule:aminas'])
    );
    expect(view.replaced).toHaveLength(1);
    expect(server.sent[0]!.cards).toEqual([]);
    expect(server.account.cards.has('which-rule:yusufs')).toBe(false);
    expect(view.owner()).toBe(ME.id);
  });

  it('sends nothing once another tab has signed a different account in', async () => {
    vi.useFakeTimers({ now: NOW });
    const server = fakeAccount();
    const view = mountHook(deckOf(), server.client, ME.id);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(server.sent).toHaveLength(1);
    view.handOver('u-yusuf');
    view.change(deckOf(card('aminas', NOW)));
    window.dispatchEvent(new Event('online'));
    await act(() => vi.advanceTimersByTimeAsync(SYNC_DELAY_MS * 2));
    expect(server.sent).toHaveLength(1);
  });

  it('sends a change after a short pause, once for several answers', async () => {
    vi.useFakeTimers({ now: NOW });
    const server = fakeAccount();
    const view = mountHook(deckOf(), server.client, ME.id);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(server.sent).toHaveLength(1);
    view.change(deckOf(card('a', NOW)));
    await act(() => vi.advanceTimersByTimeAsync(SYNC_DELAY_MS / 2));
    view.change(deckOf(card('a', NOW), card('b', NOW)));
    await act(() => vi.advanceTimersByTimeAsync(SYNC_DELAY_MS - 1));
    expect(server.sent).toHaveLength(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(server.sent).toHaveLength(2);
    expect(server.sent[1]!.cards.map((c) => c.prompt)).toEqual(['a', 'b']);
    // The account's answer coming back is not sent again.
    await act(() => vi.advanceTimersByTimeAsync(SYNC_DELAY_MS * 3));
    expect(server.sent).toHaveLength(2);
  });

  it('sends what waits when the app is hidden, and fetches again when shown', async () => {
    vi.useFakeTimers({ now: NOW });
    const server = fakeAccount();
    const view = mountHook(deckOf(), server.client, ME.id);
    await act(() => vi.advanceTimersByTimeAsync(0));
    view.change(deckOf(card('a', NOW)));
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(server.sent).toHaveLength(2);
    // Hidden with nothing waiting: no request.
    document.dispatchEvent(new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(server.sent).toHaveLength(2);
    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(server.sent).toHaveLength(3);
    visibility.mockRestore();
  });

  it('waits offline and sends when the device is online again', async () => {
    const server = fakeAccount();
    server.goOffline(true);
    mountHook(deckOf(card('a', NOW)), server.client, ME.id);
    await act(async () => {});
    expect(server.sent).toHaveLength(0);
    server.goOffline(false);
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(server.sent).toHaveLength(1));
    expect(server.account.cards.has('which-rule:a')).toBe(true);
  });

  it("drops damaged cards from the account's answer", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        cards: [card('ok', NOW), { ...card('bad', NOW), box: 9 }, null],
        bestTimes: { 'sort-28': -1 },
      })
    ) as unknown as typeof fetch;
    const view = mountHook(deckOf(), new AuthClient(fetchImpl), ME.id);
    await waitFor(() =>
      expect(Object.keys(view.deck().cards)).toEqual(['which-rule:ok'])
    );
    expect(view.deck().bestTimes).toEqual({});
  });
});

describe('with the providers', () => {
  function Probe({ onReview }: { onReview: (review: Review) => void }) {
    onReview(useReview());
    return null;
  }

  it("drops an account's answer once the deck belongs to someone else", async () => {
    const store = new MemoryReviewStore(deckOf(card('yusufs', NOW)), 'u-yusuf');
    let review: Review | undefined;
    render(
      <Providers client={fakeApi({}).client}>
        <ReviewProvider store={store}>
          <Probe onReview={(r) => (review = r)} />
        </ReviewProvider>
      </Providers>
    );
    act(() => review!.receive(deckOf(card('aminas', NOW)), ME.id));
    expect(review!.cards.map((c) => c.prompt)).toEqual(['yusufs']);
    act(() => review!.receive(deckOf(card('more', NOW)), 'u-yusuf'));
    expect(review!.cards.map((c) => c.prompt).sort()).toEqual(['more', 'yusufs']);
  });

  it('keeps the signed-in deck in the store and on the account', async () => {
    const store = new MemoryReviewStore(deckOf(card('local', NOW)));
    const server = fakeAccount([card('remote', NOW - 1)]);
    const { client } = fakeApi({}, ME);
    // The session from fakeApi, the sync over the fake account.
    vi.spyOn(client, 'syncProgress').mockImplementation((deck) =>
      server.client.syncProgress(deck)
    );
    let review: Review | undefined;
    render(
      <Providers client={client}>
        <ReviewProvider store={store}>
          <ProgressSync />
          <Probe onReview={(r) => (review = r)} />
        </ReviewProvider>
      </Providers>
    );
    await waitFor(() => expect(review?.cards).toHaveLength(2));
    expect(Object.keys(store.load().cards).sort()).toEqual([
      'which-rule:local',
      'which-rule:remote',
    ]);
  });
});

describe('the hint for guests', () => {
  it.each([
    ['Today', '/', <Today key="today" />],
    ['the path', '/pfad', <Path key="path" />],
  ])('asks a guest on %s to sign in, and comes back there', async (_name, path, page) => {
    const { client } = fakeApi({});
    render(
      <Providers client={client}>
        <ReviewProvider store={new MemoryReviewStore()}>
          <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    const link = await screen.findByRole('link', { name: /Sign in to keep it/ });
    expect(link.getAttribute('href')).toBe(
      `/anmelden?zurueck=${encodeURIComponent(path)}`
    );
    expect(screen.getByText(/so your progress is saved/)).toBeTruthy();
  });

  it('is not shown to someone signed in', async () => {
    const { client } = fakeApi({}, ME);
    render(
      <Providers client={client}>
        <ReviewProvider store={new MemoryReviewStore()}>
          <MemoryRouter>
            <Path />
          </MemoryRouter>
        </ReviewProvider>
      </Providers>
    );
    await act(async () => {});
    expect(screen.queryByText('Keep your progress')).toBeNull();
  });
});
