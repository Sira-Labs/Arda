import { useEffect, useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { formatDay } from '@/modules/assignments/format';
import type { SpeechEvaluation } from '@/services/auth';
import { useSession } from '@/state/session';

/**
 * "Automatische Prüfung messen" on the account page (S6.2; ADR-0012, ADR-0013): the student's
 * own, revocable opt-in to let their recitations count when the speech check is measured
 * against the teacher. Separate from the consent to record, off until given. Shown only where
 * a check runs, or while an opt-in exists that can be taken back.
 */
export function EvaluationOptIn() {
  const { m, language } = useI18n();
  const { client } = useSession();
  const [state, setState] = useState<SpeechEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void client.speechEvaluation().then((result) => {
      // Without an answer the card stays away: nothing here is needed to use the app.
      if (current && result.ok) setState(result.value);
    });
    return () => {
      current = false;
    };
  }, [client]);

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
