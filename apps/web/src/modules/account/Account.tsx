import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { Device } from '@/services/auth';
import { PasskeyClient, passkeysSupported } from '@/services/passkeys';
import { useSession } from '@/state/session';

const ROLE_LABELS = {
  student: 'Schüler·in',
  teacher: 'Sheikh / Lehrer·in',
  admin: 'Admin',
};

/** The account page: who you are, your devices, a passkey, signing out. */
export function Account({
  passkeys = new PasskeyClient(),
}: {
  passkeys?: PasskeyClient;
}) {
  const { me, loading, client, signOut } = useSession();
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
    setMessage(result.ok ? 'Passkey hinzugefügt.' : (result.message ?? null));
  };

  const endOthers = async () => {
    const result = await client.endOtherDevices();
    if (result.ok) {
      setDevices((list) => list.filter((d) => d.current));
      setMessage(`${result.value.revoked} andere Geräte abgemeldet.`);
    }
  };

  return (
    <div className="stack">
      <p className="eyebrow">Konto</p>
      <h1>{me.name ?? me.email}</h1>
      <p className="muted">
        {me.email} · {ROLE_LABELS[me.role]}
      </p>
      <section className="card stack" aria-labelledby="devices">
        <h3 id="devices">Angemeldete Geräte</h3>
        <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
          {devices.map((device) => (
            <li key={device.id}>
              {device.userAgent ?? 'Unbekanntes Gerät'}
              {device.current && <b> · dieses Gerät</b>}
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn" type="button" onClick={() => void endOthers()}>
            Andere Geräte abmelden
          </button>
          {passkeysSupported() && (
            <button
              className="btn btn-teal"
              type="button"
              onClick={() => void addPasskey()}
            >
              Passkey hinzufügen
            </button>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </section>
      <button className="btn" type="button" onClick={() => void signOut()}>
        Abmelden
      </button>
    </div>
  );
}
