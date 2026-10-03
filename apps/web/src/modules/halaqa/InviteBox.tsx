import { useState } from 'react';
import { QrCode } from '@/components/QrCode';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { useSession } from '@/state/session';

/**
 * The invite for a ḥalaqa (ADR-0005): a link with the token in its fragment, so it never
 * reaches a server log, and the same link as a QR code. The token exists only in this
 * component's state: the server keeps its hash, so a reload shows "a link is active" only.
 */
export function InviteBox({
  halaqaId,
  active,
  onChanged,
}: {
  halaqaId: string;
  active: { expiresAt: string } | null;
  onChanged: () => void;
}) {
  const { client } = useSession();
  const { m, language } = useI18n();
  const [created, setCreated] = useState<{ link: string; expiresAt: string } | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-EG' : language, {
      day: 'numeric',
      month: 'long',
    });

  const create = async () => {
    const result = await client.newInvite(halaqaId);
    if (!result.ok) return setMessage(errorMessage(m, result));
    setCreated({
      link: `${window.location.origin}/beitreten#${result.value.token}`,
      expiresAt: result.value.expiresAt,
    });
    setMessage(null);
    onChanged();
  };

  const revoke = async () => {
    const result = await client.revokeInvites(halaqaId);
    if (!result.ok) return setMessage(errorMessage(m, result));
    setCreated(null);
    setMessage(m.halaqa.invite.revoked);
    onChanged();
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setMessage(m.halaqa.invite.copied);
    } catch {
      // Clipboard blocked (permissions, insecure context): the link stays selectable.
      setMessage(null);
    }
  };

  const share = () => {
    if (created) void navigator.share?.({ url: created.link }).catch(() => undefined);
  };

  return (
    <section className="card stack" aria-labelledby="invite">
      <h2 id="invite" className="h-small">
        {m.halaqa.invite.title}
      </h2>
      <p className="muted">{m.halaqa.invite.hint}</p>
      {created ? (
        <div className="stack" style={{ alignItems: 'center' }}>
          <QrCode value={created.link} label={m.halaqa.invite.qr} />
          <input
            className="input invite-link"
            readOnly
            value={created.link}
            dir="ltr"
            onFocus={(e) => e.target.select()}
          />
          <p className="muted">{m.halaqa.invite.validUntil(date(created.expiresAt))}</p>
          <div className="row">
            <button className="btn btn-primary" type="button" onClick={() => void copy()}>
              {m.halaqa.invite.copy}
            </button>
            {'share' in navigator && (
              <button className="btn" type="button" onClick={share}>
                {m.halaqa.invite.share}
              </button>
            )}
          </div>
        </div>
      ) : (
        active && <p>{m.halaqa.invite.hidden(date(active.expiresAt))}</p>
      )}
      <div className="row">
        <button className="btn" type="button" onClick={() => void create()}>
          {created || active ? m.halaqa.invite.renew : m.halaqa.invite.create}
        </button>
        {(created || active) && (
          <button className="btn" type="button" onClick={() => void revoke()}>
            {m.halaqa.invite.revoke}
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
