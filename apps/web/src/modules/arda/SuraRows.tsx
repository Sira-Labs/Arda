import { sura } from '@arda/quran';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDay } from '@/modules/assignments/format';
import type { ArdaSuraSummary } from '@/services/auth';

/** Sūra by sūra: its name, how often it was recited, when last, and the latest verdict. */
export function SuraRows({ rows }: { rows: readonly ArdaSuraSummary[] }) {
  const { m, language } = useI18n();
  return (
    <ul className="stack arda-suras" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {rows.map((row) => (
        <li key={row.sura} className="arda-sura">
          <span>
            {m.arda.sura(row.sura)}{' '}
            <bdi lang="ar" dir="rtl">
              {sura(row.sura)?.name}
            </bdi>
          </span>
          <span className="muted">
            {m.arda.times(row.times)} · {m.arda.last(formatDay(row.lastOn, language))}
          </span>
          <span className="chip" data-verdict={row.lastVerdict}>
            {m.recite.verdicts[row.lastVerdict]}
          </span>
        </li>
      ))}
    </ul>
  );
}
