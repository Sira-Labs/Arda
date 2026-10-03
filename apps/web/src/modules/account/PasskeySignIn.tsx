import { useState } from 'react';
import { PasskeyClient, passkeysSupported } from '@/services/passkeys';
import { useSession } from '@/state/session';

/**
 * "Mit Passkey anmelden": one tap with Face ID, Touch ID or the device PIN, for learners who
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
    } else setError(result.message ?? null);
  };

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn" type="button" disabled={busy} onClick={() => void signIn()}>
        Mit Passkey anmelden
      </button>
      {error && <span className="feedback-bad">{error}</span>}
    </div>
  );
}
