import { scannerProfile } from '../check-in/persistence/database';
import { readExisting, readRequest } from './schema';
export const DB_PREFIX = 'entryloop-v1-';
export async function existingProfiles(
  factory: IDBFactory = indexedDB,
): Promise<string[]> {
  if (!factory?.databases)
    throw new Error(
      'This browser cannot list existing workspaces. Open the exact bookmarked URL with its scanner profile; do not create a replacement workspace to recover missing data.',
    );
  return (await factory.databases())
    .flatMap((db) => {
      const profile = db.name?.startsWith(DB_PREFIX)
        ? db.name.slice(DB_PREFIX.length)
        : '';
      return /^[a-zA-Z0-9_-]{1,32}$/.test(profile) ? [profile] : [];
    })
    .sort();
}
export function launchProfile(
  search: string,
  profiles: readonly string[],
): string | null {
  const params = new URLSearchParams(search);
  if (params.has('scanner')) return scannerProfile(search);
  return profiles.length === 1 ? profiles[0]! : null;
}
export function workspaceUrl(
  path: string,
  profile: string,
  search = '',
): string {
  scannerProfile('?scanner=' + encodeURIComponent(profile));
  const params = new URLSearchParams(search);
  params.set('scanner', profile);
  return path + '?' + params.toString();
}
export async function workspaceInventory(factory: IDBFactory = indexedDB) {
  const profiles = await existingProfiles(factory);
  return Promise.all(
    profiles.map(async (profile) => {
      const name = DB_PREFIX + profile;
      const snapshot = await readExisting(
        name,
        async (db, tx) => {
          const counts = Promise.all(
            Array.from(db.objectStoreNames).map(
              async (store) =>
                [
                  store,
                  await readRequest(tx.objectStore(store).count()),
                ] as const,
            ),
          );
          const eventIds = db.objectStoreNames.contains('events')
            ? readRequest(tx.objectStore('events').getAllKeys())
            : Promise.resolve([]);
          const keyIds = db.objectStoreNames.contains('signingKeys')
            ? readRequest(tx.objectStore('signingKeys').getAllKeys())
            : Promise.resolve([]);
          return {
            version: db.version,
            counts: Object.fromEntries(await counts),
            eventIds: await eventIds,
            signingKeyEventIds: await keyIds,
          };
        },
        factory,
      );
      return { profile, name, snapshot };
    }),
  );
}
