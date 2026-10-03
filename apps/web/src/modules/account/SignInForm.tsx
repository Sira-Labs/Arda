import { useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { useSession } from '@/state/session';

/**
 * Email field and "send link" (ported from Suffa); after sending it says where to look,
 * takes the six-digit code from the same mail (for mail apps that open the link in their own
 * browser), and offers to send again or use another address. The mail is written in the
 * language chosen on this page (ADR-0020).
 */
export function SignInForm({
  returnTo,
  onSignedIn,
}: {
  returnTo?: string;
  /** Called after signing in with the code (the link brings the learner back by itself). */
  onSignedIn?: () => void;
}) {
  const { client, refresh } = useSession();
  const { m, language } = useI18n();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError(null);
    const result = await client.requestLink(email, language, returnTo);
    setBusy(false);
    if (result.ok) setSentTo(email.trim());
    else setError(result.code ? errorMessage(m, result) : m.signIn.sendFailed);
  };

  const confirm = async () => {
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const result = await client.enterCode(sentTo, code);
    setBusy(false);
    if (result.ok) {
      await refresh();
      onSignedIn?.();
    } else setError(result.code ? errorMessage(m, result) : m.signIn.signInFailed);
  };

  if (sentTo) {
    return (
      <div className="stack">
        <span className="feedback-good" role="status">
          {m.signIn.sentTo(sentTo)}
        </span>
        <span className="muted">{m.signIn.sentHint}</span>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <label className="stack" style={{ gap: 6 }}>
            <span>{m.signIn.codeLabel}</span>
            <div className="row">
              <input
                className="input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={7}
                placeholder="123456"
                dir="ltr"
                aria-label={m.signIn.code}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {m.signIn.confirm}
              </button>
            </div>
          </label>
        </form>
        <div className="row">
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => void send()}
          >
            {m.signIn.resend}
          </button>
          <button className="btn" type="button" onClick={() => setSentTo(null)}>
            {m.signIn.otherEmail}
          </button>
        </div>
        {error && <span className="feedback-bad">{error}</span>}
      </div>
    );
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div className="row">
        <input
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          placeholder={m.signIn.emailPlaceholder}
          aria-label={m.signIn.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ flex: 1, minWidth: 0 }}
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {m.signIn.sendLink}
        </button>
      </div>
      {error && <span className="feedback-bad">{error}</span>}
    </form>
  );
}
