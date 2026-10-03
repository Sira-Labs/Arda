import { useI18n } from '@/i18n/I18nProvider';
import type { Segment } from '@/tajweed/rules';

/**
 * Qurʾān text with tajwīd colours. Each marked letter keeps its joining (the spans sit inside
 * one word) and carries its rule as a title, so the meaning never depends on colour alone.
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
  const { m } = useI18n();
  return (
    <p
      className={large ? 'quran quran-lg' : 'quran'}
      data-script={script}
      lang="ar"
      dir="rtl"
    >
      {segments.map((segment, index) =>
        segment.rule ? (
          <span
            key={index}
            className="tj"
            data-rule={segment.rule}
            title={m.rules[segment.rule].name}
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
