import { describe, expect, it, vi } from 'vitest';
import {
  HttpSpeechChecker,
  parseAnswer,
  SpeechCheckError,
  type Hint,
  type SpeechChecker,
  type SpeechInput,
} from '../src/speech/checker.js';
import type {
  ClaimedRecording,
  ClaimRequest,
  SpeechRepository,
} from '../src/speech/repository.js';
import {
  SPEECH_BATCH,
  SPEECH_LEASE_MS,
  SPEECH_MAX_ATTEMPTS,
  SpeechCheckService,
} from '../src/speech/service.js';

// Al-Ikhlāṣ: āya 1 has four words, āya 4 has five.
const RANGE = { sura: 112, from: 1, to: 4 };
const INPUT: SpeechInput = {
  range: RANGE,
  mime: 'audio/webm',
  audio: Buffer.from('fake opus bytes'),
};
const SETTINGS = { url: 'http://srv-captain--arda-speech:8000', token: 't'.repeat(40) };
const ANSWER = {
  model: 'quran-muallim-1',
  words: [
    { aya: 4, word: 5, topic: 'qalqala', verdict: 'check' },
    { aya: 1, word: 2, topic: 'makhraj', verdict: 'good' },
  ],
};
const quiet = { info: () => {}, warn: () => {}, error: () => {} };

describe("the speech service's answer (ADR-0013)", () => {
  it('becomes hints in reading order', () => {
    expect(parseAnswer(ANSWER, RANGE)).toEqual({
      model: 'quran-muallim-1',
      hints: [
        { aya: 1, word: 2, topic: 'makhraj', verdict: 'good' },
        { aya: 4, word: 5, topic: 'qalqala', verdict: 'check' },
      ],
    });
    expect(parseAnswer({ model: 'm', words: [] }, RANGE)).toEqual({
      model: 'm',
      hints: [],
    });
  });

  it.each([
    ['no model', { words: [] }],
    [
      'an unknown topic',
      { model: 'm', words: [{ ...ANSWER.words[0], topic: 'ishmam' }] },
    ],
    [
      'a verdict of its own',
      { model: 'm', words: [{ ...ANSWER.words[0], verdict: 'wrong' }] },
    ],
    ['extra fields', { model: 'm', words: [{ ...ANSWER.words[0], student: 'x' }] }],
    ['not an object', 'ok'],
  ])('is refused with %s', (_name, body) => {
    expect(parseAnswer(body, RANGE)).toEqual({ reason: 'answer_shape' });
  });

  it('is refused when a hint is no word of the recited āyāt', () => {
    const at = (aya: number, word: number) =>
      parseAnswer({ model: 'm', words: [{ ...ANSWER.words[0], aya, word }] }, RANGE);
    expect(at(4, 6)).toEqual({ reason: 'answer_place' });
    expect(at(5, 1)).toEqual({ reason: 'answer_place' });
    expect(parseAnswer(ANSWER, { sura: 112, from: 1, to: 3 })).toEqual({
      reason: 'answer_place',
    });
  });

  it('is refused when a word and topic come twice', () => {
    const twice = { model: 'm', words: [ANSWER.words[0], ANSWER.words[0]] };
    expect(parseAnswer(twice, RANGE)).toEqual({ reason: 'answer_duplicate' });
  });
});

describe('asking arda-speech', () => {
  const checker = (fetchImpl: typeof fetch, timeoutMs?: number) =>
    new HttpSpeechChecker(SETTINGS, fetchImpl, timeoutMs);
  const reasonOf = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => null,
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(SpeechCheckError);
    return (error as SpeechCheckError).reason;
  };

  it('sends the sound, the range and the token, and nothing about the student', async () => {
    const fetchImpl = vi.fn(async () => Response.json(ANSWER));
    const result = await checker(fetchImpl as typeof fetch).check(INPUT);
    expect(result.hints).toHaveLength(2);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${SETTINGS.url}/v1/check?sura=112&from=1&to=4&riwaya=hafs`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      authorization: `Bearer ${SETTINGS.token}`,
      'content-type': 'audio/webm',
    });
    expect(init.body).toBe(INPUT.audio);
    expect(init.redirect).toBe('error');
  });

  it('names why a check failed', async () => {
    const failing = (impl: () => Promise<Response>) =>
      reasonOf(checker(impl as typeof fetch).check(INPUT));
    expect(await failing(async () => new Response('busy', { status: 503 }))).toBe(
      'http_503'
    );
    expect(await failing(async () => new Response('<html>'))).toBe('answer_json');
    expect(await failing(async () => Response.json({ model: 'm' }))).toBe('answer_shape');
    expect(
      await failing(async () => {
        throw new TypeError('fetch failed');
      })
    ).toBe('unreachable');
  });

  it('gives up after its timeout', async () => {
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
      })) as typeof fetch;
    expect(await reasonOf(checker(hanging, 5).check(INPUT))).toBe('timeout');
  });

  it('lets an unexpected error through', async () => {
    const broken = (async () => {
      throw new RangeError('bug');
    }) as typeof fetch;
    await expect(checker(broken).check(INPUT)).rejects.toBeInstanceOf(RangeError);
  });
});

class MemorySpeechRepository implements SpeechRepository {
  waiting: ClaimedRecording[] = [];
  requests: ClaimRequest[] = [];
  kept = new Map<string, { model: string; hints: readonly Hint[] }>();
  failures = new Map<string, string>();

  async claim(request: ClaimRequest): Promise<ClaimedRecording[]> {
    this.requests.push(request);
    return this.waiting.splice(0, request.limit);
  }
  async done(recordingId: string, model: string, hints: readonly Hint[]): Promise<void> {
    this.kept.set(recordingId, { model, hints });
  }
  async failed(recordingId: string, reason: string): Promise<void> {
    this.failures.set(recordingId, reason);
  }
}

describe('a turn of the speech check', () => {
  const recording = (id: string): ClaimedRecording => ({ id, ...INPUT });
  const HINTS: Hint[] = [{ aya: 1, word: 2, topic: 'makhraj', verdict: 'check' }];

  it('takes one recording, asks the service and keeps its hints', async () => {
    const repo = new MemorySpeechRepository();
    repo.waiting = [recording('a'), recording('b')];
    const checker: SpeechChecker = {
      check: vi.fn(async () => ({ model: 'm1', hints: HINTS })),
    };
    const service = new SpeechCheckService({ checker, repo, log: quiet });
    expect(await service.runOnce()).toEqual({ checked: 1, failed: 0 });
    expect(repo.requests).toEqual([
      { limit: SPEECH_BATCH, maxAttempts: SPEECH_MAX_ATTEMPTS, leaseMs: SPEECH_LEASE_MS },
    ]);
    expect(repo.kept.get('a')).toEqual({ model: 'm1', hints: HINTS });
    expect(repo.waiting.map((r) => r.id)).toEqual(['b']);
  });

  it('notes a failed check with its reason and goes on', async () => {
    const repo = new MemorySpeechRepository();
    repo.waiting = [recording('a')];
    const warned: object[] = [];
    const service = new SpeechCheckService({
      checker: {
        check: async () => {
          throw new SpeechCheckError('http_503');
        },
      },
      repo,
      log: { ...quiet, warn: (obj) => warned.push(obj) },
    });
    expect(await service.runOnce()).toEqual({ checked: 0, failed: 1 });
    expect(repo.failures.get('a')).toBe('http_503');
    expect(repo.kept.size).toBe(0);
    // The log names the recording and the reason, never the sound.
    expect(warned).toEqual([{ recordingId: 'a', reason: 'http_503' }]);
  });

  it('does nothing when nothing waits', async () => {
    const check = vi.fn();
    const service = new SpeechCheckService({
      checker: { check },
      repo: new MemorySpeechRepository(),
      log: quiet,
    });
    expect(await service.runOnce()).toEqual({ checked: 0, failed: 0 });
    expect(check).not.toHaveBeenCalled();
  });

  it('polls without starting a second turn while one runs, and stops', async () => {
    vi.useFakeTimers();
    try {
      const repo = new MemorySpeechRepository();
      let release: () => void = () => {};
      const claim = vi.spyOn(repo, 'claim').mockImplementation(
        () =>
          new Promise<ClaimedRecording[]>((resolve) => {
            release = () => resolve([]);
          })
      );
      const service = new SpeechCheckService({
        checker: { check: vi.fn() },
        repo,
        log: quiet,
      });
      const stop = service.start(1000);
      await vi.advanceTimersByTimeAsync(3500);
      expect(claim).toHaveBeenCalledTimes(1);
      release();
      await vi.advanceTimersByTimeAsync(1000);
      expect(claim).toHaveBeenCalledTimes(2);
      release();
      stop();
      await vi.advanceTimersByTimeAsync(5000);
      expect(claim).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
