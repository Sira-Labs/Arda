import { useI18n } from '@/i18n/I18nProvider';
import { ruleName, type Segment } from '@/tajweed/rules';

/**
 * Qurʾān text with tajwīd colours. Each marked letter keeps its joining (the spans sit inside
 * one word) and carries its rule as a title, so the meaning never depends on colour alone.
 * The letter that decides a rule is underlined and titled as such.
 */
export function TajweedText({
  segments,
  script = 'indopak',
  large = false,
}: {
  segments: readonly Segment[];
  script?: 'indopak' | 'madina';
  large?: boolean;
}) {
  const { m, language } = useI18n();

  const title = (segment: Segment): string | undefined => {
    if (segment.role === 'follower') return m.ruleCard.decides;
    if (segment.role === 'focus') return undefined;
    const name = segment.ruleId ? ruleName(segment.ruleId, language) : undefined;
    const family = segment.rule ? m.rules[segment.rule].name : undefined;
    return name && family && name !== family ? `${name} · ${family}` : (name ?? family);
  };

  return (
    <p
      className={large ? 'quran quran-lg' : 'quran'}
      data-script={script}
      lang="ar"
      dir="rtl"
    >
      {segments.map((segment, index) =>
        segment.rule || segment.role ? (
          <span
            key={index}
            className={
              segment.role === 'follower'
                ? 'tj-follower'
                : segment.role === 'focus'
                  ? 'tj-focus'
                  : 'tj'
            }
            data-rule={segment.rule}
            title={title(segment)}
          >
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </p>
  );
}
