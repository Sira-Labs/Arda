import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { LanguagePicker } from '@/i18n/LanguagePicker';
import { SecondFactor } from '@/modules/admin/SecondFactor';
import type { Device } from '@/services/auth';
import { PasskeyClient, passkeysSupported } from '@/services/passkeys';
import { useSession } from '@/state/session';

/**
 * The account page: who you are, your language, for an admin the second factor and the way to
 * the admin area, your devices, a passkey, signing out.
 */
export function Account({
  passkeys = new PasskeyClient(),
}: {
  passkeys?: PasskeyClient;
}) {
  const { me, loading, client, signOut } = useSession();
  const { m } = useI18n();
  const [devices, setDevices] = useState<Device[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    void client.devices().then((result) => {
      if (result.ok) setDevices(result.value.sessions);
    });
  }, [client, me]);

  if (!loading && !me) return <Navigate to="/anmelden?zurueck=/konto" replace />;
  if (!me) return null;

  const addPasskey = async () => {
    const result = await passkeys.add();
    if (result.ok) setMessage(m.account.passkeyAdded);
    else if (result.reason !== 'cancelled') setMessage(m.passkey[result.reason]);
  };

  const endOthers = async () => {
    const result = await client.endOtherDevices();
    if (result.ok) {
      setDevices((list) => list.filter((d) => d.current));
      setMessage(m.account.endedOthers(result.value.revoked));
    }
  };

  return (
    <div className="stack">
      <p className="eyebrow">{m.account.eyebrow}</p>
      <h1>{me.name ?? me.email}</h1>
      <p className="muted">
        <span dir="ltr">{me.email}</span> · {m.account.roles[me.role]}
      </p>
      <section className="card stack">
        <LanguagePicker />
        <p className="muted">{m.account.languageHint}</p>
      </section>
      {me.role === 'admin' && (
        // Admins only: the admin area needs the second factor (ADR-0005).
        <>
          <SecondFactor />
          <Link
            className="btn btn-primary"
            to="/verwaltung"
            style={{ alignSelf: 'flex-start' }}
          >
            {m.admin.open}
          </Link>
        </>
      )}
      <section className="card stack" aria-labelledby="devices">
        <h3 id="devices">{m.account.devices}</h3>
        <ul className="stack" style={{ margin: 0, paddingInlineStart: 20 }}>
          {devices.map((device) => (
            <li key={device.id}>
              {device.userAgent ?? m.account.unknownDevice}
              {device.current && <b> · {m.account.thisDevice}</b>}
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn" type="button" onClick={() => void endOthers()}>
            {m.account.endOthers}
          </button>
          {passkeysSupported() && (
            <button
              className="btn btn-teal"
              type="button"
              onClick={() => void addPasskey()}
            >
              {m.account.addPasskey}
            </button>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </section>
      <button className="btn" type="button" onClick={() => void signOut()}>
        {m.account.signOut}
      </button>
    </div>
  );
}
