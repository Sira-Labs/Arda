import { Icon } from '@/components/Icon';
import { useEngagement } from '@/engagement/useEngagement';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * "Dein Fortschritt" on Today (ADR-0023): level and XP with the way to the next level, the
 * streak and its shields. Kind words only: a missed day is never held against anyone.
 */
export function ProgressCard({ now }: { now?: () => number }) {
  const { m } = useI18n();
  const { totalXp, todayXp, level, streak } = useEngagement(now);
  const percent = Math.round((level.into / Math.max(1, level.span)) * 100);
  const streakLine =
    streak.current === 0
      ? m.engagement.streakStart
      : streak.activeToday
        ? m.engagement.streakToday
        : m.engagement.streakOpen;
  return (
    <section className="card stack" aria-labelledby="progress-title" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="progress-title" className="h-small">
          {m.engagement.title}
        </h2>
        {todayXp > 0 && (
          // Numbers with signs stay left to right inside Arabic text.
          <span className="chip" dir="ltr">
            {m.engagement.today(todayXp)}
          </span>
        )}
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <p style={{ margin: 0 }}>
          <strong>{m.engagement.level(level.level)}</strong> · {m.engagement.xp(totalXp)}
        </p>
        <div
          className="progress"
          role="progressbar"
          aria-label={m.engagement.toNext(level.span - level.into)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          style={{ flex: 'none' }}
        >
          <div style={{ inlineSize: `${percent}%` }} />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {m.engagement.toNext(level.span - level.into)}
        </p>
      </div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <Icon name="streak" />
        <p style={{ margin: 0 }}>
          {streak.current > 0 && (
            <strong>{m.engagement.streak(streak.current)} · </strong>
          )}
          {streakLine}
        </p>
      </div>
      {streak.shields > 0 && (
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <Icon name="shield" />
          <p style={{ margin: 0 }}>
            <strong>{m.engagement.shields(streak.shields)}</strong>{' '}
            <span className="muted">{m.engagement.shieldHint}</span>
          </p>
        </div>
      )}
    </section>
  );
}
