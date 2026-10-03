import { useI18n } from '@/i18n/I18nProvider';
import type { Messages } from '@/i18n/messages';

/** A destination that is specified but not built yet; says what it will be. */
export function Soon({ page }: { page: keyof Omit<Messages['soon'], 'eyebrow'> }) {
  const { m } = useI18n();
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <p className="eyebrow">{m.soon.eyebrow}</p>
      <h1>{m.soon[page].title}</h1>
      <p className="muted">{m.soon[page].text}</p>
    </div>
  );
}
