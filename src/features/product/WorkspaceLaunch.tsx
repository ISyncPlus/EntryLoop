import { useState } from 'react';
import { workspaceUrl } from '../storage/workspaces';
import { BUILD_ID } from '../storage/build';
export function WorkspaceLaunch({
  profiles,
  error = '',
}: {
  profiles: readonly string[];
  error?: string;
}) {
  const [name, setName] = useState('main');
  const fresh = !profiles.length && !error;
  const theme = new URLSearchParams(window.location.search).get('theme');
  const dark =
    theme === 'dark' ||
    (theme !== 'light' &&
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false));
  return (
    <div className="product-app" data-theme={dark ? 'dark' : 'light'}>
      <main className="launch-card">
        <span className="product-wordmark">EntryLoop</span>
        <h1>
          {fresh
            ? 'Bring your event together.'
            : 'Choose this browser’s workspace'}
        </h1>
        {fresh ? (
          <>
            <p>
              Prepare your event, welcome guests and exchange entrance records.
              Keep working when the network doesn’t.
            </p>
            <section
              className="launch-choices"
              aria-label="Start using EntryLoop"
            >
              <h2>How will you use this device?</h2>
              <p>
                Organize on your computer, or prepare a phone for the entrance.
                Both keep data in this browser.
              </p>
              <a
                className="button primary"
                href={workspaceUrl('/', 'main', window.location.search)}
              >
                Organize an event
              </a>
              <a
                className="button"
                href={workspaceUrl('/scan', 'main', window.location.search)}
              >
                Prepare an entrance phone
              </a>
            </section>
            <p>
              Expecting an existing event? Return to its original browser and
              address before making a replacement. No saved workspace was
              detected here; that does not prove your event was deleted.
            </p>
            <p className="fine-print">
              Choosing a view does not approve a scanner. The organizer must
              explicitly authorize each entrance phone.
            </p>
          </>
        ) : (
          <>
            {error && <p role="alert">{error}</p>}
            <p>
              EntryLoop stores each workspace separately on this browser and
              origin. Changing a profile name does not move events or keys. An
              installed app may use a different storage partition.
            </p>
            {profiles.length ? (
              <ul>
                {profiles.map((profile) => (
                  <li key={profile}>
                    <a
                      href={workspaceUrl(
                        window.location.pathname,
                        profile,
                        window.location.search,
                      )}
                    >
                      Open workspace {profile}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Existing workspaces could not be inspected. No conclusion about
                stored events is available. Open the exact original workspace
                URL without clearing data.
              </p>
            )}
          </>
        )}
        <details>
          <summary>Advanced workspace controls</summary>
          <p>
            Origin: <code>{window.location.origin}</code> · Build:{' '}
            <code>{BUILD_ID}</code>
          </p>
          <p>
            Each named workspace is separate local storage. These controls do
            not recover absent events or signing keys. Keep the original browser
            and exact address.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (/^[a-zA-Z0-9_-]{1,32}$/.test(name))
                window.location.assign(
                  workspaceUrl(
                    window.location.pathname,
                    name,
                    window.location.search,
                  ),
                );
            }}
          >
            <label>
              Workspace name
              <input
                required
                pattern="[a-zA-Z0-9_-]{1,32}"
                maxLength={32}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button>Open named workspace</button>
          </form>
          <p>
            This opens or creates only the explicitly named local workspace. It
            does not restore an absent organizer key.
          </p>
        </details>
      </main>
    </div>
  );
}
