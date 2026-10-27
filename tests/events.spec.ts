import { test, expect, type Page, type Download } from '@playwright/test';
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
    .fill(fingerprint);
  await page
    .getByRole('button', { name: 'Trust key and prepare device' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Welcome them in.' }),
  ).toBeVisible();
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
async function rawTicket(page: Page, profile = 'organizer'): Promise<string> {
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
      return rows[0]!.payload;
    } finally {
      db.close();
    }
  }, profile);
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
    await provision(scanner, pkg.file, pkg.fingerprint, 'gate');
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
    await provision(pa, pkg.file, pkg.fingerprint, 'gate-a');
    await provision(pb, pkg.file, pkg.fingerprint, 'gate-b');
    await scanImage(pa, qr);
    await expect(pa.getByTestId('real-operations')).toHaveText('1');
    await scanImage(pb, qr);
    await expect(pb.getByTestId('real-operations')).toHaveText('1');
    for (const page of [pa, pb])
      await page.getByRole('tab', { name: 'Sync & conflicts' }).click();
    async function frame(page: Page) {
      for (const box of await page.getByRole('checkbox').all())
        await box.check();
      await page.getByRole('button', { name: 'Generate QR transfer' }).click();
      const image = page.getByRole('img', {
        name: 'QR transfer containing selected check-in operations',
      });
      await expect(image).toBeVisible();
      return image.screenshot();
    }
    const qa = await frame(pa);
    await pb
      .getByLabel('Read QR image (local file)')
      .setInputFiles({ name: 'sync-a.png', mimeType: 'image/png', buffer: qa });
    await expect(pb.getByTestId('result-imported')).toHaveText('1');
    const qb = await frame(pb);
    await pa
      .getByLabel('Read QR image (local file)')
      .setInputFiles({ name: 'sync-b.png', mimeType: 'image/png', buffer: qb });
    await expect(pa.getByTestId('result-imported')).toHaveText('1');
    await expect(pa.getByTestId('result-skipped')).toHaveText('1');
    const ids = async (page: Page) =>
      page
        .getByRole('checkbox')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('aria-label')).sort(),
        );
    expect(await ids(pa)).toEqual(await ids(pb));
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
