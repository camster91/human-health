'use client';
import { useEffect, useState } from 'react';
import { store } from '@/lib/storage';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [storageReady, setStorageReady] = useState(true);
  useEffect(() => {
    const sync = () => { setOnline(navigator.onLine); setStorageReady(store.canPersist()); };
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const message = !storageReady
    ? 'Local saving is unavailable · do not rely on this session until browser storage is enabled'
    : online
      ? 'Online · local-first workout saving is available'
      : 'Offline · workout logging remains available on this device';
  return <div className={!storageReady ? 'connection-state storage-error' : online ? 'connection-state online' : 'connection-state offline'} role={!storageReady ? 'alert' : 'status'} aria-live="polite">{message}</div>;
}
