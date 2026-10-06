import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { QrCode } from '@/components/QrCode';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { ApiResult } from '@/services/api/request';
import type { SecondFactorStatus } from '@/services/auth';
import { useSession } from '@/state/session';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

/**
 * The second factor (ADR-0005: the admin area needs it): set it up with an authenticator app,
 * or confirm this session with a code. Calls `onConfirmed` once this session is confirmed.
 */
export function SecondFactor({ onConfirmed }: { onConfirmed?: () => void }) {
  const { m } = useI18n();
  const { client } = useSession();
  const t = m.twoFactor;
  const [status, setStatus] = useState<SecondFactorStatus | null>(null);
  const [setup, setSetup] = useState<{ uri: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const load = useCallback(async () => {
    const result = await client.secondFactor();
    if (result.ok) setStatus(result.value);
    else setFailure(result);
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    try {
      const result = await client.setUpSecondFactor();
      if (result.ok) {
        setSetup(result.value);
        setFailure(null);
      } else setFailure(result);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await client.confirmSecondFactor(code.replace(/\s/g, ''));
      if (!result.ok) {
        setFailure(result);
        return;
      }
      setFailure(null);
      setSetup(null);
      setCode('');
      setStatus({ enabled: true, confirmed: true });
      onConfirmed?.();
    } finally {
      setBusy(false);
    }
  };

  const codeForm = (
    <form className="row" style={{ gap: 8, alignItems: 'flex-end' }} onSubmit={confirm}>
      <label className="stack" style={{ gap: 4 }}>
        <span>{t.code}</span>
        <input
          className="input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            // A new code: the last one's refusal no longer applies.
            setFailure(null);
          }}
          dir="ltr"
        />
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {t.confirm}
      </button>
    </form>
  );

  return (
    <section className="card stack" aria-labelledby="second-factor">
      <h2 className="h-small" id="second-factor">
        {t.title}
      </h2>
      {status?.confirmed ? (
        <p role="status">{t.confirmed}</p>
      ) : setup ? (
        <>
          <p>{t.scan}</p>
          <QrCode value={setup.uri} label={t.qr} size={200} />
          <p className="muted">
            {t.secret}:{' '}
            <code dir="ltr" style={{ wordBreak: 'break-all' }}>
              {setup.secret}
            </code>
          </p>
          {codeForm}
        </>
      ) : status?.enabled ? (
        <>
          <p>{t.confirmNeeded}</p>
          {codeForm}
        </>
      ) : status ? (
        <>
          <p className="muted">{t.intro}</p>
          <button
            className="btn btn-primary"
            type="button"
            style={{ alignSelf: 'flex-start' }}
            disabled={busy}
            onClick={() => void start()}
          >
            {t.setUp}
          </button>
        </>
      ) : null}
      {failure && <p role="alert">{errorMessage(m, failure)}</p>}
    </section>
  );
}
