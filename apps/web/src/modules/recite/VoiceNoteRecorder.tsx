import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { logger } from '@/services/logger';
import { useRecite } from './context';
import { RecorderError, type Recorder, type Take } from './recorder';
import { clock } from './RecordPanel';

const log = logger.child('voice-note');

/** The api keeps voice notes up to two minutes; a note stops itself just before. */
export const LONGEST_VOICE_NOTE_MS = 118_000;
/** The api's limit, which a note's measured length never passes. */
export const MAX_VOICE_NOTE_MS = 120_000;

/**
 * What the answer does with its voice note: keep the one it has (if any), have none, or
 * replace it with a new take.
 */
export type VoiceDraft =
  { kind: 'keep' } | { kind: 'none' } | { kind: 'new'; take: Take; url: string };

/**
 * The teacher's voice note while answering a recitation (spec T3, S4.2): record up to two
 * minutes, listen back, record again or remove. `saved` is where the note already kept with
 * the answer is heard; the parent sends the draft with the answer.
 */
export function VoiceNoteRecorder({
  saved,
  draft,
  onDraft,
}: {
  saved: string | null;
  draft: VoiceDraft;
  onDraft: (draft: VoiceDraft) => void;
}) {
  const { m } = useI18n();
  const { recorder: makeRecorder } = useRecite();
  const label = useId();
  const recorder = useRef<Recorder | null>(null);
  const [since, setSince] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);

  // Leaving the answer drops a note in progress and frees the microphone.
  useEffect(
    () => () => {
      recorder.current?.cancel();
      recorder.current = null;
    },
    []
  );

  const url = draft.kind === 'new' ? draft.url : null;
  useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url]);

  useEffect(() => {
    if (since === null) return;
    const tick = () => {
      const at = performance.now();
      setNow(at);
      if (at - since >= LONGEST_VOICE_NOTE_MS) void stop();
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
    // `stop` reads the current recorder through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since]);

  const start = async () => {
    const next = makeRecorder();
    recorder.current = next;
    setProblem(null);
    try {
      await next.start();
      if (recorder.current !== next) {
        next.cancel();
        return;
      }
      setSince(performance.now());
    } catch (error) {
      if (recorder.current === next) recorder.current = null;
      const reason = error instanceof RecorderError ? error.reason : 'failed';
      log.warn('voice note did not start', { reason });
      setProblem(reason === 'denied' ? m.recite.denied : m.recite.unsupported);
    }
  };

  async function stop() {
    const current = recorder.current;
    if (!current) return;
    recorder.current = null;
    setSince(null);
    try {
      const take = await current.stop();
      onDraft({
        kind: 'new',
        take: { ...take, durationMs: Math.min(take.durationMs, MAX_VOICE_NOTE_MS) },
        url: URL.createObjectURL(take.blob),
      });
    } catch (error) {
      log.warn('voice note failed', { error: String(error) });
      setProblem(m.recite.unsupported);
    }
  }

  const heard = draft.kind === 'new' ? draft.url : draft.kind === 'keep' ? saved : null;
  let body;
  if (since !== null) {
    body = (
      <>
        <p role="status" className="recording-now">
          <span className="record-dot" aria-hidden="true" />{' '}
          {m.recite.running(clock(Math.max(0, now - since)))}
        </p>
        <button
          className="btn btn-primary"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => void stop()}
        >
          {m.recite.stop}
        </button>
      </>
    );
  } else if (heard) {
    body = (
      <>
        <audio controls preload="metadata" src={heard} aria-labelledby={label} />
        <span className="row" style={{ gap: 8 }}>
          <button className="btn" type="button" onClick={() => void start()}>
            {m.recite.again}
          </button>
          <button
            className="btn btn-quiet"
            type="button"
            onClick={() => onDraft({ kind: 'none' })}
          >
            {m.recite.voiceRemove}
          </button>
        </span>
      </>
    );
  } else {
    body = (
      <button
        className="btn record-button"
        type="button"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => void start()}
      >
        <span className="record-dot" aria-hidden="true" /> {m.recite.voiceRecord}
      </button>
    );
  }
  return (
    <div className="stack" style={{ gap: 6 }} role="group" aria-labelledby={label}>
      <span id={label}>{m.recite.voiceNote}</span>
      {body}
      {problem && <p role="alert">{problem}</p>}
    </div>
  );
}
