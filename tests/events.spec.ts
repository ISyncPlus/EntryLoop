import {
  test,
  expect,
  type Page,
  type Download,
  type Locator,
} from '@playwright/test';
import { readFile } from 'node:fs/promises';
import QRCode from 'qrcode';
const base = 'http://127.0.0.1:4173';
async function cached(page: Page, path = '/?scanner=organizer') {
  await page.goto(base + path);
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
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
async function create(
  page: Page,
  name = 'Signal Assembly',
  profile = 'organizer',
) {
  await page.goto(base + `/events/new?scanner=${profile}`);
  await page.getByLabel('Event name', { exact: true }).fill(name);
  await page.getByLabel('Event date', { exact: true }).fill('2026-11-12');
  await page
    .getByLabel('Location', { exact: true })
    .fill('The Assembly, Lagos');
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('A gathering for people who make things.');
  await page.getByRole('button', { name: 'Create event', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  return page.url().match(/\/events\/([a-f0-9-]{36})/)![1]!;
}
async function manual(
  page: Page,
  name = 'Amina Bello',
  email = 'amina@example.com',
) {
  if (
    (await page
      .locator('details')
      .filter({ hasText: 'Add an attendee' })
      .getAttribute('open')) === null
  )
    await page.getByText('Add an attendee', { exact: true }).click();
  await page.getByLabel('Full name', { exact: true }).fill(name);
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Add attendee', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('1 attendee added');
}
async function issue(page: Page) {
  await page
    .getByRole('button', { name: 'Issue all unissued tickets' })
    .click();
  await expect(page.getByRole('status')).toContainText('tickets issued');
}
async function downloaded(download: Download): Promise<Buffer> {
  return readFile((await download.path())!);
}
async function packageFor(page: Page) {
  await page.getByRole('tab', { name: 'Scanner devices' }).click();
  const fingerprint = (await page
    .getByTestId('organizer-fingerprint')
    .textContent())!;
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download scanner package' }).click();
  return { file: await downloaded(await waiting), fingerprint };
}
async function provision(
  page: Page,
  file: Buffer,
  fingerprint: string,
  profile: string,
  organizer: Page,
) {
  await cached(page, `/scan?scanner=${profile}`);
  await page.context().setOffline(true);
  await page.getByLabel('Choose event package').setInputFiles({
    name: 'event.json',
    mimeType: 'application/json',
    buffer: file,
  });
  await page
    .getByLabel('Organizer fingerprint', { exact: true })
    .fill(fingerprint, { timeout: 10000 });
  await page
    .getByRole('button', { name: 'Trust key and prepare device' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Welcome them in.' }),
  ).toBeVisible();
  await page
    .getByText('Use an image or payload instead', { exact: true })
    .click();
  await page
    .getByLabel('Signed ticket payload')
    .fill(await rawTicket(organizer));
  await page.getByRole('button', { name: 'Verify and admit ticket' }).click();
  await expect(page.getByRole('alert')).toContainText('not authorized');
  await enrollScanner(organizer, page);
}
async function securityPayload(root: Page | Locator, text: string) {
  const details = root
    .locator('details')
    .filter({ hasText: 'Security payload fallback' });
  if ((await details.getAttribute('open')) === null)
    await root.getByText('Security payload fallback', { exact: true }).click();
  await root
    .getByLabel('Incoming security payload', { exact: true })
    .fill(text);
  await root
    .getByRole('button', { name: 'Process security payload', exact: true })
    .click();
}
async function enrollScanner(organizer: Page, scanner: Page) {
  const eventId = scanner.url().match(/\/scan\/([a-f0-9-]{36})/)![1]!;
  await scanner
    .getByText('Scanner authorization and policy', { exact: true })
    .click();
  const scannerPanel = scanner.getByRole('region', {
    name: 'Scanner authorization',
    exact: true,
  });
  await scannerPanel
    .getByRole('button', { name: 'Create enrollment request', exact: true })
    .click();
  await expect(
    scannerPanel.getByRole('img', {
      name: 'Authenticated security exchange QR',
    }),
  ).toBeVisible();
  const request = await scannerPanel
    .getByLabel('Outgoing security payload')
    .inputValue();
  const fingerprint = (await scannerPanel
    .getByTestId('scanner-fingerprint')
    .textContent())!;
  await organizer.goto(base + `/events/${eventId}?scanner=organizer`);
  await organizer
    .getByRole('tab', { name: 'Scanner devices', exact: true })
    .click();
  const organizerPanel = organizer.getByRole('region', {
    name: 'Scanner authorization',
    exact: true,
  });
  await securityPayload(organizerPanel, request);
  await organizerPanel
    .getByLabel('Confirm scanner fingerprint')
    .fill(fingerprint);
  await organizerPanel
    .getByRole('button', { name: 'Authorize requested scanner', exact: true })
    .click();
  await expect(organizerPanel.getByRole('status')).toContainText(
    'Authorization signed',
  );
  const response = await organizerPanel
    .getByLabel('Outgoing security payload')
    .inputValue();
  await securityPayload(scannerPanel, response);
  await expect(scannerPanel.getByTestId('authorization-status')).toHaveText(
    'Authorized for this event',
  );
  await scanner
    .getByText('Scanner authorization and policy', { exact: true })
    .click();
}

async function scanImage(page: Page, image: Buffer, name = 'ticket.png') {
  const details = page.locator('details').filter({
    has: page.getByText('Use an image or payload instead', { exact: true }),
  });
  if ((await details.getAttribute('open')) === null)
    await page
      .getByText('Use an image or payload instead', { exact: true })
      .click();
  await page.getByLabel('Read ticket QR image').setInputFiles({
    name,
    mimeType: name.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
    buffer: image,
  });
}
async function rawTickets(
  page: Page,
  profile = 'organizer',
): Promise<string[]> {
  return page.evaluate(async (profile) => {
    const request = indexedDB.open(`entryloop-v1-${profile}`);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = db
        .transaction('issuedTickets')
        .objectStore('issuedTickets')
        .getAll();
      const rows = await new Promise<{ payload: string }[]>(
        (resolve, reject) => {
          read.onsuccess = () => resolve(read.result as { payload: string }[]);
          read.onerror = () => reject(read.error);
        },
      );
      return rows.map((row) => row.payload);
    } finally {
      db.close();
    }
  }, profile);
}

async function rawTicket(page: Page, profile = 'organizer'): Promise<string> {
  return (await rawTickets(page, profile))[0]!;
}

test('organizer creates, imports guests, issues and exports signed tickets; prepared scanner verifies offline', async ({
  browser,
}, info) => {
  const organizer = await browser.newContext();
  const gate = await browser.newContext();
  const page = await organizer.newPage();
  const scanner = await gate.newPage();
  try {
    await cached(page);
    await organizer.setOffline(true);
    const id = await create(page);
    await page.getByRole('tab', { name: 'Guest list' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(
      page.getByRole('tab', { name: 'Tickets', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(
      page.getByRole('tab', { name: 'Event details' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(
      page.getByRole('tab', { name: 'Scanner devices' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: 'Guest list' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByText('Import from CSV', { exact: true }).click();
    await page.getByLabel('Choose attendee CSV').setInputFiles({
      name: 'guests.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'name,email\nAmina Bello,AMINA@example.com\nNoah Martins,noah@example.com\nDuplicate Amina,amina@example.com\n',
      ),
    });
    await expect(
      page.getByText(
        '2 valid new attendees · 1 duplicates skipped · 0 invalid rows',
      ),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Import validated attendees' })
      .click();
    await expect(page.getByTestId('attendee-count')).toHaveText('2');
    await manual(page, 'Tomi Okafor', 'tomi@example.com');
    await expect(page.getByTestId('attendee-count')).toHaveText('3');
    await page.getByLabel('Search attendees').fill('NOAH');
    await expect(
      page.getByRole('cell', {
        name: 'Noah Martins noah@example.com',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', {
        name: 'Amina Bello amina@example.com',
        exact: true,
      }),
    ).toHaveCount(0);
    await page.getByLabel('Search attendees').fill('');
    await issue(page);
    await expect(page.getByTestId('issued-count')).toHaveText('3');
    await page.getByRole('tab', { name: 'Tickets', exact: true }).click();
    await expect(page.getByTestId('ticket-qr')).toBeVisible();
    const svgWaiting = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download digital ticket', exact: true })
      .click();
    const svgDownload = await svgWaiting;
    await svgDownload.saveAs(info.outputPath('downloaded-ticket.svg'));
    const svg = await downloaded(svgDownload);
    expect(svg.toString()).toContain('<svg');
    expect(svg.toString()).not.toContain('privateKey');
    const sheetWaiting = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download ticket sheet', exact: true })
      .click();
    expect((await downloaded(await sheetWaiting)).toString()).toContain(
      '<article>',
    );
    await page.screenshot({
      path: info.outputPath('issued-ticket.png'),
      fullPage: true,
    });
    const payload = await rawTicket(page);
    expect(payload).not.toContain('example.com');
    expect(payload).not.toContain('Amina');
    const pkg = await packageFor(page);
    expect(pkg.file.toString()).not.toContain('amina@example.com');
    expect(pkg.file.toString()).not.toContain('privateKey');
    await page.getByRole('tab', { name: 'Event details' }).click();
    await expect(page.getByLabel('Event name', { exact: true })).toBeDisabled();
    await page
      .getByRole('textbox', { name: 'Description', exact: true })
      .fill('Updated public description');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Event saved');
    await provision(scanner, pkg.file, pkg.fingerprint, 'gate', page);
    await scanImage(scanner, svg, 'ticket.svg');
    await expect(
      scanner.getByRole('status').filter({ hasText: /^Admitted/ }),
    ).toBeVisible();
    await expect(scanner.getByTestId('real-attendance')).toHaveText('1');
    await scanImage(scanner, svg, 'ticket.svg');
    await expect(scanner.getByRole('alert')).toContainText('already admitted');
    await expect(scanner.getByTestId('real-operations')).toHaveText('1');
    const forged = JSON.parse(payload) as { t: string; s: string };
    forged.s = 'A'.repeat(86);
    await scanner
      .getByLabel('Signed ticket payload')
      .fill(JSON.stringify(forged));
    await scanner
      .getByRole('button', { name: 'Verify and admit ticket' })
      .click();
    await expect(scanner.getByRole('alert')).toContainText(
      'Invalid ticket signature',
    );
    const wrong = JSON.parse(payload) as { e: string };
    wrong.e = '44444444-4444-4444-8444-444444444444';
    await scanner
      .getByLabel('Signed ticket payload')
      .fill(JSON.stringify(wrong));
    await scanner
      .getByRole('button', { name: 'Verify and admit ticket' })
      .click();
    await expect(scanner.getByRole('alert')).toContainText('Wrong event');
    await scanner.reload();
    await expect(scanner.getByTestId('real-operations')).toHaveText('1');
    expect(scanner.url()).toContain(id);
    await scanner.setViewportSize({ width: 390, height: 844 });
    await scanner.getByRole('button', { name: 'Use dark mode' }).click();
    await expect(scanner.locator('.product-app')).toHaveAttribute(
      'data-theme',
      'dark',
    );
    expect(
      await scanner.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await scanner.screenshot({
      path: info.outputPath('mobile-scanner-dark.png'),
      fullPage: true,
    });
  } finally {
    await organizer.close();
    await gate.close();
  }
});

test('two provisioned devices keep real ticket conflicts and reconcile actual QR batches offline', async ({
  browser,
}) => {
  const org = await browser.newContext();
  const a = await browser.newContext();
  const b = await browser.newContext();
  const po = await org.newPage();
  const pa = await a.newPage();
  const pb = await b.newPage();
  try {
    await cached(po);
    await create(po);
    await manual(po);
    await issue(po);
    const token = await rawTicket(po);
    const qr = Buffer.from(
      await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'H',
        scale: 8,
        margin: 4,
      }).then((url) => url.split(',')[1]!),
      'base64',
    );
    const pkg = await packageFor(po);
    await provision(pa, pkg.file, pkg.fingerprint, 'gate-a', po);
    await provision(pb, pkg.file, pkg.fingerprint, 'gate-b', po);
    await scanImage(pa, qr);
    await expect(pa.getByTestId('real-operations')).toHaveText('1');
    await scanImage(pb, qr);
    await expect(pb.getByTestId('real-operations')).toHaveText('1');
    for (const page of [pa, pb])
      await page.getByRole('tab', { name: 'Sync & conflicts' }).click();
    const sync = (page: Page) =>
      page.getByRole('region', {
        name: 'Authenticated offline exchange',
        exact: true,
      });
    async function readQr(sender: Page, receiver: Page) {
      const image = sync(sender).getByRole('img', {
        name: 'Authenticated security exchange QR',
      });
      await expect(image).toBeVisible();
      // Decode actual generated pixels, never a mocked scanner callback.
      const pixels = await image.screenshot();
      await sync(receiver)
        .getByLabel('Read security QR or JSON file')
        .setInputFiles({
          name: 'sync.png',
          mimeType: 'image/png',
          buffer: pixels,
        });
    }
    async function exchange(sender: Page, receiver: Page) {
      await sync(receiver)
        .getByRole('button', { name: 'Start receiving', exact: true })
        .click();
      await expect(
        sync(receiver).getByTestId('sync-frame-label'),
      ).toContainText('Receiver request');
      await readQr(receiver, sender);
      await expect(sync(sender).getByTestId('sync-frame-label')).toContainText(
        'Signed offer',
      );
      await readQr(sender, receiver);
      await expect(sync(receiver).getByTestId('sync-progress')).toContainText(
        '0 /',
      );
      while (
        await sync(sender)
          .getByRole('button', { name: 'Next sync code' })
          .isEnabled()
      ) {
        await sync(sender)
          .getByRole('button', { name: 'Next sync code' })
          .click();
        await readQr(sender, receiver);
      }
      await expect(sync(receiver).getByTestId('sync-completion')).toBeVisible();
      await readQr(receiver, sender);
      await expect(sync(sender).getByTestId('sync-completion')).toBeVisible();
    }
    await exchange(pa, pb);
    await expect(sync(pb).getByTestId('secure-result-imported')).toHaveText(
      '1',
    );
    await expect(sync(pa).getByTestId('sync-completion')).toContainText(
      'Logs differ',
    );
    await exchange(pb, pa);
    await expect(sync(pa).getByTestId('secure-result-imported')).toHaveText(
      '1',
    );
    await expect(sync(pa).getByTestId('secure-result-skipped')).toHaveText('1');
    await expect(sync(pb).getByTestId('sync-completion')).toContainText(
      'Matching operation identities',
    );
    const ids = async (page: Page) =>
      page.locator('tbody tr td:last-child code').allTextContents();
    expect((await ids(pa)).sort()).toEqual((await ids(pb)).sort());
    for (const page of [pa, pb]) {
      await expect(
        page.getByText('Admission conflicts', { exact: true }),
      ).toBeVisible();
      await page.getByRole('tab', { name: 'Check-in', exact: true }).click();
      await expect(page.getByTestId('real-operations')).toHaveText('2');
      await expect(page.getByTestId('real-attendance')).toHaveText('1');
      await expect(page.getByTestId('real-conflicts')).toHaveText('1');
    }
  } finally {
    await org.close();
    await a.close();
    await b.close();
  }
});

test('invalid CSV and corrupted packages leave the stored data untouched', async ({
  page,
}) => {
  await cached(page);
  await create(page);
  await page.getByText('Import from CSV', { exact: true }).click();
  await page.getByLabel('Choose attendee CSV').setInputFiles({
    name: 'bad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,email\nBad,bad\nValid,valid@example.com'),
  });
  await expect(page.getByRole('alert')).toContainText('Row 2');
  await expect(
    page.getByRole('button', { name: 'Import validated attendees' }),
  ).toBeDisabled();
  await expect(page.getByTestId('attendee-count')).toHaveText('0');
  await manual(page);
  await issue(page);
  const pkg = await packageFor(page);
  const corrupted = Buffer.from(
    pkg.file.toString().replace('Signal Assembly', 'Injected Event'),
  );
  await page.goto(base + '/scan?scanner=empty-gate');
  await page.getByLabel('Choose event package').setInputFiles({
    name: 'corrupted.json',
    mimeType: 'application/json',
    buffer: corrupted,
  });
  await expect(page.getByRole('alert')).toContainText('signature');
  await expect(
    page.getByRole('button', { name: 'Trust key and prepare device' }),
  ).toHaveCount(0);
});

test('organizer signing key survives browser restart and remains usable offline', async ({
  playwright,
  browserName,
}, info) => {
  const engine = playwright[browserName];
  const dir = info.outputPath('organizer-profile');
  const first = await engine.launchPersistentContext(dir, { headless: true });
  let eventId: string;
  try {
    const page = await first.newPage();
    await cached(page);
    eventId = await create(page);
    await manual(page);
  } finally {
    await first.close();
  }
  const second = await engine.launchPersistentContext(dir, {
    headless: true,
    offline: true,
  });
  try {
    const page = await second.newPage();
    await page.goto(base + `/events/${eventId}?scanner=organizer`);
    await issue(page);
    await expect(page.getByTestId('issued-count')).toHaveText('1');
    await page.getByRole('tab', { name: 'Tickets', exact: true }).click();
    await expect(page.getByTestId('ticket-qr')).toBeVisible();
  } finally {
    await second.close();
  }
});

test('retained full-ticket SVG regression decodes pixels and still enforces event identity', async ({
  page,
}) => {
  await cached(page);
  const id = await create(page);
  await manual(page);
  await issue(page);
  await page.goto(base + `/scan/${id}?scanner=organizer`);
  await page.context().setOffline(true);
  await scanImage(
    page,
    await readFile('tests/fixtures/ticket-svg-regression.svg'),
    'ticket.svg',
  );
  await expect(page.getByRole('alert')).toContainText('Wrong event');
  await expect(page.getByTestId('real-operations')).toHaveText('0');
});

test('partial secure exchange survives a real browser restart, detects missing batches and rejects modified frames', async ({
  browser,
  playwright,
  browserName,
}, info) => {
  test.setTimeout(60000);
  const org = await browser.newContext();
  const a = await browser.newContext();
  const dir = info.outputPath('receiver-profile');
  let b = await playwright[browserName].launchPersistentContext(dir, {
    headless: true,
  });
  const po = await org.newPage(),
    pa = await a.newPage();
  let pb = await b.newPage();
  const region = (page: Page) =>
    page.getByRole('region', {
      name: 'Authenticated offline exchange',
      exact: true,
    });
  try {
    await cached(po);
    const id = await create(po);
    await po.getByText('Import from CSV', { exact: true }).click();
    await po.getByLabel('Choose attendee CSV').setInputFiles({
      name: 'guests.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'name,email\n' +
          Array.from(
            { length: 7 },
            (_, i) => `Guest ${i},guest${i}@example.com`,
          ).join('\n'),
      ),
    });
    await po
      .getByRole('button', { name: 'Import validated attendees' })
      .click();
    await expect(po.getByTestId('attendee-count')).toHaveText('7');
    await issue(po);
    const tokens = await rawTickets(po);
    const pkg = await packageFor(po);
    await provision(pa, pkg.file, pkg.fingerprint, 'gate-a', po);
    await provision(pb, pkg.file, pkg.fingerprint, 'gate-b', po);
    for (let i = 0; i < 6; i++) {
      await pa.getByLabel('Signed ticket payload').fill(tokens[i]!);
      await pa.getByRole('button', { name: 'Verify and admit ticket' }).click();
      await expect(pa.getByTestId('real-operations')).toHaveText(String(i + 1));
    }
    for (const page of [pa, pb])
      await page.getByRole('tab', { name: 'Sync & conflicts' }).click();
    await region(pb)
      .getByRole('button', { name: 'Start receiving', exact: true })
      .click();
    await expect(region(pb).getByTestId('sync-frame-label')).toContainText(
      'Receiver request',
    );
    await securityPayload(
      region(pa),
      await region(pb).getByLabel('Outgoing security payload').inputValue(),
    );
    await expect(region(pa).getByTestId('sync-frame-label')).toContainText(
      'Signed offer',
    );
    await securityPayload(
      region(pb),
      await region(pa).getByLabel('Outgoing security payload').inputValue(),
    );
    await expect(region(pb).getByTestId('sync-progress')).toContainText(
      '0 / 3 frames received',
    );
    const sessionId = (await region(pb)
      .getByTestId('sync-session-id')
      .textContent())!;
    const scannerId = (await pb
      .getByTestId('scanner-crypto-id')
      .textContent())!;
    const frames: string[] = [];
    for (let i = 0; i < 3; i++) {
      await region(pa).getByRole('button', { name: 'Next sync code' }).click();
      frames.push(
        await region(pa).getByLabel('Outgoing security payload').inputValue(),
      );
    }
    await securityPayload(region(pb), frames[2]!);
    await expect(region(pb).getByTestId('sync-progress')).toContainText(
      '1 / 3 frames received',
    );
    await b.close();
    b = await playwright[browserName].launchPersistentContext(dir, {
      headless: true,
      offline: true,
    });
    pb = await b.newPage();
    await pb.goto(base + `/scan/${id}?scanner=gate-b`);
    await expect(pb.getByTestId('real-operations')).toHaveText('0');
    expect(await pb.getByTestId('scanner-crypto-id').textContent()).toBe(
      scannerId,
    );
    await pb.getByRole('tab', { name: 'Sync & conflicts' }).click();
    await region(pb)
      .getByLabel('Resume saved exchange')
      .selectOption(sessionId);
    await expect(region(pb).getByTestId('sync-progress')).toContainText(
      '1 / 3 frames received',
    );
    await region(pb)
      .getByRole('button', { name: 'Request missing batches' })
      .click();
    await expect(region(pb).getByTestId('sync-frame-label')).toHaveText(
      'Missing-frame request',
    );
    await securityPayload(
      region(pa),
      await region(pb).getByLabel('Outgoing security payload').inputValue(),
    );
    await expect(region(pa).getByTestId('sync-frame-label')).toContainText(
      'Data batch 1 / 3',
    );
    const modified = JSON.parse(frames[0]!) as { z: string };
    modified.z = 'A'.repeat(86);
    await securityPayload(region(pb), JSON.stringify(modified));
    await expect(region(pb).getByRole('alert')).toContainText(
      'Invalid synchronization signature',
    );
    await expect(region(pb).getByTestId('sync-progress')).toContainText(
      '1 / 3 frames received',
    );
    for (const frame of [frames[0]!, frames[1]!])
      await securityPayload(region(pb), frame);
    await expect(region(pb).getByTestId('secure-result-imported')).toHaveText(
      '6',
    );
    await expect(region(pb).getByTestId('sync-completion')).toContainText(
      'Matching operation identities',
    );
    await securityPayload(
      region(pa),
      await region(pb).getByLabel('Outgoing security payload').inputValue(),
    );
    await expect(region(pa).getByTestId('sync-completion')).toContainText(
      'Matching operation identities',
    );
    await securityPayload(region(pb), frames[0]!);
    await expect(region(pb).getByTestId('secure-result-imported')).toHaveText(
      '6',
    );
    await pb.getByRole('tab', { name: 'Check-in', exact: true }).click();
    await expect(pb.getByTestId('real-operations')).toHaveText('6');
    await pb
      .getByText('Use an image or payload instead', { exact: true })
      .click();
    await pb.getByLabel('Signed ticket payload').fill(tokens[6]!);
    await pb.getByRole('button', { name: 'Verify and admit ticket' }).click();
    await expect(pb.getByTestId('real-operations')).toHaveText('7');
  } finally {
    await org.close();
    await a.close();
    await b.close();
  }
});

test('signed revocation updates exclude retained evidence and reject stale or forged policy imports offline', async ({
  browser,
}) => {
  const org = await browser.newContext(),
    gate = await browser.newContext();
  const po = await org.newPage(),
    scanner = await gate.newPage();
  try {
    await cached(po);
    await create(po);
    await manual(po);
    await manual(po, 'Second Guest', 'second@example.com');
    await issue(po);
    const tokens = await rawTickets(po),
      pkg = await packageFor(po);
    const oldPolicy = (JSON.parse(pkg.file.toString()) as { policy: unknown })
      .policy;
    await provision(scanner, pkg.file, pkg.fingerprint, 'gate', po);
    await scanner.getByLabel('Signed ticket payload').fill(tokens[0]!);
    await scanner
      .getByRole('button', { name: 'Verify and admit ticket' })
      .click();
    await expect(scanner.getByTestId('real-operations')).toHaveText('1');
    const authority = po.getByRole('region', {
      name: 'Scanner authorization',
      exact: true,
    });
    await authority
      .getByText('Revocation and recovery', { exact: true })
      .click();
    po.once('dialog', (dialog) => void dialog.accept());
    await authority
      .getByRole('button', { name: 'Revoke Entrance scanner', exact: true })
      .click();
    await expect(authority.getByRole('status')).toContainText(
      'Scanner revoked locally',
    );
    // Offline stale policy cannot enforce a revocation it has not received.
    await scanner.getByLabel('Signed ticket payload').fill(tokens[1]!);
    await scanner
      .getByRole('button', { name: 'Verify and admit ticket' })
      .click();
    await expect(scanner.getByTestId('real-operations')).toHaveText('2');
    const waiting = po.waitForEvent('download');
    await authority
      .getByRole('button', { name: 'Download signed policy', exact: true })
      .click();
    const policy = (await downloaded(await waiting)).toString();
    await scanner
      .getByText('Scanner authorization and policy', { exact: true })
      .click();
    const gateAuthority = scanner.getByRole('region', {
      name: 'Scanner authorization',
      exact: true,
    });
    await securityPayload(gateAuthority, policy);
    await expect(gateAuthority.getByTestId('authorization-status')).toHaveText(
      'Scanner revoked',
    );
    await expect(scanner.getByTestId('real-operations')).toHaveText('0');
    await expect(
      scanner.getByText(
        '0 historical unsigned operations and 2 revoked operations',
        { exact: false },
      ),
    ).toBeVisible();
    await securityPayload(gateAuthority, JSON.stringify(oldPolicy));
    await expect(gateAuthority.getByRole('alert')).toContainText(
      'Stale revocation policy',
    );
    const forged = JSON.parse(policy) as { epoch: number };
    forged.epoch++;
    await securityPayload(gateAuthority, JSON.stringify(forged));
    await expect(gateAuthority.getByRole('alert')).toContainText(
      'Invalid revocation policy signature',
    );
    await scanner
      .getByText('Scanner authorization and policy', { exact: true })
      .click();
    await scanner.getByLabel('Signed ticket payload').fill(tokens[0]!);
    await scanner
      .getByRole('button', { name: 'Verify and admit ticket' })
      .click();
    await expect(scanner.getByRole('alert')).toContainText(
      'Scanner authorization revoked',
    );
    await scanner.reload();
    await expect(scanner.getByTestId('real-operations')).toHaveText('0');
  } finally {
    await org.close();
    await gate.close();
  }
});
