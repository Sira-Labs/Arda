import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { sura as suraOf } from '@arda/quran';
import { entryFor } from '@/content/packs';
import { useI18n } from '@/i18n/I18nProvider';
import { pageOfAya, pageOfSura } from './pageModel';
import { useMushafScript } from './script';
import { usePack } from './usePack';

/**
 * `/mushaf/:sura` opens the page the sūra starts on, or with `?von=` the page the assignment
 * starts on; the sūra and range go along in the query, so links from assignments and the sūra
 * list keep working (S3.2).
 */
export function SuraView() {
  const { sura: param = '' } = useParams();
  const [search] = useSearchParams();
  const { m } = useI18n();
  const script = useMushafScript();
  const number = Number(param);
  const meta = Number.isInteger(number) ? suraOf(number) : undefined;
  const result = usePack(meta ? entryFor(number, script) : undefined);

  const back = <Link to="/mushaf">{m.mushaf.all}</Link>;
  if (!meta || (result && !result.ok)) {
    return (
      <div className="stack">
        {back}
        <p role="alert">
          {m.mushaf.failure[!meta || !result || result.ok ? 'missing' : result.failure]}
        </p>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="stack">
        {back}
        <p className="muted" role="status">
          {m.mushaf.loading}
        </p>
      </div>
    );
  }
  const from = Number(search.get('von'));
  const page =
    (Number.isInteger(from) && from >= 1 && pageOfAya(result.pack, number, from)) ||
    pageOfSura(result.pack, number);
  if (!page) {
    return (
      <div className="stack">
        {back}
        <p role="alert">{m.mushaf.failure.missing}</p>
      </div>
    );
  }
  const query = new URLSearchParams(search);
  if (query.has('von')) query.set('sura', String(number));
  const rest = query.toString();
  return <Navigate replace to={`/mushaf/seite/${page}${rest ? `?${rest}` : ''}`} />;
}
