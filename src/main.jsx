import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registrado:', reg.scope))
      .catch((err) => console.error('[PWA] Error registrando Service Worker:', err));
  });

  window.addEventListener('online', () => {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.sync) {
        reg.sync.register('sincronizar-ventas').catch(() => {
          reg.active?.postMessage('sincronizar-ahora');
        });
      } else {
        reg.active?.postMessage('sincronizar-ahora');
      }
    });
  });
}
