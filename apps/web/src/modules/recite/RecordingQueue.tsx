import { useCallback, useEffect, useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { RemarkId } from '@/i18n/messages';
import { formatMoment } from '@/modules/assignments/format';
import type { ApiResult } from '@/services/api/request';
import type { QueuedRecitation, Verdict } from '@/services/auth';
import { useSession } from '@/state/session';
import { REMARKS } from './remarks';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

/**
 * "Zum Abhören" on the ḥalaqa page (spec F7, S4.2): what the students sent, those waiting
 * first and oldest first; the teacher listens and answers with a verdict, a quick remark in
 * the student's language and/or their own words.
 */
export function RecordingQueue({ halaqaId }: { halaqaId: string }) {
  const { m } = useI18n();
  const { client } = useSession();
  const [list, setList] = useState<QueuedRecitation[] | null>(null);
  const [more, setMore] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const load = useCallback(
    async (before?: string) => {
      const result = await client.recitationQueue(halaqaId, before);
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setFailure(null);
      setMore(result.value.more);
      setList((current) =>
        before
          ? [...(current ?? []), ...result.value.recordings]
          : result.value.recordings
      );
    },
    [client, halaqaId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const answered = (id: string, review: QueuedRecitation['review']) =>
    setList(
      (current) => current?.map((r) => (r.id === id ? { ...r, review } : r)) ?? null
    );

  const waiting = list?.filter((r) => !r.review) ?? [];
  const done = list?.filter((r) => r.review) ?? [];
  return (
    <section className="card stack" aria-labelledby="queue-title">
      <h2 className="h-small" id="queue-title">
        {m.recite.queue}
        {waiting.length > 0 && (
          <>
            {' '}
            <span className="chip">{waiting.length}</span>
          </>
        )}
      </h2>
      {failure && <p role="alert">{errorMessage(m, failure)}</p>}
      {list && waiting.length === 0 && <p className="muted">{m.recite.queueEmpty}</p>}
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 16 }}>
        {waiting.map((r) => (
          <QueueItem key={r.id} halaqaId={halaqaId} recording={r} onAnswered={answered} />
        ))}
      </ul>
      {done.length > 0 && (
        <>
          <h3 className="h-small">{m.recite.answered}</h3>
          <ul
            className="stack"
            style={{ margin: 0, padding: 0, listStyle: 'none', gap: 16 }}
          >
            {done.map((r) => (
              <QueueItem
                key={r.id}
                halaqaId={halaqaId}
                recording={r}
                onAnswered={answered}
              />
            ))}
          </ul>
        </>
      )}
      {more && list && (
        <button
          className="btn"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => void load(list[list.length - 1]?.id)}
        >
          {m.recite.older}
        </button>
      )}
    </section>
  );
}

function QueueItem({
  halaqaId,
  recording,
  onAnswered,
}: {
  halaqaId: string;
  recording: QueuedRecitation;
  onAnswered: (id: string, review: QueuedRecitation['review']) => void;
}) {
  const { m, language } = useI18n();
  const { client, me } = useSession();
  const review = recording.review;
  const [editing, setEditing] = useState(!review);
  const [verdict, setVerdict] = useState<Verdict | null>(review?.verdict ?? null);
  const [remark, setRemark] = useState<RemarkId | null>(review?.remark ?? null);
  const [note, setNote] = useState(review?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const who = recording.studentName ?? recording.studentEmail ?? '';
  const { sura, from, to } = recording.range;

  const answer = async () => {
    if (!verdict) return;
    setBusy(true);
    const input = { verdict, remark, note: note.trim() || null };
    try {
      const result = await client.reviewRecitation(halaqaId, recording.id, input);
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setFailure(null);
      setEditing(false);
      onAnswered(recording.id, {
        ...input,
        reviewerName: me?.name ?? null,
        reviewedAt: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="stack recording-row" style={{ gap: 8 }}>
      <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <strong>{who}</strong>
        <span className="muted">
          {formatMoment(recording.createdAt, language)} ·{' '}
          <span dir="ltr">{m.recite.seconds(recording.durationMs)}</span>
        </span>
      </span>
      <span>{m.recite.range(sura, from, to)}</span>
      <audio
        controls
        preload="none"
        src={client.queuedRecitationAudio(halaqaId, recording.id)}
        aria-label={`${who} · ${m.recite.range(sura, from, to)}`}
      />
      {!editing && review ? (
        <span className="row" style={{ gap: 8 }}>
          <span className="chip" data-verdict={review.verdict}>
            {m.recite.verdicts[review.verdict]}
          </span>
          {review.remark && <span className="muted">{m.remarks[review.remark]}</span>}
          {review.note && <span>{review.note}</span>}
          <button
            className="btn btn-quiet"
            type="button"
            onClick={() => setEditing(true)}
          >
            {m.recite.change}
          </button>
        </span>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <span className="row" style={{ gap: 8 }} role="group">
            <button
              type="button"
              className={verdict === 'good' ? 'btn btn-teal' : 'btn'}
              aria-pressed={verdict === 'good'}
              onClick={() => setVerdict('good')}
            >
              {m.recite.good}
            </button>
            <button
              type="button"
              className={verdict === 'again' ? 'btn btn-primary' : 'btn'}
              aria-pressed={verdict === 'again'}
              onClick={() => setVerdict('again')}
            >
              {m.recite.againVerdict}
            </button>
          </span>
          <label className="stack" style={{ gap: 4 }}>
            <span>{m.recite.remark}</span>
            <select
              value={remark ?? ''}
              onChange={(event) =>
                setRemark((event.target.value || null) as RemarkId | null)
              }
            >
              <option value="">{m.recite.noRemark}</option>
              {REMARKS.map((id) => (
                <option key={id} value={id}>
                  {m.remarks[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span>{m.recite.note}</span>
            <textarea
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button
            className="btn btn-primary"
            type="button"
            style={{ alignSelf: 'flex-start' }}
            disabled={!verdict || busy}
            onClick={() => void answer()}
          >
            {m.recite.answer}
          </button>
        </div>
      )}
      {failure && <p role="alert">{errorMessage(m, failure)}</p>}
    </li>
  );
}
