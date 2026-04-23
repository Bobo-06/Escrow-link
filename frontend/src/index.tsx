import React from 'react';
import ReactDOM from 'react-dom/client';
import { hydrateRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const rootEl = document.getElementById('root') as HTMLElement;

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// react-snap prerenders static HTML at build time; hydrate on client for those routes
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app);
} else {
  ReactDOM.createRoot(rootEl).render(app);
}

reportWebVitals();
