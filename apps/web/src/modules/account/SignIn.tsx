import { useNavigate, useSearchParams } from 'react-router-dom';
import { safeReturnPath } from '@/services/auth';
import { PasskeySignIn } from './PasskeySignIn';
import { SignInForm } from './SignInForm';

/** The sign-in page: link and code by mail, or a passkey. No passwords (ADR-0004). */
export function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = safeReturnPath(params.get('zurueck'));
  const linkFailed = params.get('fehler') === 'link';
  const done = () => navigate(returnTo, { replace: true });

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <p className="eyebrow">Anmelden</p>
      <h1>Willkommen bei ʿArḍa</h1>
      <p className="muted">
        Melde dich an, damit dein Sheikh deine Rezitationen hört und dir Aufgaben gibt.
        Ohne Passwort: wir schicken dir einen Link und einen Code.
      </p>
      {linkFailed && (
        <p className="feedback-bad" role="alert">
          Der Link ist abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen
          an.
        </p>
      )}
      <div className="card stack">
        <SignInForm returnTo={returnTo} onSignedIn={done} />
      </div>
      <PasskeySignIn onSignedIn={done} />
    </div>
  );
}
