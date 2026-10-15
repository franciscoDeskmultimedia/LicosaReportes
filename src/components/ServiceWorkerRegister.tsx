'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // If update is available
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW] Nueva versión de LICOSA PWA lista.');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[SW] No se pudo registrar Service Worker:', err);
        });
    }
  }, []);

  return null;
}
