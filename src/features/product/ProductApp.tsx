import { useEffect, useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { EventList } from './EventList';
import { EventForm } from './EventForm';
import { EventDetail } from './EventDetail';
import { ScanPage } from './ScanPage';
import { href, message } from './shared';
import { Feedback } from './Feedback';
import './product.css';
export function ProductApp({ db }: { db: EntryLoopDB }) {
  const path = window.location.pathname;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [cached, setCached] = useState(
    Boolean(navigator.serviceWorker?.controller),
  );
  const [dark, setDark] = useState(
    new URLSearchParams(window.location.search).get('theme') === 'dark' ||
      (new URLSearchParams(window.location.search).get('theme') !== 'light' &&
        (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)),
  );
  useEffect(() => {
    let cancelled = false;
    void db
      .scanner()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((failure) => {
        if (!cancelled) setError(message(failure));
      });
    return () => {
      cancelled = true;
    };
  }, [db]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const control = () =>
      setCached(Boolean(navigator.serviceWorker?.controller));
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    navigator.serviceWorker?.addEventListener('controllerchange', control);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      navigator.serviceWorker?.removeEventListener('controllerchange', control);
    };
  }, []);
  const scan = path.startsWith('/scan');
  const eventMatch = /^\/events\/([a-f0-9-]{36})$/.exec(path);
  const scanMatch = /^\/scan\/([a-f0-9-]{36})$/.exec(path);
  let page;
  if (path === '/') page = <EventList db={db} />;
  else if (path === '/events/new')
    page = (
      <>
        <a className="back-link" href={href('/')}>
          ← All events
        </a>
        <div className="workspace-heading">
          <div>
            <h1>Set the scene.</h1>
            <p>The details guests will carry to your door.</p>
          </div>
        </div>
        <section className="create-event-sheet">
          <EventForm db={db} />
        </section>
      </>
    );
  else if (eventMatch?.[1]) page = <EventDetail db={db} id={eventMatch[1]} />;
  else if (path === '/scan') page = <EventList db={db} scanner />;
  else if (scanMatch?.[1]) page = <ScanPage db={db} id={scanMatch[1]} />;
  else
    page = (
      <>
        <h1>Page not found</h1>
        <a href={href('/')}>Back to events</a>
      </>
    );
  return (
    <div className="product-app" data-theme={dark ? 'dark' : 'light'}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-topbar">
        <a className="product-wordmark" href={href('/')}>
          EntryLoop
        </a>
        <div className="topbar-right">
          <span className="network-state">
            <i className={offline ? 'offline-dot' : ''} />
            {offline ? 'Offline' : 'Online'} · local data
          </span>
          <button
            className="theme-toggle"
            aria-label={dark ? 'Use light mode' : 'Use dark mode'}
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('theme', dark ? 'light' : 'dark');
              window.history.replaceState(null, '', url);
              setDark((value) => !value);
            }}
          >
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>
      <div className="app-frame">
        <nav className="app-nav" aria-label="Main navigation">
          <div>
            <span className="workspace-label">On this device</span>
            <a href={href('/')} aria-current={!scan ? 'page' : undefined}>
              Organizer workspace
            </a>
            <a href={href('/scan')} aria-current={scan ? 'page' : undefined}>
              Event check-in
            </a>
          </div>
          <div className="nav-bottom">
            <div className="cache-state">
              <span className={cached ? 'cache-dot ready' : 'cache-dot'} />
              <strong>
                {cached ? 'App resources cached' : 'Cache not ready'}
              </strong>
              <p>
                {cached
                  ? 'Verify a normal offline reload before event day.'
                  : 'Use the production build and wait for service-worker control.'}
              </p>
            </div>
            <span>Profile: {db.name.replace('entryloop-v1-', '')}</span>
            <a href={href('/dev/workbench')}>Development workbench</a>
          </div>
        </nav>
        <main id="main-content" className="product-main">
          <Feedback error={error} />
          {ready
            ? page
            : !error && <p role="status">Opening this device’s workspace…</p>}
        </main>
      </div>
      <footer className="product-footer">
        <span>EntryLoop · Your place in the room.</span>
        <span>Stored on this device. No cloud backup.</span>
        <a href={href('/dev/workbench')}>Development workbench</a>
      </footer>
    </div>
  );
}
