import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* التنقل بين أدوات المنصة يعتمد عناوين URL حقيقية (روابط قابلة للمشاركة،
          وفتح عدة أدوات في تبويبات متزامنة، ودعم زر الرجوع في المتصفح) */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

// Register the PWA service worker (production builds only, so the dev server
// hot-reload experience stays untouched).
if ('serviceWorker' in navigator && import.meta.env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SPEX: تعذّر تسجيل Service Worker', err);
    });
  });
}
