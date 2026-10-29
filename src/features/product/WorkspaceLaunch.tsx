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
  return (
    <main>
      <h1>Choose this browser’s workspace</h1>
      {error && <p role="alert">{error}</p>}
      <p>
        EntryLoop stores each workspace separately on this browser and origin.
        Changing a profile name does not move events or keys. An installed app
        may use a different storage partition.
      </p>
      <p>
        Origin: <code>{window.location.origin}</code> · Build:{' '}
        <code>{BUILD_ID}</code>
      </p>
      {profiles.length > 0 ? (
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
          No existing workspace was detected here. If you expected an event,
          first return to its original browser/profile and exact origin; this
          does not prove it was deleted. Do not create a replacement to recover
          it.
        </p>
      )}
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
        This opens or creates only the explicitly named local workspace. It does
        not restore an absent organizer key.
      </p>
    </main>
  );
}
