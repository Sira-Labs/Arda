import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useEngagement } from '@/engagement/useEngagement';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * "Abzeichen" (ADR-0023, update 2026-11-14): every badge with what it stands for, the earned
 * ones first in their order. An open badge says what it takes, without a deadline.
 */
export function Badges({ now }: { now?: () => number }) {
  const { m } = useI18n();
  const { badges } = useEngagement(now);
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div className="stack" style={{ gap: 24 }}>
      <header className="stack" style={{ gap: 4 }}>
        <p className="eyebrow">{m.engagement.title}</p>
        <h1>{m.engagement.badges.title}</h1>
        <p className="muted">{m.engagement.badges.intro}</p>
        <p style={{ margin: 0 }}>
          <strong>{m.engagement.badges.count(earned, badges.length)}</strong>
        </p>
      </header>
      <ul className="badge-grid">
        {badges.map((badge) => {
          const text = m.engagement.badges.names[badge.id];
          return (
            <li
              key={badge.id}
              className={badge.earned ? 'card badge badge-earned' : 'card badge'}
            >
              <Icon name="badge" size={32} />
              <div className="stack" style={{ gap: 2 }}>
                <strong>{text.name}</strong>
                <span className="muted">{text.hint}</span>
                <span className={badge.earned ? 'chip chip-done' : 'chip chip-quiet'}>
                  {badge.earned
                    ? m.engagement.badges.earned
                    : m.engagement.badges.pending}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Link className="btn" to="/" style={{ alignSelf: 'flex-start' }}>
        {m.engagement.badges.back}
      </Link>
    </div>
  );
}
