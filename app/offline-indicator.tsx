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
  if (!storageReady) {
    return <div className="connection-state storage-error" role="alert" aria-live="polite">Local saving unavailable — enable browser storage</div>;
  }
  if (!online) {
    return <div className="connection-state offline" role="status" aria-live="polite">Offline — workout logging remains available</div>;
  }
  return null;
}
