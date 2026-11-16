import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { topicName } from '@/modules/rules/topics';
import type { SpeechAgreementReport } from '@/services/auth';
import { useSession } from '@/state/session';

/**
 * "Automatische Prüfung und du" on the ḥalaqa page (S6.2, ADR-0013): per rule, how often the
 * speech check's hints and the teacher's marks say the same of a word, from the recitations of
 * students who opted in. Counts only; a measure for the teacher, never shown to students.
 * Shows nothing until there is something to compare.
 */
export function SpeechAgreement({ halaqaId }: { halaqaId: string }) {
  const { m, language } = useI18n();
  const { client } = useSession();
  const [report, setReport] = useState<SpeechAgreementReport | null>(null);

  useEffect(() => {
    let current = true;
    void client.speechAgreement(halaqaId).then((result) => {
      // A failed load leaves the card away: the page works without it.
      if (current && result.ok) setReport(result.value);
    });
    return () => {
      current = false;
    };
  }, [client, halaqaId]);

  if (!report || report.rows.length === 0) return null;
  const models = [...new Set(report.rows.map((row) => row.model))];
  const percent = (share: number) => Math.round(share * 100);

  return (
    <section className="card stack" aria-labelledby="agreement-title">
      <h2 className="h-small" id="agreement-title">
        {m.speech.agreement.title}
      </h2>
      <p className="muted">
        {m.speech.agreement.intro(report.recordings, report.students)}
      </p>
      {models.map((model) => (
        <div key={model} className="stack" style={{ gap: 8 }}>
          {models.length > 1 && (
            <p className="eyebrow" dir="ltr">
              {model}
            </p>
          )}
          {/* Five columns do not fit a phone: the table scrolls inside the card, the page never. */}
          <div className="agreement-scroll">
            <table className="agreement-table">
              <caption className="sr-only">{m.speech.agreement.title}</caption>
              <thead>
                <tr>
                  <th scope="col">{m.speech.agreement.rule}</th>
                  <th scope="col">{m.speech.agreement.compared}</th>
                  <th scope="col">{m.speech.agreement.agree}</th>
                  <th scope="col">{m.speech.agreement.falseAlarms}</th>
                  <th scope="col">{m.speech.agreement.misses}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows
                  .filter((row) => row.model === model)
                  .map((row) => (
                    <tr key={row.topic}>
                      <th scope="row">
                        {topicName(row.topic, m, language)}
                        {row.reachesGate && (
                          <>
                            <br />
                            <span className="chip chip-done">
                              {m.speech.agreement.gate}
                            </span>
                          </>
                        )}
                      </th>
                      <td dir="ltr">{row.occurrences}</td>
                      <td dir="ltr">
                        {row.agreement === null
                          ? '–'
                          : m.speech.agreement.percent(percent(row.agreement))}
                      </td>
                      <td dir="ltr">{row.falseAlarms}</td>
                      <td dir="ltr">{row.misses}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="muted">
        {m.speech.agreement.gateNote(
          report.gate.occurrences,
          percent(report.gate.agreement)
        )}
      </p>
    </section>
  );
}
