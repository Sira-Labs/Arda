import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { initialLanguage } from './i18n/I18nProvider';
import { loadCatalog } from './i18n/catalogs';
import './styles/fonts.css';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');
const mount = root;
// The reader's language before the first paint, so nothing is drawn in German and redrawn.
// If its catalog cannot be fetched the app starts in German and switches when it can.
void loadCatalog(initialLanguage())
  .catch(() => undefined)
  .then(() => {
    createRoot(mount).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
// Offline-first: the service worker precaches the shell and fonts (ADR-0010).
registerSW({ immediate: true });
