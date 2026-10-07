import { pageStart, sura } from '@arda/quran';
import { Link } from 'react-router-dom';
import { entryForPage, layoutOfScript } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';
import { useMushafScript } from './script';

/**
 * "Weiterlesen": the page last read in the script this device shows, with the sūra it opens
 * with (ADR-0022 update 2026-10-07). Nothing until a page has been read, or when the app no
 * longer has that page.
 */
export function ContinueReading() {
  const { m } = useI18n();
  const script = useMushafScript();
  const place = useReview().places[script];
  if (!place || !entryForPage(place.page, script)) return null;
  const start = pageStart(layoutOfScript(script), place.page);
  const name = start ? sura(start[0])?.name : undefined;
  return (
    <Link className="card path-card" to={`/mushaf/seite/${place.page}`}>
      <span className="stack" style={{ gap: 4 }}>
        <strong>{m.mushaf.continue}</strong>
        <span>
          {m.mushaf.page(place.page)} · {m.mushaf.scripts[script].name}
          {name && (
            <>
              {' · '}
              <span lang="ar" dir="rtl">
                {name}
              </span>
            </>
          )}
        </span>
      </span>
    </Link>
  );
}
