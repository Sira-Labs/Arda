import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cardName, unitOf, type CardId } from '@/content/units';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { Messages } from '@/i18n/messages';
import type { Language } from '@/i18n/languages';
import { formatDay } from '@/modules/assignments/format';
import type { RuleTopic, Struggle } from '@/services/auth';
import { useSession } from '@/state/session';

/** The topics that are not rule cards. */
const OTHER_TOPICS = new Set<RuleTopic>(['madd', 'makhraj']);

/** A topic's name: the rule card's (Arabic in the Arabic interface), or madd or makhārij. */
export function topicName(topic: RuleTopic, m: Messages, language: Language): string {
  if (topic === 'madd' || topic === 'makhraj') return m.struggles.topics[topic];
  return cardName(topic, language);
}

/**
 * "Regel für Regel" on the ḥalaqa page (spec T5, ADR-0026): per rule, which students still
 * struggle with it, from their practice (mistakes not yet mastered) and the teacher's own
 * quick remarks of the last 90 days. The rule most students struggle with comes first.
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

  // Topic by topic, in the order the api weighed them (heaviest first).
  const topics: RuleTopic[] = [];
  for (const s of struggles ?? []) if (!topics.includes(s.topic)) topics.push(s.topic);
  topics.sort(
    (a, b) =>
      (struggles ?? []).filter((s) => s.topic === b).length -
      (struggles ?? []).filter((s) => s.topic === a).length
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
                        s.remarks > 0 && s.lastRemarkOn
                          ? m.struggles.remarks(
                              s.remarks,
                              formatDay(s.lastRemarkOn, language)
                            )
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
