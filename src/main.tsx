import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js?v=3', { updateViaCache: 'none' })
        .then(() => navigator.serviceWorker.getRegistrations())
        .then((registrations) => Promise.all(registrations.map((registration) => registration.update())))
        .catch((err) => {
          console.log('ServiceWorker registration failed:', err);
        });
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch((err) => {
          console.log('ServiceWorker unregister failed:', err);
        });

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch((err) => {
            console.log('Cache cleanup failed:', err);
          });
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <App />,
);
