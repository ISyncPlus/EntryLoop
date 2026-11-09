import { useEffect, useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { EventList } from './EventList';
import { EventForm } from './EventForm';
import { EventDetail } from './EventDetail';
import { ScanPage } from './ScanPage';
import { href, message } from './shared';
import { StorageFailure } from './StorageFailure';
import { WorkspaceStorage } from './WorkspaceStorage';
import { BUILD_ID } from '../storage/build';
import { Icon } from './ProductUI';
import { AppUpdateNotice } from './AppUpdateNotice';
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
    let invalidated = false;
    const unavailable = (reason: string) => {
      if (!cancelled) {
        invalidated = true;
        setReady(false);
        setError(reason);
      }
    };
    const blocked = () =>
      unavailable(
        'Database upgrade is blocked by another tab or app window. Close other EntryLoop windows without clearing site data, then retry this same workspace.',
      );
    const versionChanged = () =>
      unavailable(
        'Another application version opened this database. This connection is closed to preserve records. Reload with a compatible current build; do not clear storage.',
      );
    const closed = () =>
      unavailable(
        'The browser closed this storage connection. Records were not intentionally reset. Retry the same workspace; if it persists, keep the data for investigation.',
      );
    db.on('blocked', blocked);
    db.on('versionchange', versionChanged);
    db.on('close', closed);
    void db
      .open()
      .then(() => {
        if (!cancelled && !invalidated) {
          setError('');
          setReady(true);
        }
      })
      .catch((failure: unknown) => unavailable(message(failure)));
    return () => {
      cancelled = true;
      db.on('blocked').unsubscribe(blocked);
      db.on('versionchange').unsubscribe(versionChanged);
      db.on('close').unsubscribe(closed);
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
            <h1>Create your event</h1>
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
    <div
      className="product-app"
      data-experience={scan ? 'staff' : 'organizer'}
      data-theme={dark ? 'dark' : 'light'}
    >
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
            <Icon name={dark ? 'sun' : 'moon'} />{' '}
            <span>{dark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>
      <div className="app-frame">
        <nav className="app-nav" aria-label="Main navigation">
          <div>
            <span className="workspace-label">Event operations</span>
            <a href={href('/')} aria-current={!scan ? 'page' : undefined}>
              <Icon name="events" /> Organizer workspace
            </a>
            <a href={href('/scan')} aria-current={scan ? 'page' : undefined}>
              <Icon name="scan" /> Event check-in
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
            <a
              href="#workspace-storage"
              onClick={() => {
                const tools = document.getElementById(
                  'workspace-storage',
                ) as HTMLDetailsElement | null;
                if (tools) tools.open = true;
              }}
            >
              <Icon name="help" /> Device & recovery help
            </a>
            <details className="advanced-nav">
              <summary>Advanced tools</summary>
              <a href={href('/dev/workbench')}>Development workbench</a>
            </details>
          </div>
        </nav>
        <main id="main-content" className="product-main">
          <AppUpdateNotice />
          <p className="workspace-context" data-testid="workspace-context">
            Saved in this browser · Workspace:{' '}
            <strong>{db.name.replace('entryloop-v1-', '')}</strong>{' '}
            <span className="context-build">
              · build <code>{BUILD_ID}</code>
            </span>
          </p>
          {error ? (
            <StorageFailure error={error} database={db.name} />
          ) : ready ? (
            <WorkspaceStorage db={db}>{page}</WorkspaceStorage>
          ) : (
            <p role="status">
              Opening this workspace without resetting stored records…
            </p>
          )}
        </main>
      </div>
      <footer className="product-footer">
        <a href={href('/welcome')}>About EntryLoop</a>
        <span>Stored on this device. No cloud backup.</span>
        <details>
          <summary>Advanced tools</summary>
          <a href={href('/dev/workbench')}>Development workbench</a>
        </details>
      </footer>
    </div>
  );
}
