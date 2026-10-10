import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { unitOf, type CardId } from '@/content/units';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { formatDay } from '@/modules/assignments/format';
import type { RuleTopic, Struggle } from '@/services/auth';
import { useSession } from '@/state/session';
import { topicName } from './topics';

/** The topics that are not rule cards. */
const OTHER_TOPICS = new Set<RuleTopic>(['madd', 'makhraj']);

/**
 * "Regel für Regel" on the ḥalaqa page (spec T5, ADR-0026): per rule, which students still
 * struggle with it, from their practice (mistakes not yet mastered) and the teacher's own
 * quick remarks and marked words of the last 90 days. The rule most students struggle with comes first.
 */
export function RuleByRule({ halaqaId }: { halaqaId: string }) {
  const { m, language } = useI18n();
  const { client } = useSession();
  const [struggles, setStruggles] = useState<Struggle[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void client.ruleStruggles(halaqaId).then((result) => {
      if (!current) return;
      if (result.ok) {
        setStruggles(result.value.struggles);
        setFailure(null);
      } else {
        setFailure(errorMessage(m, result));
      }
    });
    return () => {
      current = false;
    };
  }, [client, halaqaId, m]);

  // Topic by topic: the one most students struggle with first, then the heaviest.
  const all = struggles ?? [];
  const students = (topic: RuleTopic) => all.filter((s) => s.topic === topic).length;
  const weight = (topic: RuleTopic) =>
    all
      .filter((s) => s.topic === topic)
      .reduce((sum, s) => sum + s.openCards + s.remarks + s.marks, 0);
  const topics = [...new Set(all.map((s) => s.topic))].sort(
    (a, b) => students(b) - students(a) || weight(b) - weight(a)
  );

  return (
    <section className="card stack" aria-labelledby="rules-title">
      <h2 className="h-small" id="rules-title">
        {m.struggles.title}
      </h2>
      <p className="muted">{m.struggles.intro}</p>
      {failure && <p role="alert">{failure}</p>}
      {struggles && topics.length === 0 && <p className="muted">{m.struggles.none}</p>}
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 12 }}>
        {topics.map((topic) => (
          <li key={topic} className="stack arda-student" style={{ gap: 6 }}>
            <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <strong>{topicName(topic, m, language)}</strong>
              {!OTHER_TOPICS.has(topic) && (
                <Link to={`/pfad/${unitOf(topic as CardId)}/${topic}`}>
                  {m.struggles.card}
                </Link>
              )}
            </span>
            <ul
              className="stack arda-suras"
              style={{ margin: 0, padding: 0, listStyle: 'none' }}
            >
              {(struggles ?? [])
                .filter((s) => s.topic === topic)
                .map((s) => (
                  <li key={s.studentId} className="arda-sura">
                    <span>{s.studentName ?? m.struggles.unnamed}</span>
                    <span className="muted">
                      {[
                        s.openCards > 0 ? m.struggles.open(s.openCards) : null,
                        s.remarks > 0 ? m.struggles.remarks(s.remarks) : null,
                        s.marks > 0 ? m.struggles.marks(s.marks) : null,
                        s.lastNotedOn
                          ? m.struggles.last(formatDay(s.lastNotedOn, language))
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
