import { useEffect, useState } from 'react';

// Store global PWA state
let deferredPrompt: any = null;
let waitingWorker: ServiceWorker | null = null;
let isUpdateAvailableGlobal = false;
let swRegistration: ServiceWorkerRegistration | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

// Capture beforeinstallprompt immediately at script evaluation time
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default mini-infobar and save prompt
    e.preventDefault();
    deferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

// Register Service Worker with robust version update detection
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  let refreshing = false;

  // When the active service worker changes (after skipWaiting), reload page once to load new assets
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        swRegistration = reg;

        // Check if there is already a waiting worker
        if (reg.waiting) {
          waitingWorker = reg.waiting;
          isUpdateAvailableGlobal = true;
          notifyListeners();
        }

        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new version has been downloaded and is ready to activate!
              waitingWorker = newWorker;
              isUpdateAvailableGlobal = true;
              notifyListeners();
            }
          });
        });

        // Proactive update checks:
        // 1. Check immediately after registration
        reg.update().catch(() => {});

        // 2. Check periodically every 10 minutes
        setInterval(() => {
          reg.update().catch(() => {});
        }, 10 * 60 * 1000);

        // 3. Check whenever the user switches back to the app/tab
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });

        window.addEventListener('focus', () => {
          reg.update().catch(() => {});
        });
      })
      .catch((err) => {
        console.warn('Service worker registration error:', err);
      });
  });
}

// Function to activate the waiting service worker immediately
export function applyAppUpdate() {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    // If no worker is waiting but user wants to refresh, reload
    window.location.reload();
  }
}

// Custom hook to detect PWA installation state and auto-update availability
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(isUpdateAvailableGlobal);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    const updateState = () => {
      setCanInstall(!!deferredPrompt);
      setIsUpdateAvailable(isUpdateAvailableGlobal);
    };

    updateState();
    listeners.add(updateState);

    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      listeners.delete(updateState);
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

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

  return {
    canInstall,
    isInstalled,
    isUpdateAvailable,
    promptInstall,
    updateApp: applyAppUpdate,
    appVersion: '3.3.0',
  };
}
