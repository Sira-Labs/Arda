import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './styles/fonts.css';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
// Offline-first: the service worker precaches the shell and fonts (ADR-0010).
registerSW({ immediate: true });
