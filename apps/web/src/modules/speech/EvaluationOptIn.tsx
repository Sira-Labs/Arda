import { useEffect, useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { formatDay } from '@/modules/assignments/format';
import type { SpeechEvaluation } from '@/services/auth';
import { useSession } from '@/state/session';

/**
 * "Automatische Prüfung messen" on the account page (S6.2; ADR-0012, ADR-0013): the student's
 * own, revocable opt-in to let their recitations count when the speech check is measured
 * against the teacher. Separate from the consent to record, off until given. Shown only where
 * a check runs, or while an opt-in exists that can be taken back; when it cannot be read, the
 * card says so and offers to ask again.
 */
export function EvaluationOptIn() {
  const { m, language } = useI18n();
  const { client } = useSession();
  const [state, setState] = useState<SpeechEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Whether the opt-in could not be read, and how often it was asked for again.
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    void client.speechEvaluation().then((result) => {
      if (!current) return;
      if (result.ok) setState(result.value);
      // An api that does not know the opt-in (404) has nothing to offer or to take back.
      setLoadFailed(!result.ok && result.status !== 404);
    });
    return () => {
      current = false;
    };
  }, [client, attempt]);

  // Not knowing is said, with a way to ask again: someone who opted in must always be able
  // to reach the button that takes it back.
  if (!state && loadFailed) {
    return (
      <section className="card stack" aria-labelledby="speech-evaluation">
        <h3 id="speech-evaluation">{m.speech.optIn.title}</h3>
        <p role="alert">{m.speech.optIn.loadFailed}</p>
        <button
          className="btn"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => {
            setLoadFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          {m.speech.optIn.retry}
        </button>
      </section>
    );
  }
  if (!state || (!state.available && !state.optedIn)) return null;

  const change = async (optedIn: boolean) => {
    setBusy(true);
    try {
      const result = await client.setSpeechEvaluation(optedIn);
      if (!result.ok) {
        setFailure(errorMessage(m, result));
        return;
      }
      setFailure(null);
      setState({
        ...state,
        optedIn,
        since: optedIn ? new Date().toISOString() : null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack" aria-labelledby="speech-evaluation">
      <h3 id="speech-evaluation">{m.speech.optIn.title}</h3>
      <p className="muted">{m.speech.optIn.what}</p>
      <ul className="muted" style={{ margin: 0, paddingInlineStart: 20 }}>
        {m.speech.optIn.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p role="status">
        <strong>
          {state.optedIn
            ? m.speech.optIn.on(
                state.since ? formatDay(state.since.slice(0, 10), language) : null
              )
            : m.speech.optIn.off}
        </strong>
      </p>
      <button
        className={state.optedIn ? 'btn' : 'btn btn-teal'}
        type="button"
        style={{ alignSelf: 'flex-start' }}
        disabled={busy}
        onClick={() => void change(!state.optedIn)}
      >
        {state.optedIn ? m.speech.optIn.revoke : m.speech.optIn.give}
      </button>
      {failure && <p role="alert">{failure}</p>}
    </section>
  );
}
