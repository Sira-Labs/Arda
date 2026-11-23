import { useRouteError } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { logger } from '@/services/logger';

const log = logger.child('screen');

/**
 * Shown in place of a screen that could not be fetched (offline before the service worker has
 * it, or a deploy replaced it) or that failed while drawing: says so and offers to load the
 * app again, which fetches the current version.
 */
export function ScreenError() {
  const { m } = useI18n();
  const error = useRouteError();
  log.warn('screen failed', { name: error instanceof Error ? error.name : typeof error });
  return (
    <main className="stack" style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1>{m.screenError.title}</h1>
      <p role="alert">{m.screenError.text}</p>
      <button
        className="btn btn-primary"
        type="button"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => window.location.reload()}
      >
        {m.screenError.reload}
      </button>
    </main>
  );
}
