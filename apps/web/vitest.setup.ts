import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { provideCatalogs } from './src/i18n/catalogs';
import { CATALOGS } from './src/i18n/messages';

// The tests read every language at once; the app fetches a catalog when it is needed.
provideCatalogs(CATALOGS);

afterEach(() => {
  cleanup();
});
