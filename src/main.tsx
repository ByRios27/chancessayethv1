import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear storage and unregister service workers to prevent caching issues in single-user refactor
if (typeof window !== 'undefined') {
  localStorage.clear();
  sessionStorage.clear();
  console.log('Storage cleared for single-user refactor');
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('ServiceWorker unregistered');
      }
    });
  }
}

/* 
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}
*/

createRoot(document.getElementById('root')!).render(
  <App />,
);
