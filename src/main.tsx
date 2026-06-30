import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

import { Studio } from 'sanity';
import config from '../sanity.config';

// Register Service Worker
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

const path = window.location.pathname;
const rootElement = document.getElementById('root')!;

if (path.startsWith('/studio')) {
  createRoot(rootElement).render(
    <StrictMode>
      <Studio config={config} />
    </StrictMode>
  );
} else {
  createRoot(rootElement).render(
    <App />
  );
}
