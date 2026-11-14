import { QUEST_RULES } from '@arda/engagement';
import { useEngagement } from '@/engagement/useEngagement';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * "Für heute" on Today (ADR-0023, update 2026-11-14): the day's three quests with how far each
 * has come. A quest left open is not mentioned again; tomorrow starts fresh.
 */
export function QuestsCard({ now }: { now?: () => number }) {
  const { m } = useI18n();
  const { quests } = useEngagement(now);
  const allDone = quests.every((q) => q.done);
  return (
    <section className="card stack" aria-labelledby="quests-title" style={{ gap: 12 }}>
      <div className="stack" style={{ gap: 2 }}>
        <h2 id="quests-title" className="h-small">
          {m.engagement.quests.title}
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {allDone ? m.engagement.quests.allDone : m.engagement.quests.hint}
        </p>
      </div>
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 12 }}>
        {quests.map((quest) => {
          const name = m.engagement.quests.names[quest.id](quest.goal);
          return (
            <li key={quest.id} className="stack" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span>{name}</span>
                {/* The state in words beside the bar, never by colour alone. */}
                {quest.done ? (
                  <span className="chip chip-done" dir="ltr">
                    {m.engagement.quests.done} ·{' '}
                    {m.engagement.quests.bonus(QUEST_RULES.bonus)}
                  </span>
                ) : (
                  <span className="muted" dir="ltr">
                    {m.engagement.quests.progress(quest.progress, quest.goal)}
                  </span>
                )}
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-label={name}
                aria-valuemin={0}
                aria-valuemax={quest.goal}
                aria-valuenow={quest.progress}
                style={{ flex: 'none' }}
              >
                <div style={{ inlineSize: `${(quest.progress / quest.goal) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
