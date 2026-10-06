import { useNavigate, useSearchParams } from 'react-router-dom';
import { BrandHeader } from '@/components/Logo';
import { useI18n } from '@/i18n/I18nProvider';
import { LanguagePicker } from '@/i18n/LanguagePicker';
import { safeReturnPath } from '@/services/auth';
import { PasskeySignIn } from './PasskeySignIn';
import { SignInForm } from './SignInForm';

/**
 * The sign-in page: link and code by mail, or a passkey. No passwords (ADR-0004). The
 * language chosen here is the language of the mail (ADR-0020). It opens with the brand
 * header of the design (docs/spec/04-design-system.md §11).
 */
export function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { m } = useI18n();
  const returnTo = safeReturnPath(params.get('zurueck'));
  const linkFailed = params.get('fehler') === 'link';
  const done = () => navigate(returnTo, { replace: true });

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <BrandHeader tagline={m.brand.tagline} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="eyebrow">{m.signIn.eyebrow}</p>
        <LanguagePicker />
      </div>
      <h1>{m.signIn.title}</h1>
      <p className="muted">{m.signIn.intro}</p>
      {linkFailed && (
        <p className="feedback-bad" role="alert">
          {m.signIn.linkFailed}
        </p>
      )}
      <div className="card stack">
        <SignInForm returnTo={returnTo} onSignedIn={done} />
      </div>
      <PasskeySignIn onSignedIn={done} />
    </div>
  );
}
