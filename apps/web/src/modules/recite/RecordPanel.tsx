import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { useHalaqat } from '@/modules/halaqa/useHalaqat';
import type { RecitedRange } from '@/services/auth';
import { logger } from '@/services/logger';
import { useSession } from '@/state/session';
import { giveConsent, useConsent } from './consent';
import { useRecite } from './context';
import { enqueue } from './outbox';
import { RecorderError, type Recorder, type Take } from './recorder';

const log = logger.child('record');

/** A take stops itself just before the api's limit (ten minutes). */
export const LONGEST_TAKE_MS = 595_000;

type Stage =
  | { name: 'ready' }
  | { name: 'recording'; since: number }
  | { name: 'recorded'; take: Take; url: string }
  | { name: 'sending'; take: Take; url: string }
  | { name: 'done'; message: string }
  | { name: 'failed'; message: string };

/** Minutes and seconds, `2:05`. */
export const clock = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * Recording a recitation and sending it to the sheikh (spec F7, S4.1): consent once, record,
 * listen back, record again or send. A take waits in the outbox when the device is offline.
 */
export function RecordPanel({
  range,
  assignmentId = null,
  halaqaId,
  onClose,
}: {
  range: RecitedRange;
  /** The assignment this take answers, with the ḥalaqa that gave it. */
  assignmentId?: string | null;
  halaqaId?: string | null;
  onClose: () => void;
}) {
  const { m } = useI18n();
  const { me, client } = useSession();
  const { recorder: makeRecorder, outbox } = useRecite();
  const consent = useConsent();
  const { halaqat } = useHalaqat();
  const mine = useMemo(
    () => (halaqat ?? []).filter((h) => h.role === 'student' && h.status === 'active'),
    [halaqat]
  );
  const [to, setTo] = useState<string | null>(null);
  const target = to ?? (mine.find((h) => h.id === halaqaId) ?? mine[0])?.id ?? null;
  const [stage, setStage] = useState<Stage>({ name: 'ready' });
  const [now, setNow] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Closing the panel drops a take in progress and frees the microphone.
  useEffect(() => () => recorder.current?.cancel(), []);

  const url = stage.name === 'recorded' || stage.name === 'sending' ? stage.url : null;
  useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url]);

  const since = stage.name === 'recording' ? stage.since : null;
  useEffect(() => {
    if (since === null) return;
    const tick = () => {
      const at = performance.now();
      setNow(at);
      if (at - since >= LONGEST_TAKE_MS) void stop();
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
    // `stop` reads the current recorder through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since]);

  const start = async () => {
    const next = makeRecorder();
    try {
      await next.start();
      recorder.current = next;
      setStage({ name: 'recording', since: performance.now() });
    } catch (error) {
      const reason = error instanceof RecorderError ? error.reason : 'failed';
      log.warn('recording did not start', { reason });
      setStage({
        name: 'failed',
        message: reason === 'denied' ? m.recite.denied : m.recite.unsupported,
      });
    }
  };

  async function stop() {
    const current = recorder.current;
    if (!current) return;
    recorder.current = null;
    try {
      const take = await current.stop();
      setStage({ name: 'recorded', take, url: URL.createObjectURL(take.blob) });
    } catch (error) {
      log.warn('recording failed', { error: String(error) });
      setStage({ name: 'failed', message: m.recite.unsupported });
    }
  }

  const send = async (take: Take, takeUrl: string) => {
    if (!target) return;
    setStage({ name: 'sending', take, url: takeUrl });
    const clientId = crypto.randomUUID();
    try {
      const outcome = await enqueue(client, outbox, {
        clientId,
        halaqaId: target,
        // Only the ḥalaqa that gave the assignment knows it.
        assignmentId: target === halaqaId ? assignmentId : null,
        range,
        mime: take.mime,
        durationMs: take.durationMs,
        blob: take.blob,
        createdAt: new Date().toISOString(),
      });
      const refused = outcome.refused.find((r) => r.clientId === clientId);
      setStage(
        refused
          ? {
              name: 'failed',
              message: errorMessage(m, { status: 400, code: refused.code }),
            }
          : {
              name: 'done',
              message: outcome.sent.includes(clientId) ? m.recite.sent : m.recite.queued,
            }
      );
    } catch (error) {
      log.warn('take not kept', { error: String(error) });
      setStage({ name: 'failed', message: m.errors.generic(0) });
    }
  };

  const title = m.recite.title(range.sura, range.from, range.to);
  let body;
  if (!me) {
    body = (
      <Link
        className="btn btn-primary"
        to="/anmelden"
        style={{ alignSelf: 'flex-start' }}
      >
        {m.today.signIn}
      </Link>
    );
  } else if (halaqat && mine.length === 0) {
    body = (
      <>
        <p>{m.recite.noHalaqa}</p>
        <Link className="btn" to="/sheikh" style={{ alignSelf: 'flex-start' }}>
          {m.halaqa.mine}
        </Link>
      </>
    );
  } else if (consent !== 'given') {
    body = (
      <>
        <h3 className="h-small">{m.recite.consentTitle}</h3>
        <p>{m.recite.consentText}</p>
        <button
          className="btn btn-primary"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          onClick={giveConsent}
        >
          {m.recite.consentAgree}
        </button>
      </>
    );
  } else {
    switch (stage.name) {
      case 'ready':
        body = (
          <button
            className="btn btn-primary record-button"
            type="button"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => void start()}
          >
            <span className="record-dot" aria-hidden="true" /> {m.recite.start}
          </button>
        );
        break;
      case 'recording':
        body = (
          <>
            <p role="status" className="recording-now">
              <span className="record-dot" aria-hidden="true" />{' '}
              {m.recite.running(clock(Math.max(0, now - stage.since)))}
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
        break;
      case 'recorded':
      case 'sending':
        body = (
          <>
            <audio controls src={stage.url} preload="metadata" />
            {mine.length > 1 && (
              <label className="stack" style={{ gap: 4 }}>
                <span>{m.recite.sendTo}</span>
                <select
                  value={target ?? ''}
                  onChange={(event) => setTo(event.target.value)}
                  disabled={stage.name === 'sending'}
                >
                  {mine.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.teacherName ? `${h.name} · ${h.teacherName}` : h.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="row" style={{ gap: 8 }}>
              <button
                className="btn btn-primary"
                type="button"
                disabled={stage.name === 'sending' || !target}
                onClick={() => void send(stage.take, stage.url)}
              >
                {m.recite.send}
              </button>
              <button
                className="btn"
                type="button"
                disabled={stage.name === 'sending'}
                onClick={() => setStage({ name: 'ready' })}
              >
                {m.recite.again}
              </button>
            </span>
          </>
        );
        break;
      case 'done':
        body = <p role="status">{stage.message}</p>;
        break;
      case 'failed':
        body = (
          <>
            <p role="alert">{stage.message}</p>
            <button
              className="btn"
              type="button"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setStage({ name: 'ready' })}
            >
              {m.recite.again}
            </button>
          </>
        );
        break;
    }
  }

  return (
    <div
      className="word-sheet record-panel card stack"
      role="dialog"
      aria-labelledby="record-title"
    >
      <h2 className="h-small" id="record-title">
        {title}
      </h2>
      {body}
      <button
        ref={first}
        className="btn btn-quiet"
        type="button"
        style={{ alignSelf: 'flex-start' }}
        onClick={onClose}
      >
        {m.recite.close}
      </button>
    </div>
  );
}
