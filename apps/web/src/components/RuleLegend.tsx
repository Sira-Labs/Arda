import { useI18n } from '@/i18n/I18nProvider';
import { RULE_FAMILIES } from '@/tajweed/rules';

/** The colour families with their names: colour is never the only signal (design spec §4). */
export function RuleLegend() {
  const { m } = useI18n();
  return (
    <section className="stack" aria-label={m.today.legend}>
      <div className="legend">
        {RULE_FAMILIES.map((family) => (
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
