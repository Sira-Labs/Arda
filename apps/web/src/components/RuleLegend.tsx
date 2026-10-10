import { useI18n } from '@/i18n/I18nProvider';
import { MUSHAF_FAMILIES } from '@/tajweed/rules';

/**
 * The muṣḥaf's colour families with their names: colour is never the only signal (design spec
 * §4). The rule cards name their own colours.
 */
export function RuleLegend() {
  const { m } = useI18n();
  return (
    <section className="stack" aria-label={m.today.legend}>
      <div className="legend">
        {MUSHAF_FAMILIES.map((family) => (
          <span key={family}>
            <b className="tj" data-rule={family}>
              ●
            </b>{' '}
            <b>{m.rules[family].name}</b> · {m.rules[family].hint}
          </span>
        ))}
      </div>
    </section>
  );
}
