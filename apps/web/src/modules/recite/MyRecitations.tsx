import { useCallback, useEffect, useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { formatMoment } from '@/modules/assignments/format';
import type { ApiResult } from '@/services/api/request';
import type { OwnRecitation } from '@/services/auth';
import { useSession } from '@/state/session';
import { useOutboxWaiting } from './outbox';
import { RecitedWords } from './RecitedWords';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

/** How many recitations Today lists. */
const SHOWN = 5;

/**
 * "Deine Rezitationen" on Today (spec F7): what the student sent, whether the sheikh has
 * answered and what he said, in writing or aloud, to hear again or delete; and how many takes still wait for a
 * connection. Nothing is shown before the first recitation.
 */
export function MyRecitations() {
  const { m, language } = useI18n();
  const { me, client } = useSession();
  const waiting = useOutboxWaiting();
  const [list, setList] = useState<OwnRecitation[] | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await client.myRecitations();
    if (result.ok) {
      setList(result.value.recordings);
      setFailure(null);
    } else {
      setFailure(result);
    }
  }, [client]);

  useEffect(() => {
    if (me) void load();
    else setList(null);
    // A sent outbox take shows up here.
  }, [me, load, waiting]);

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const result = await client.deleteRecitation(id);
      if (result.ok) setList((current) => current?.filter((r) => r.id !== id) ?? null);
      else setFailure(result);
    } finally {
      setBusy(false);
    }
  };

  if (!me || (!list?.length && waiting === 0 && !failure)) return null;
  return (
    <section className="card stack" aria-labelledby="my-recitations">
      <h2 className="h-small" id="my-recitations">
        {m.recite.mine}
      </h2>
      {waiting > 0 && (
        <p className="muted" role="status">
          {m.recite.pending(waiting)}
        </p>
      )}
      {failure && <p role="alert">{errorMessage(m, failure)}</p>}
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 16 }}>
        {(list ?? []).slice(0, SHOWN).map((r) => {
          const { sura, from, to } = r.range;
          return (
            <li key={r.id} className="stack recording-row" style={{ gap: 6 }}>
              <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <strong>{m.recite.range(sura, from, to)}</strong>
                {r.review ? (
                  <span className="chip" data-verdict={r.review.verdict}>
                    {m.recite.verdicts[r.review.verdict]}
                  </span>
                ) : (
                  <span className="muted">{m.recite.waiting}</span>
                )}
              </span>
              <span className="muted">
                {formatMoment(r.createdAt, language)} · {r.halaqaName}
              </span>
              {r.review &&
                (r.review.remark ||
                  r.review.note ||
                  r.review.marks.length > 0 ||
                  r.review.voiceNote) && (
                  <div className="stack recitation-answer" style={{ gap: 4 }}>
                    <span className="muted">{m.recite.from(r.review.reviewerName)}</span>
                    {r.review.remark && <span>{m.remarks[r.review.remark]}</span>}
                    {/* The sheikh's own words, in whatever language he wrote them. */}
                    {r.review.note && <span dir="auto">{r.review.note}</span>}
                    {r.review.marks.length > 0 && (
                      <>
                        <span>{m.recite.marksCount(r.review.marks.length)}</span>
                        <RecitedWords range={r.range} marks={r.review.marks} />
                      </>
                    )}
                    {r.review.voiceNote && (
                      <>
                        <span>{m.recite.voiceFrom(r.review.reviewerName)}</span>
                        <audio
                          key={r.review.reviewedAt}
                          controls
                          preload="none"
                          src={client.ownVoiceNote(r.id)}
                          aria-label={m.recite.voiceFrom(r.review.reviewerName)}
                        />
                      </>
                    )}
                  </div>
                )}
              <audio
                controls
                preload="none"
                src={client.ownRecitationAudio(r.id)}
                aria-label={m.recite.range(sura, from, to)}
              />
              <button
                className="btn btn-quiet"
                type="button"
                style={{ alignSelf: 'flex-start' }}
                disabled={busy}
                onClick={() => void remove(r.id)}
              >
                {m.recite.delete}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
