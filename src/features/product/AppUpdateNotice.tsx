import { useEffect, useState } from 'react';
import { message } from './shared';
export function AppUpdateNotice() {
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const check = () => {
      if (active) setWaiting(Boolean(registration?.waiting));
    };
    const observe = () => {
      installing?.removeEventListener('statechange', check);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', check);
      check();
    };
    void navigator.serviceWorker
      .getRegistration()
      .then((value) => {
        if (!active || !value) return;
        registration = value;
        registration.addEventListener('updatefound', observe);
        observe();
      })
      .catch((failure: unknown) => {
        if (active) setError(message(failure));
      });
    return () => {
      active = false;
      registration?.removeEventListener('updatefound', observe);
      installing?.removeEventListener('statechange', check);
    };
  }, []);
  if (error)
    return (
      <p role="status">
        Application update status unavailable: {error}. Keep site data; do not
        clear storage to update.
      </p>
    );
  return waiting ? (
    <p className="notice-strip" role="status" data-testid="app-update-waiting">
      An application update is downloaded. Save your work, close all EntryLoop
      tabs and app windows, then reopen this same workspace URL. Do not clear
      site data or replace keys.
    </p>
  ) : null;
}
