import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { PasskeyClient, passkeysSupported } from '@/services/passkeys';
import { useSession } from '@/state/session';

/**
 * "Sign in with a passkey": one tap with Face ID, Touch ID or the device PIN, for learners who
 * added a passkey on the account page. Hidden in browsers without WebAuthn.
 */
export function PasskeySignIn({
  onSignedIn,
  passkeys = new PasskeyClient(),
}: {
  onSignedIn?: () => void;
  passkeys?: PasskeyClient;
}) {
  const { refresh } = useSession();
  const { m } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!passkeysSupported()) return null;

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const result = await passkeys.signIn();
    setBusy(false);
    if (result.ok) {
      await refresh();
      onSignedIn?.();
    } else if (result.reason !== 'cancelled') setError(m.passkey[result.reason]);
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn" type="button" disabled={busy} onClick={() => void signIn()}>
        {m.signIn.passkey}
      </button>
      {error && <span className="feedback-bad">{error}</span>}
    </div>
  );
}
