import { useEffect, useState } from 'react';

// Store the deferred install prompt globally
let deferredPrompt: any = null;
const listeners = new Set<() => void>();

// Capture beforeinstallprompt immediately at top-level
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent mini-infobar from appearing automatically on mobile
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

// Register Service Worker
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('New app version available.');
                  } else {
                    console.log('App is cached for offline use.');
                  }
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    });
  }
}

// Custom hook to detect PWA installability and trigger install prompt
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const updateState = () => {
      setCanInstall(!!deferredPrompt);
    };

    updateState();
    listeners.add(updateState);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      listeners.delete(updateState);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setCanInstall(false);
      return outcome === 'accepted';
    } catch {
      return false;
    }
  };

  return { canInstall, isInstalled, promptInstall };
}
