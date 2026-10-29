import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  base,
  cacheApp,
  createIssued,
  nativeSnapshot,
  seedHistorical,
  authorizeOwn,
} from './reliability-helpers';

test('normal navigation, reloads and concurrent tabs preserve the same organizer namespace and records', async ({
  context,
  page,
}) => {
  await cacheApp(page);
  const id = await createIssued(page);
  await page.reload();
  await expect(page.getByTestId('attendee-count')).toHaveText('3');
  const before = await nativeSnapshot(page);
  expect(before.counts.devices).toBe(0);
  expect(before.keys[0]).toMatchObject({ extractable: false, matches: true });
  for (const name of [
    'Organizer workspace',
    'Event check-in',
    'Organizer workspace',
  ]) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByTestId('workspace-context')).toContainText(
      'organizer',
    );
    expect(page.url()).toContain('scanner=organizer');
  }
  await page
    .getByRole('heading', { name: 'Persistence acceptance', exact: true })
    .click();
  const other = await context.newPage();
  await other.goto(base + `/events/${id}?scanner=organizer`);
  await expect(other.getByTestId('issued-count')).toHaveText('3');
  for (const p of [page, other]) {
    await p.getByRole('tab', { name: 'Event details', exact: true }).click();
    await p
      .getByRole('textbox', { name: 'Description', exact: true })
      .fill(p === page ? 'Draft A' : 'Draft B');
  }
  await Promise.all([
    page.getByRole('button', { name: 'Save event', exact: true }).click(),
    other.getByRole('button', { name: 'Save event', exact: true }).click(),
  ]);
  await expect
    .poll(
      async () =>
        Number(await page.getByRole('alert').count()) +
        Number(await other.getByRole('alert').count()),
    )
    .toBe(1);
  expect((await nativeSnapshot(page)).counts).toEqual(before.counts);
  await page.goto(base + '/dev/workbench?scanner=organizer');
  await page.getByRole('link', { name: 'EntryLoop', exact: true }).click();
  expect(page.url()).toContain('scanner=organizer');
  await expect(
    page.getByRole('heading', { name: 'Persistence acceptance', exact: true }),
  ).toBeVisible();
});

test('profile changes are explicit, bare installed-app launch chooses existing storage, and browser contexts stay isolated', async ({
  browser,
  page,
}) => {
  await cacheApp(page, base + '/?scanner=main');
  await createIssued(page, 'main');
  await page.goto(base + '/');
  await expect(page).toHaveURL(/scanner=main/);
  await expect(
    page.getByRole('heading', { name: 'Persistence acceptance', exact: true }),
  ).toBeVisible();
  await page.goto(base + '/?scanner=organizer');
  await expect(
    page.getByText('No organizer events in this workspace.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Find other workspaces in this browser' })
    .click();
  await expect(page.getByTestId('workspace-inventory')).toContainText('main');
  expect((await nativeSnapshot(page, 'main')).counts.events).toBe(1);
  expect((await nativeSnapshot(page)).counts.events).toBe(0);
  await page.goto(base + '/');
  await expect(
    page.getByRole('heading', { name: 'Choose this browser’s workspace' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Open workspace main', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Persistence acceptance', exact: true }),
  ).toBeVisible();
  const separate = await browser.newContext();
  try {
    const isolated = await separate.newPage();
    await isolated.goto(base + '/?scanner=main');
    await expect(
      isolated.getByText('No organizer events in this workspace.', {
        exact: true,
      }),
    ).toBeVisible();
    expect((await nativeSnapshot(isolated, 'main')).counts.events).toBe(0);
  } finally {
    await separate.close();
  }
});

test('issued tickets, organizer/scanner keys, credentials and offline admissions survive a browser-process restart', async ({
  playwright,
  browserName,
}, info) => {
  const directory = info.outputPath('organizer-persistent');
  let context = await playwright[browserName].launchPersistentContext(
    directory,
    { headless: true },
  );
  let page = await context.newPage();
  try {
    await cacheApp(page);
    const id = await createIssued(page);
    await authorizeOwn(page);
    const before = await nativeSnapshot(page);
    expect(before.counts.credentials).toBe(1);
    expect(before.scanners[0]?.extractable).toBe(false);
    await context.close();
    context = await playwright[browserName].launchPersistentContext(directory, {
      headless: true,
      offline: true,
    });
    page = await context.newPage();
    await page.goto(base + `/events/${id}?scanner=organizer`);
    await expect(page.getByTestId('issued-count')).toHaveText('3');
    const after = await nativeSnapshot(page);
    expect(after).toEqual(before);
    await page
      .getByRole('link', { name: 'Open check-in', exact: true })
      .click();
    await page
      .getByText('Use an image or payload instead', { exact: true })
      .click();
    await page
      .getByLabel('Signed ticket payload')
      .fill((after.rows.issuedTickets as { payload: string }[])[0]!.payload);
    await page.getByRole('button', { name: 'Verify and admit ticket' }).click();
    await expect(page.getByTestId('real-operations')).toHaveText('1');
    await page.reload();
    await expect(page.getByTestId('real-operations')).toHaveText('1');
    await context.setOffline(false);
    await page.reload();
    await expect(page.getByTestId('real-operations')).toHaveText('1');
    expect((await nativeSnapshot(page)).keys).toEqual(before.keys);
    expect((await nativeSnapshot(page)).scanners).toEqual(before.scanners);
  } finally {
    await context.close();
  }
});

for (const version of [10, 20] as const)
  test(`actual IndexedDB native version ${version} upgrades preserve historical keys and operation evidence`, async ({
    page,
  }) => {
    await page.goto(base + '/');
    await expect(
      page.getByRole('heading', { name: 'Choose this browser’s workspace' }),
    ).toBeVisible();
    const profile = 'migration',
      fixture = await seedHistorical(page, profile, version),
      before = await nativeSnapshot(page, profile);
    await page.goto(base + '/?scanner=' + profile);
    await expect(page.getByTestId('workspace-context')).toContainText(profile);
    if (version === 20)
      await expect(
        page.getByRole('heading', {
          name: 'Historical organizer',
          exact: true,
        }),
      ).toBeVisible();
    else
      await expect(
        page.getByText('No organizer events in this workspace.', {
          exact: true,
        }),
      ).toBeVisible();
    const after = await nativeSnapshot(page, profile);
    expect(after.version).toBe(30);
    expect(after.rows.operations).toEqual([fixture.record]);
    expect(after.rows.devices).toEqual(before.rows.devices);
    expect(after.keys).toEqual(before.keys);
    expect(after.rows.issuedTickets ?? []).toEqual(
      before.rows.issuedTickets ?? [],
    );
    expect(after.counts.scannerKeys).toBe(0);
  });

for (const kind of ['future', 'missing-index'] as const)
  test(`incompatible ${kind} schema stops without reset, downgrade or automatic repair`, async ({
    page,
  }) => {
    await page.goto(base + '/');
    await expect(
      page.getByRole('heading', { name: 'Choose this browser’s workspace' }),
    ).toBeVisible();
    await seedHistorical(
      page,
      'guarded',
      kind === 'future' ? 40 : 30,
      kind === 'missing-index',
    );
    const before = await nativeSnapshot(page, 'guarded');
    await page.goto(base + '/?scanner=guarded');
    await expect(page.getByTestId('storage-error')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      kind === 'future' ? 'Unsupported database version' : 'Unexpected schema',
    );
    await expect(page.getByText('Create your first event')).not.toBeVisible();
    expect(await nativeSnapshot(page, 'guarded')).toEqual(before);
  });

test('unexpected storage read failure is actionable and never an empty organizer screen', async ({
  context,
  page,
}) => {
  await cacheApp(page);
  await createIssued(page);
  const before = await nativeSnapshot(page);
  const broken = await context.newPage();
  await broken.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<IDBDatabase['transaction']>
    ) {
      if (
        args[1] === 'readonly' &&
        Array.from(typeof args[0] === 'string' ? [args[0]] : args[0]).includes(
          'events',
        )
      )
        throw new DOMException(
          'Synthetic storage read failure',
          'UnknownError',
        );
      return original.apply(this, args);
    };
  });
  await broken.goto(base + '/?scanner=organizer');
  await expect(broken.getByRole('alert')).toContainText(
    'Synthetic storage read failure',
  );
  await expect(
    broken.getByText('No organizer events in this workspace.', { exact: true }),
  ).toHaveCount(0);
  await expect(
    broken.getByRole('link', { name: 'Create an event in this workspace' }),
  ).toHaveCount(0);
  expect(await nativeSnapshot(page)).toEqual(before);
});

test('transaction failure rolls back event/key/policy writes and leaves an actionable retry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      ...args: Parameters<IDBObjectStore['add']>
    ) {
      if (this.name === 'policies')
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.goto(base + '/events/new?scanner=organizer');
  await page.getByLabel('Event name', { exact: true }).fill('Must rollback');
  await page.getByLabel('Event date', { exact: true }).fill('2026-11-12');
  await page.getByLabel('Location', { exact: true }).fill('Test lab');
  await page.getByRole('button', { name: 'Create event', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Synthetic quota failure',
  );
  const snapshot = await nativeSnapshot(page);
  expect(snapshot.counts.events).toBe(0);
  expect(snapshot.counts.signingKeys).toBe(0);
  expect(snapshot.counts.policies).toBe(0);
  expect(snapshot.counts.devices).toBe(0);
});

test('orphaned data triggers recovery review and key-free backup instead of first-event guidance', async ({
  page,
}) => {
  await cacheApp(page);
  const id = await createIssued(page);
  await page.evaluate(async (id) => {
    const request = indexedDB.open('entryloop-v1-organizer');
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      tx.objectStore('events').delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, id);
  await page.reload();
  await expect(page.getByTestId('recovery-required')).toBeVisible();
  await expect(
    page.getByText('No organizer events in this workspace.', { exact: true }),
  ).toHaveCount(0);
  const waiting = page.waitForEvent('download');
  await page
    .getByRole('button', {
      name: 'Download recoverable records (no keys)',
      exact: true,
    })
    .click();
  const download = await waiting;
  const text = await readFile((await download.path())!, 'utf8');
  const backup = JSON.parse(text) as {
    tables: Record<string, unknown[]>;
    restoresSigningAuthority: boolean;
  };
  expect(backup.tables.attendees).toHaveLength(3);
  expect(backup.tables.issuedTickets).toHaveLength(3);
  expect(backup.tables.signingKeys).toBeUndefined();
  expect(backup.restoresSigningAuthority).toBe(false);
  expect(text).not.toContain('privateKey');
  expect((await nativeSnapshot(page)).counts.signingKeys).toBe(1);
});

test('a concurrent database version change reports recovery instead of quietly reopening fresh storage', async ({
  context,
  page,
}) => {
  await cacheApp(page);
  await createIssued(page);
  const before = await nativeSnapshot(page);
  const other = await context.newPage();
  await other.goto(base + '/?scanner=organizer');
  await expect(
    other.getByRole('heading', { name: 'Persistence acceptance', exact: true }),
  ).toBeVisible();
  await other.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('entryloop-v1-organizer', 40);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });
  await expect(page.getByTestId('storage-error')).toBeVisible();
  await expect(
    page.getByText('No organizer events in this workspace.', { exact: true }),
  ).toHaveCount(0);
  const after = await nativeSnapshot(other);
  expect(after.events).toEqual(before.events);
  expect(after.keys).toEqual(before.keys);
  expect(after.version).toBe(40);
});

test('authorization panels retain readable foreground/background contrast in both themes', async ({
  page,
}, info) => {
  await cacheApp(page);
  const id = await createIssued(page);
  for (const theme of ['light', 'dark']) {
    await page.goto(base + `/events/${id}?scanner=organizer&theme=${theme}`);
    await page
      .getByRole('tab', { name: 'Scanner devices', exact: true })
      .click();
    const panel = page.getByRole('region', {
      name: 'Scanner authorization',
      exact: true,
    });
    const ratios = await panel.evaluate((el) => {
      const rgb = (value: string) =>
        value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const luminance = (color: number[]) =>
        color
          .map((c) => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      const background = luminance(rgb(getComputedStyle(el).backgroundColor));
      return Array.from(el.querySelectorAll('h2,p,label,button'))
        .filter((node) => getComputedStyle(node).display !== 'none')
        .map((node) => {
          const color = luminance(rgb(getComputedStyle(node).color));
          let bg = background;
          const own = getComputedStyle(node).backgroundColor;
          if (!own.endsWith(', 0)') && own !== 'rgba(0, 0, 0, 0)')
            bg = luminance(rgb(own));
          return (Math.max(color, bg) + 0.05) / (Math.min(color, bg) + 0.05);
        });
    });
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({
      path: info.outputPath(`authorization-${theme}.png`),
      fullPage: true,
    });
  }
});

test('scanner-only packages are explained without hiding the stored event or granting organizer authority', async ({
  page,
}) => {
  await cacheApp(page);
  await createIssued(page);
  await page.getByRole('tab', { name: 'Scanner devices', exact: true }).click();
  const fingerprint = (await page
    .getByTestId('organizer-fingerprint')
    .textContent())!;
  const waiting = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download scanner package', exact: true })
    .click();
  const file = await readFile((await (await waiting).path())!);
  await page.goto(base + '/scan?scanner=gate');
  await page.getByLabel('Choose event package').setInputFiles({
    name: 'package.json',
    mimeType: 'application/json',
    buffer: file,
  });
  await page
    .getByLabel('Organizer fingerprint', { exact: true })
    .fill(fingerprint);
  await page
    .getByRole('button', { name: 'Trust key and prepare device' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Welcome them in.' }),
  ).toBeVisible();
  await page.goto(base + '/?scanner=gate');
  await expect(
    page.getByText('No organizer events in this workspace.', { exact: true }),
  ).toBeVisible();
  const snapshot = await nativeSnapshot(page, 'gate');
  expect(snapshot.counts.events).toBe(1);
  expect(snapshot.counts.signingKeys).toBe(0);
  expect(snapshot.events[0]?.role).toBe('scanner');
  await expect(page.getByTestId('recovery-required')).toHaveCount(0);
});
