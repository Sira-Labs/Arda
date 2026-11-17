import { useCallback, useEffect, useState } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { Language } from '@/i18n/languages';
import type { ApiResult } from '@/services/api/request';
import type { AuditEntry, Role } from '@/services/auth';
import { useSession } from '@/state/session';

type Failure = Extract<ApiResult<unknown>, { ok: false }>;

/** Day and minute on this device's clock: an audit entry is read against other logs. */
function formatTime(iso: string, language: Language): string {
  return new Date(iso).toLocaleString(language === 'ar' ? 'ar-EG' : language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Actions a person takes on their own account (the api writes actor and target alike). */
const isOwnAccount = (action: string): boolean =>
  action.startsWith('account.') || action.startsWith('speech.evaluation_');

/** The account an entry is about: the target user, or the member in a ḥalaqa entry. */
function subjectOf(entry: AuditEntry): string | null {
  if (entry.targetType === 'user') return entry.targetId;
  const userId = entry.details.userId;
  return typeof userId === 'string' ? userId : null;
}

/**
 * The audit log on `/verwaltung` (spec A4, ADR-0005): who changed what, on whom, when and
 * from where, newest first. Read-only; the api writes the entries with the change itself.
 *
 * @param version bumped by the page after a change, so the new entry shows without a reload
 * @param onNeedsCode the second factor is no longer confirmed in this session
 */
export function AuditLog({
  version,
  onNeedsCode,
}: {
  version: number;
  onNeedsCode: () => void;
}) {
  const { client } = useSession();
  const { m, language } = useI18n();
  const t = m.admin.audit;
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(false);
  // Only the latest request may set the list: a page asked for before a refresh is dropped.
  // One counter for the component's life (not a ref: the effect's cleanup advances it too).
  const [requests] = useState(() => ({ latest: 0 }));

  const load = useCallback(
    async (before?: string) => {
      const request = ++requests.latest;
      setLoading(true);
      const result = await client.adminAudit(before);
      if (request !== requests.latest) return;
      setLoading(false);
      if (!result.ok) {
        if (result.code === 'second_factor_required') onNeedsCode();
        else setFailure(result);
        return;
      }
      setFailure(null);
      setNext(result.value.next);
      setEntries((list) =>
        before ? [...(list ?? []), ...result.value.entries] : result.value.entries
      );
    },
    [client, onNeedsCode, requests]
  );

  useEffect(() => {
    void load();
    // Leaving (the code form replaces the log) drops the answer still on its way: it must
    // not ask for the code again after the page has confirmed it.
    return () => {
      requests.latest++;
    };
  }, [load, version, requests]);

  const labels: Record<string, string> = t.actions;
  const roleName = (value: unknown): string =>
    typeof value === 'string' && value in m.account.roles
      ? m.account.roles[value as Role]
      : String(value);

  return (
    <section className="card stack" aria-labelledby="audit-title">
      <header className="stack" style={{ gap: 4 }}>
        <h2 id="audit-title">{t.title}</h2>
        <p className="muted">{t.intro}</p>
      </header>
      {entries?.length === 0 && <p className="muted">{t.none}</p>}
      <ol className="stack" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {entries?.map((entry) => {
          const subject = subjectOf(entry);
          // Named when it is someone else. What people do to their own account keeps no
          // actor once the account is deleted, so those entries are known by their action,
          // not by what is missing: a role change stays about someone even when admin and
          // person are both gone.
          const someoneElse =
            subject !== null && subject !== entry.actorId && !isOwnAccount(entry.action);
          return (
            <li key={entry.id} className="audit-row">
              <strong>
                {/* An action this version has no words for is shown as the api wrote it. */}
                {labels[entry.action] ?? <code dir="ltr">{entry.action}</code>}
                {entry.action === 'user.role_changed' && (
                  <span className="muted">
                    {' '}
                    ·{' '}
                    {t.roleChange(
                      roleName(entry.details.from),
                      roleName(entry.details.to)
                    )}
                  </span>
                )}
              </strong>
              <dl className="audit-facts muted">
                <div>
                  <dt>{t.when}</dt>
                  <dd>
                    <time dateTime={entry.createdAt}>
                      {formatTime(entry.createdAt, language)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>{t.by}</dt>
                  <dd dir={entry.actorEmail ? 'ltr' : undefined}>
                    {entry.actorEmail ?? t.gone}
                  </dd>
                </div>
                {someoneElse && (
                  <div>
                    <dt>{t.about}</dt>
                    <dd dir={entry.subjectEmail ? 'ltr' : undefined}>
                      {entry.subjectEmail ?? t.gone}
                    </dd>
                  </div>
                )}
                {entry.targetType === 'halaqa' && (
                  <div>
                    <dt>{t.halaqa}</dt>
                    <dd>{entry.halaqaName ?? t.goneHalaqa}</dd>
                  </div>
                )}
                {entry.ipAddress && (
                  <div>
                    <dt>{t.ip}</dt>
                    <dd dir="ltr">{entry.ipAddress}</dd>
                  </div>
                )}
              </dl>
            </li>
          );
        })}
      </ol>
      {failure && (
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <p role="alert" style={{ margin: 0 }}>
            {errorMessage(m, failure)}
          </p>
          <button
            className="btn"
            type="button"
            disabled={loading}
            onClick={() => void load()}
          >
            {t.retry}
          </button>
        </div>
      )}
      {next && !failure && (
        <button
          className="btn"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          disabled={loading}
          onClick={() => void load(next)}
        >
          {m.admin.more}
        </button>
      )}
    </section>
  );
}
