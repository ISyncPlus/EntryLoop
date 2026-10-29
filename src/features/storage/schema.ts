// Keep historical declarations intact: changing an existing version can trigger Dexie's schema repair.
export const SCHEMAS = [
  [1, { operations: '[eventId+operationId],eventId', devices: 'id' }],
  [
    2,
    {
      events: 'id,role,date',
      attendees: 'id,eventId,&[eventId+email],&[eventId+ticketId]',
      issuedTickets: '[eventId+ticketId],eventId,attendeeId',
      ticketCatalog: '[eventId+ticketId],eventId',
      signingKeys: 'eventId',
    },
  ],
  [
    3,
    {
      scannerKeys: 'id',
      policies: '[eventId+epoch],eventId',
      credentials: '[e+d],e',
      operationProofs: '[eventId+operationId],eventId',
      syncSessions: 'id,eventId,direction',
    },
  ],
] as const;
export class StorageRecoveryError extends Error {
  override name = 'StorageRecoveryError';
}
export async function readExisting<T>(
  name: string,
  inspect: (db: IDBDatabase, tx: IDBTransaction) => Promise<T>,
  factory: IDBFactory = indexedDB,
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    let missing = false;
    const request = factory.open(name);
    request.onupgradeneeded = () => {
      // Aborting a new database's versionchange rolls it back; never create/delete a DB during inspection.
      missing = true;
      request.transaction!.abort();
      request.result.close();
    };
    request.onerror = () => (missing ? resolve(null) : reject(request.error));
    request.onblocked = () =>
      reject(
        new StorageRecoveryError(
          'Storage inspection is blocked. Close other EntryLoop tabs, without clearing site data.',
        ),
      );
    request.onsuccess = () => {
      const db = request.result;
      try {
        const names = Array.from(db.objectStoreNames);
        if (!names.length) {
          db.close();
          reject(
            new StorageRecoveryError(
              'The existing database has no object stores. Do not reset it.',
            ),
          );
          return;
        }
        const tx = db.transaction(names, 'readonly');
        const done = new Promise<void>((finish, fail) => {
          tx.oncomplete = () => {
            db.close();
            finish();
          };
          tx.onabort = () => {
            db.close();
            fail(
              tx.error ?? new Error('Read-only storage inspection aborted.'),
            );
          };
        });
        void Promise.all([inspect(db, tx), done]).then(
          ([value]) => resolve(value),
          reject,
        );
      } catch (failure) {
        db.close();
        reject(failure);
      }
    };
  });
}
export function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function keyPath(spec: string): string | string[] {
  return spec.startsWith('[') ? spec.slice(1, -1).split('+') : spec;
}
export async function assertCompatibleSchema(
  name: string,
  factory: IDBFactory = indexedDB,
): Promise<void> {
  await readExisting(
    name,
    async (db, tx) => {
      const version = db.version / 10;
      if (![1, 2, 3].includes(version))
        throw new StorageRecoveryError(
          `Unsupported database version ${db.version} (native IndexedDB). This build supports Dexie versions 1–3 (native 10–30). Keep this data and use a compatible build.`,
        );
      const expected = Object.assign(
        {},
        ...SCHEMAS.filter(([v]) => v <= version).map(([, schema]) => schema),
      ) as Record<string, string>;
      const actualNames = Array.from(db.objectStoreNames).sort();
      if (
        JSON.stringify(actualNames) !==
        JSON.stringify(Object.keys(expected).sort())
      )
        throw new StorageRecoveryError(
          'Stored schema does not match its declared version. Automatic repair is blocked; preserve this database for recovery.',
        );
      for (const [table, spec] of Object.entries(expected)) {
        const [primary = '', ...indexes] = spec.split(',');
        const store = tx.objectStore(table);
        const expectedNames = indexes
          .map((index) => index.replace(/^&/, ''))
          .sort();
        if (
          store.autoIncrement ||
          JSON.stringify(store.keyPath) !== JSON.stringify(keyPath(primary)) ||
          JSON.stringify(Array.from(store.indexNames).sort()) !==
            JSON.stringify(expectedNames)
        )
          throw new StorageRecoveryError(
            `Unexpected schema for ${table}. No repair or reset was attempted.`,
          );
        for (const indexSpec of indexes) {
          const indexName = indexSpec.replace(/^&/, '');
          const index = store.index(indexName);
          if (
            index.unique !== indexSpec.startsWith('&') ||
            index.multiEntry ||
            JSON.stringify(index.keyPath) !== JSON.stringify(keyPath(indexName))
          )
            throw new StorageRecoveryError(
              `Unexpected index in ${table}. Preserve this database and use recovery guidance.`,
            );
        }
      }
    },
    factory,
  );
}
