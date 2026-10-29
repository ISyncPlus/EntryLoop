import { expect, type Page } from '@playwright/test';
import { SCHEMAS } from '../src/features/storage/schema';
export const base = 'http://127.0.0.1:4173';
export async function cacheApp(page: Page, url = base + '/?scanner=organizer') {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
}
export async function createIssued(
  page: Page,
  profile = 'organizer',
  origin = base,
) {
  await page.goto(origin + `/events/new?scanner=${profile}`);
  await page
    .getByLabel('Event name', { exact: true })
    .fill('Persistence acceptance');
  await page.getByLabel('Event date', { exact: true }).fill('2026-11-12');
  await page
    .getByLabel('Location', { exact: true })
    .fill('Synthetic reliability lab');
  await page.getByRole('button', { name: 'Create event', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Persistence acceptance', exact: true }),
  ).toBeVisible();
  const id = page.url().match(/\/events\/([a-f0-9-]{36})/)![1]!;
  await page.getByText('Import from CSV', { exact: true }).click();
  await page.getByLabel('Choose attendee CSV').setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'name,email\nTest One,one@example.com\nTest Two,two@example.com\nTest Three,three@example.com',
    ),
  });
  await page
    .getByRole('button', { name: 'Import validated attendees' })
    .click();
  await expect(page.getByTestId('attendee-count')).toHaveText('3');
  await page
    .getByRole('button', { name: 'Issue all unissued tickets' })
    .click();
  await expect(page.getByTestId('issued-count')).toHaveText('3');
  return id;
}
export async function authorizeOwn(page: Page) {
  await page.getByRole('tab', { name: 'Scanner devices', exact: true }).click();
  await page
    .getByRole('button', { name: 'Authorize this device', exact: true })
    .click();
  await expect(page.getByTestId('authorization-status')).toHaveText(
    'Authorized for this event',
  );
}
export async function nativeSnapshot(page: Page, profile = 'organizer') {
  return page.evaluate(async (profile) => {
    const name = 'entryloop-v1-' + profile,
      meta = (await indexedDB.databases()).find((d) => d.name === name);
    if (!meta) throw new Error('Expected test database missing: ' + name);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(name, meta.version);
      r.onupgradeneeded = () => {
        r.transaction!.abort();
        reject(new Error('Inspection would upgrade'));
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      const names = Array.from(db.objectStoreNames),
        tx = db.transaction(names, 'readonly');
      const read = <T>(r: IDBRequest<T>) =>
        new Promise<T>((resolve, reject) => {
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
      const counts = Promise.all(
        names.map(
          async (name) =>
            [name, await read(tx.objectStore(name).count())] as const,
        ),
      );
      const events = names.includes('events')
        ? read(
            tx.objectStore('events').getAll() as IDBRequest<
              {
                id: string;
                name: string;
                role: string;
                revision: number;
                description: string;
                publicKey: JsonWebKey;
                fingerprint: string;
              }[]
            >,
          )
        : Promise.resolve([]);
      const keys = names.includes('signingKeys')
        ? read(
            tx.objectStore('signingKeys').getAll() as IDBRequest<
              { eventId: string; privateKey: CryptoKey }[]
            >,
          )
        : Promise.resolve([]);
      const scannerKeys = names.includes('scannerKeys')
        ? read(
            tx.objectStore('scannerKeys').getAll() as IDBRequest<
              { id: string; scannerId: string; privateKey: CryptoKey }[]
            >,
          )
        : Promise.resolve([]);
      const rows = Object.fromEntries(
        await Promise.all(
          names
            .filter(
              (n) => !['signingKeys', 'scannerKeys', 'events'].includes(n),
            )
            .map(async (n) => [n, await read(tx.objectStore(n).getAll())]),
        ),
      );
      const [eventRows, keyRows, scannerRows] = await Promise.all([
        events,
        keys,
        scannerKeys,
      ]);
      const keyChecks = [];
      for (const key of keyRows) {
        const event = eventRows.find((e) => e.id === key.eventId);
        let matches = false;
        if (event) {
          const publicKey = await crypto.subtle.importKey(
            'jwk',
            event.publicKey,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify'],
          );
          const message = new TextEncoder().encode(
            'ENTRYLOOP:RELIABILITY-TEST:1\n' + event.id,
          );
          const signature = await crypto.subtle.sign(
            { name: 'ECDSA', hash: 'SHA-256' },
            key.privateKey,
            message,
          );
          matches = await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            publicKey,
            signature,
            message,
          );
        }
        keyChecks.push({
          eventId: key.eventId,
          extractable: key.privateKey.extractable,
          type: key.privateKey.type,
          matches,
        });
      }
      return {
        name,
        version: db.version,
        counts: Object.fromEntries(await counts),
        events: eventRows,
        keys: keyChecks,
        scanners: scannerRows.map((row) => ({
          id: row.id,
          scannerId: row.scannerId,
          extractable: row.privateKey.extractable,
        })),
        rows,
      };
    } finally {
      db.close();
    }
  }, profile);
}
export async function seedHistorical(
  page: Page,
  profile: string,
  version: 10 | 20 | 30 | 40,
  missingDate = false,
) {
  const schema = Object.assign(
    {},
    ...SCHEMAS.filter(([v]) => v <= Math.min(version, 30) / 10).map(
      ([, schema]) => schema,
    ),
  ) as Record<string, string>;
  if (missingDate) schema.events = 'id,role';
  return page.evaluate(
    async ({ profile, version, schema }) => {
      const eventId = crypto.randomUUID(),
        scannerId = crypto.randomUUID(),
        operationId = crypto.randomUUID();
      const recordedAt = '2026-10-27T00:00:00.000Z';
      const record = {
        operationId,
        eventId: version === 10 ? 'launchpad-lab' : eventId,
        ticketId: version === 10 ? 'TEST-001' : 'T-LEGACY-01',
        scannerId,
        recordedAt,
      };
      const pair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign', 'verify'],
      );
      const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey),
        publicKey = { kty: jwk.kty!, crv: jwk.crv!, x: jwk.x!, y: jwk.y! };
      const fingerprint = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(publicKey)),
          ),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
      const event = {
        id: eventId,
        name: 'Historical organizer',
        date: '2026-11-12',
        location: 'Fixture lab',
        description: 'Preserve this',
        revision: 2,
        publicKey,
        fingerprint,
        role: 'organizer',
        locked: true,
      };
      const signature = new Uint8Array(
        await crypto.subtle.sign(
          { name: 'ECDSA', hash: 'SHA-256' },
          pair.privateKey,
          new TextEncoder().encode(
            'ENTRYLOOP:TICKET:1\n' +
              JSON.stringify({ e: eventId, t: record.ticketId }),
          ),
        ),
      );
      const payload = JSON.stringify({
        k: 'ELT',
        v: 1,
        e: eventId,
        t: record.ticketId,
        s: btoa(String.fromCharCode(...signature))
          .replaceAll('+', '-')
          .replaceAll('/', '_')
          .replace(/=+$/, ''),
      });
      const attendeeId = crypto.randomUUID();
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('entryloop-v1-' + profile, version);
        request.onupgradeneeded = () => {
          const db = request.result;
          const path = (spec: string) =>
            spec.startsWith('[') ? spec.slice(1, -1).split('+') : spec;
          for (const [name, spec] of Object.entries(schema)) {
            const [primary = '', ...indexes] = spec.split(',');
            const store = db.createObjectStore(name, {
              keyPath: path(primary),
            });
            for (const index of indexes) {
              const name = index.replace(/^&/, '');
              store.createIndex(name, path(name), {
                unique: index.startsWith('&'),
              });
            }
          }
          const tx = request.transaction!;
          tx.objectStore('operations').add(record);
          tx.objectStore('devices').add({
            id: scannerId,
            label: 'Historical scanner',
          });
          if (version >= 20) {
            tx.objectStore('events').add(event);
            tx.objectStore('signingKeys').add({
              eventId,
              privateKey: pair.privateKey,
            });
            tx.objectStore('attendees').add({
              id: attendeeId,
              eventId,
              ticketId: record.ticketId,
              name: 'Fixture Guest',
              email: 'fixture@example.com',
            });
            tx.objectStore('issuedTickets').add({
              eventId,
              ticketId: record.ticketId,
              attendeeId,
              payload,
              issuedAt: recordedAt,
            });
            tx.objectStore('ticketCatalog').add({
              eventId,
              ticketId: record.ticketId,
            });
          }
        };
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
      return { eventId, scannerId, record, payload };
    },
    { profile, version, schema },
  );
}
