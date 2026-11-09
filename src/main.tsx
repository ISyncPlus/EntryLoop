import { StrictMode } from 'react';
import { WebsiteEntry } from './features/website/WebsiteEntry';
import { createRoot } from 'react-dom/client';
import {
  EntryLoopDB,
  scannerProfile,
} from './features/check-in/persistence/database';
import { Workbench } from './features/workbench/Workbench';
import { ProductApp } from './features/product/ProductApp';
import './styles.css';
function showWebsite() {
  root.render(
    <StrictMode>
      <WebsiteEntry />
    </StrictMode>,
  );
}
const root = createRoot(document.getElementById('root')!);
import { existingProfiles, launchProfile } from './features/storage/workspaces';
import { WorkspaceLaunch } from './features/product/WorkspaceLaunch';
async function start() {
  const params = new URLSearchParams(window.location.search);
  // The public root is the brochure. Explicit workspace URLs remain operational deep links.
  if (
    window.location.pathname === '/welcome' ||
    (window.location.pathname === '/' && !params.has('scanner'))
  ) {
    showWebsite();
    return;
  }
  const setup = window.location.pathname === '/start';
  if (setup) {
    const url = new URL(window.location.href);
    url.pathname = url.searchParams.get('mode') === 'staff' ? '/scan' : '/';
    window.history.replaceState(null, '', url);
  }
  root.render(
    <main>
      <h1>Opening EntryLoop storage…</h1>
      <p role="status">
        Resolving the existing workspace before opening a database.
      </p>
    </main>,
  );
  try {
    const explicit = new URLSearchParams(window.location.search).has('scanner');
    const profiles = explicit ? [] : await existingProfiles();
    let profile = launchProfile(window.location.search, profiles);
    // Explicit website CTA may start a fresh workspace only after successful enumeration.
    if (setup && profiles.length === 0 && profile === null) profile = 'main';
    if (profile === null) {
      if (profiles.length === 0 && window.location.pathname === '/') {
        showWebsite();
        return;
      }
      root.render(<WorkspaceLaunch profiles={profiles} />);
      return;
    }
    // Keep the chosen namespace in every URL, including installed-app launches.
    const url = new URL(window.location.href);
    url.searchParams.set('scanner', scannerProfile('?scanner=' + profile));
    window.history.replaceState(null, '', url);
    const db = new EntryLoopDB(profile);
    root.render(
      <StrictMode>
        {window.location.pathname === '/dev/workbench' ? (
          <Workbench db={db} />
        ) : (
          <ProductApp db={db} />
        )}
      </StrictMode>,
    );
  } catch (failure) {
    root.render(
      <WorkspaceLaunch
        profiles={[]}
        error={
          failure instanceof Error
            ? failure.message
            : 'Workspace resolution failed. No fallback database was opened.'
        }
      />,
    );
  }
}
void start();
