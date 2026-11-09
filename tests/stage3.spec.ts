import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { cacheApp, nativeSnapshot, base } from './reliability-helpers';
import type { SyncSession } from '../src/features/security/exchange';
test.use({ actionTimeout: 15000 });
function sync(page: Page) {
  return page.getByRole('region', {
    name: 'Authenticated offline exchange',
    exact: true,
  });
}
async function qr(area: Locator) {
  const image = area.getByRole('img', {
    name: 'Authenticated security exchange QR',
    exact: true,
  });
  await expect(image).toBeVisible();
  return Buffer.from(
    (await image.getAttribute('src'))!.split(',')[1]!,
    'base64',
  );
}
async function incoming(area: Locator, image: Buffer) {
  await area
    .getByLabel('Choose a code image or approval file', { exact: true })
    .setInputFiles({
      name: 'exchange.png',
      mimeType: 'image/png',
      buffer: image,
    });
}
async function openScan(page: Page, id: string, profile: string) {
  await page.goto(base + `/scan/${id}?scanner=${profile}`);
  await expect(page.getByTestId('real-operations')).toBeVisible();
}
async function enterSync(page: Page) {
  await page
    .getByRole('tab', { name: 'Sync & conflicts', exact: true })
    .click();
}
async function enroll(organizer: Page, phone: Page, id: string, alias: string) {
  await phone
    .getByText('Scanner authorization and policy', { exact: true })
    .click();
  const panel = phone.getByRole('region', {
    name: 'Scanner authorization',
    exact: true,
  });
  await panel.getByLabel('Scanner name', { exact: true }).fill(alias);
  await panel
    .getByRole('button', { name: 'Create enrollment request', exact: true })
    .click();
  const request = await qr(panel),
    fingerprint = (await panel
      .getByTestId('scanner-fingerprint')
      .textContent())!;
  await organizer.goto(base + `/events/${id}?scanner=stage3-organizer`);
  await organizer
    .getByRole('tab', { name: 'Scanner devices', exact: true })
    .click();
  const root = organizer.getByRole('region', {
    name: 'Scanner authorization',
    exact: true,
  });
  await incoming(root, request);
  await expect(root.getByLabel('Confirm scanner fingerprint')).toBeVisible();
  await root.getByLabel('Confirm scanner fingerprint').fill(fingerprint);
  await root
    .getByRole('button', { name: 'Authorize requested scanner', exact: true })
    .click();
  await incoming(panel, await qr(root));
  await expect(panel.getByTestId('authorization-status')).toHaveText(
    'Authorized for this event',
  );
  await phone
    .getByText('Scanner authorization and policy', { exact: true })
    .click();
}
async function ticket(page: Page, payload: string) {
  const details = page.locator('details').filter({
    has: page.getByText('Use an image or payload instead', { exact: true }),
  });
  if ((await details.getAttribute('open')) === null)
    await page
      .getByText('Use an image or payload instead', { exact: true })
      .click();
  await page.getByLabel('Signed ticket payload', { exact: true }).fill(payload);
  await page
    .getByRole('button', { name: 'Verify and admit ticket', exact: true })
    .click();
}
async function transfer(sender: Page, receiver: Page, profile: string) {
  await sync(receiver)
    .getByRole('button', { name: 'Start receiving', exact: true })
    .click();
  await expect(sync(receiver).getByTestId('sync-frame-label')).toContainText(
    'Receiver request',
  );
  await incoming(sync(sender), await qr(sync(receiver)));
  await expect(sync(sender).getByTestId('sync-frame-label')).toContainText(
    'Signed offer',
  );
  const sessionId = (await sync(sender)
    .getByTestId('sync-session-id')
    .textContent())!;
  const sessions = (await nativeSnapshot(sender, profile)).rows
    .syncSessions as SyncSession[];
  const count = sessions.find((s) => s.id === sessionId)!.offer!.f;
  await incoming(sync(receiver), await qr(sync(sender)));
  for (let i = 0; i < count; i++) {
    await sync(sender)
      .getByRole('button', { name: 'Next sync code', exact: true })
      .click();
    await incoming(sync(receiver), await qr(sync(sender)));
    await expect(sync(receiver).getByTestId('sync-progress')).toContainText(
      `${i + 1} / ${count}`,
    );
  }
  await expect(sync(receiver).getByTestId('sync-completion')).toBeVisible();
  await incoming(sync(sender), await qr(sync(receiver)));
  await expect(sync(sender).getByTestId('sync-completion')).toBeVisible();
}

test('seven fictional attendees: two offline entrances enroll, interrupt/resume, converge and report to the organizer across restarts', async ({
  playwright,
  browserName,
}, info) => {
  test.setTimeout(180000);
  const profiles = ['stage3-organizer', 'gate-north', 'gate-south'];
  const dirs = profiles.map((profile) => info.outputPath(profile));
  const contexts = await Promise.all(
    dirs.map((dir) =>
      playwright[browserName].launchPersistentContext(dir, { headless: true }),
    ),
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const organizer = pages[0]!,
    north = pages[1]!;
  let south = pages[2]!;
  try {
    for (let i = 0; i < 3; i++)
      await cacheApp(pages[i]!, base + '/?scanner=' + profiles[i]);
    await organizer.goto(base + '/events/new?scanner=stage3-organizer');
    await organizer
      .getByLabel('Event name', { exact: true })
      .fill('Harbor Makers Rehearsal — fictional');
    await organizer
      .getByLabel('Event date', { exact: true })
      .fill('2026-11-19');
    await organizer
      .getByLabel('Location', { exact: true })
      .fill('Fictional Hall, Lagos');
    await organizer
      .getByRole('button', { name: 'Create event', exact: true })
      .click();
    await expect(organizer.getByTestId('attendee-count')).toHaveText('0');
    const id = organizer.url().match(/\/events\/([a-f0-9-]{36})/)![1]!;
    await organizer
      .getByRole('tab', { name: 'Guest list', exact: true })
      .click();
    await organizer.getByText('Add an attendee', { exact: true }).click();
    await organizer
      .getByLabel('Full name', { exact: true })
      .fill('Amina Bello');
    await organizer
      .getByLabel('Email address', { exact: true })
      .fill('amina.stage3@example.com');
    await organizer
      .getByRole('button', { name: 'Add attendee', exact: true })
      .click();
    await expect(organizer.getByTestId('attendee-count')).toHaveText('1');
    await organizer.getByText('Import from CSV', { exact: true }).click();
    await organizer
      .getByLabel('Choose attendee CSV')
      .setInputFiles('tests/fixtures/stage3-attendees.csv');
    await expect(organizer.getByText(/6 valid new attendees/)).toBeVisible();
    await organizer
      .getByRole('button', { name: 'Import validated attendees', exact: true })
      .click();
    await expect(organizer.getByTestId('attendee-count')).toHaveText('7');
    await organizer
      .getByRole('button', { name: 'Issue all unissued tickets', exact: true })
      .click();
    await expect(organizer.getByTestId('issued-count')).toHaveText('7');
    const issued = await nativeSnapshot(organizer, profiles[0]);
    const attendees = issued.rows.attendees as {
      id: string;
      name: string;
      ticketId: string;
    }[];
    const tokens = issued.rows.issuedTickets as {
      attendeeId: string;
      payload: string;
    }[];
    const names = [
      'Amina Bello',
      'Ben Okoro',
      'Chika Eze',
      'Dara Cole',
      'Elena Martins',
      'Femi Adeyemi',
      'Gita Shah',
    ];
    const payload = names.map(
      (name) =>
        tokens.find(
          (t) => t.attendeeId === attendees.find((a) => a.name === name)!.id,
        )!.payload,
    );
    await organizer.getByRole('tab', { name: 'Tickets', exact: true }).click();
    const exporting = organizer.waitForEvent('download');
    await organizer
      .getByRole('button', { name: 'Download ticket sheet', exact: true })
      .click();
    expect(
      (await readFile((await (await exporting).path())!, 'utf8')).match(
        /<article>/g,
      ),
    ).toHaveLength(7);
    await organizer
      .getByRole('tab', { name: 'Scanner devices', exact: true })
      .click();
    const fingerprint = (await organizer
      .getByTestId('organizer-fingerprint')
      .textContent())!;
    const downloading = organizer.waitForEvent('download');
    await organizer
      .getByRole('button', { name: 'Download scanner package', exact: true })
      .click();
    const pkg = await readFile((await (await downloading).path())!);
    expect(pkg.toString()).not.toContain('amina.stage3@example.com');
    for (let i = 1; i < 3; i++) {
      const page = pages[i]!;
      await page.goto(base + '/scan?scanner=' + profiles[i]);
      await page.getByLabel('Choose event package').setInputFiles({
        name: 'event.json',
        mimeType: 'application/json',
        buffer: pkg,
      });
      await page
        .getByLabel('Organizer fingerprint', { exact: true })
        .fill(fingerprint);
      await page
        .getByRole('button', {
          name: 'Trust key and prepare device',
          exact: true,
        })
        .click();
      await expect(page.getByTestId('real-operations')).toHaveText('0');
    }
    for (const context of contexts) await context.setOffline(true);
    await enroll(organizer, north, id, 'North entrance');
    await enroll(organizer, south, id, 'South entrance');
    for (const [page, indices] of [
      [north, [0, 1, 2, 3]],
      [south, [3, 4, 5]],
    ] as const)
      for (let i = 0; i < indices.length; i++) {
        await ticket(page, payload[indices[i]!]!);
        await expect(page.getByTestId('real-operations')).toHaveText(
          String(i + 1),
        );
      }
    await ticket(north, payload[0]!);
    await expect(north.getByRole('alert')).toContainText('already admitted');
    const forged = JSON.parse(payload[6]!) as { s: string };
    forged.s = 'A'.repeat(86);
    await ticket(north, JSON.stringify(forged));
    await expect(north.getByRole('alert')).toContainText('signature');
    const wrong = {
      ...(JSON.parse(payload[6]!) as object),
      e: '00000000-0000-4000-8000-000000000001',
    };
    await ticket(north, JSON.stringify(wrong));
    await expect(north.getByRole('alert')).toContainText('Wrong event');
    await enterSync(north);
    await enterSync(south);
    await sync(south)
      .getByRole('button', { name: 'Start receiving', exact: true })
      .click();
    await incoming(sync(north), await qr(sync(south)));
    await expect(sync(north).getByTestId('sync-frame-label')).toContainText(
      'Signed offer',
    );
    const exchangeId = (await sync(north)
      .getByTestId('sync-session-id')
      .textContent())!;
    await incoming(sync(south), await qr(sync(north)));
    await sync(north)
      .getByRole('button', { name: 'Next sync code', exact: true })
      .click();
    await incoming(sync(south), await qr(sync(north)));
    await expect(sync(south).getByTestId('sync-progress')).toHaveText(
      '1 / 2 frames received · 1 missing',
    );
    expect((await nativeSnapshot(south, profiles[2])).counts.operations).toBe(
      3,
    );
    await contexts[2]!.close();
    contexts[2] = await playwright[browserName].launchPersistentContext(
      dirs[2]!,
      { headless: true },
    );
    await contexts[2]!.setOffline(true);
    south = await contexts[2]!.newPage();
    pages[2] = south;
    await openScan(south, id, profiles[2]!);
    await enterSync(south);
    await sync(south)
      .getByLabel('Resume saved exchange')
      .selectOption(exchangeId);
    await sync(south)
      .getByRole('button', { name: 'Request missing batches', exact: true })
      .click();
    await incoming(sync(north), await qr(sync(south)));
    await expect(sync(north).getByTestId('sync-frame-label')).toContainText(
      'Data batch 2',
    );
    const missingImage = await qr(sync(north));
    await incoming(sync(south), missingImage);
    await expect(sync(south).getByTestId('secure-result-imported')).toHaveText(
      '4',
    );
    await incoming(sync(south), missingImage);
    await expect(sync(south).getByTestId('secure-result-imported')).toHaveText(
      '4',
    );
    await incoming(sync(north), await qr(sync(south)));
    await expect(sync(north).getByTestId('sync-completion')).toContainText(
      'Logs differ',
    );
    await transfer(south, north, profiles[2]!);
    await expect(sync(south).getByTestId('sync-completion')).toContainText(
      'Matching operation identities',
    );
    const n = await nativeSnapshot(north, profiles[1]),
      s = await nativeSnapshot(south, profiles[2]);
    expect(n.rows.operations).toEqual(s.rows.operations);
    expect(n.counts.operations).toBe(7);
    // Optional organizer receipt uses existing explicit authority; two entrance devices remain the only admitting scanners.
    await organizer
      .getByRole('tab', { name: 'Attendance & sync', exact: true })
      .click();
    await sync(organizer)
      .getByRole('button', { name: 'Start receiving', exact: true })
      .click();
    await expect(sync(organizer).getByRole('alert')).toContainText(
      'not authorized',
    );
    expect(
      (await nativeSnapshot(organizer, profiles[0])).counts.scannerKeys,
    ).toBe(0);
    await organizer
      .getByRole('button', { name: 'Open scanner authorization', exact: true })
      .click();
    await organizer
      .getByText('Use this organizer device for check-in or receiving', {
        exact: true,
      })
      .click();
    await organizer
      .getByRole('button', { name: 'Authorize this device', exact: true })
      .click();
    await expect(organizer.getByTestId('authorization-status')).toHaveText(
      'Authorized for this event',
    );
    await organizer
      .getByRole('tab', { name: 'Attendance & sync', exact: true })
      .click();
    await transfer(south, organizer, profiles[2]!);
    await expect(organizer.getByTestId('organizer-attendance')).toHaveText(
      '6 unique tickets · 7 operations · 1 conflicts',
    );
    const o = await nativeSnapshot(organizer, profiles[0]);
    expect(o.rows.operations).toEqual(n.rows.operations);
    const receipts = (o.rows.syncSessions as SyncSession[]).filter(
      (x) => x.ack,
    );
    expect(receipts.some((x) => x.ack!.h === x.ack!.g)).toBe(true);
    const before = [o, n, await nativeSnapshot(south, profiles[2])];
    for (let i = 0; i < 3; i++) {
      await contexts[i]!.close();
      contexts[i] = await playwright[browserName].launchPersistentContext(
        dirs[i]!,
        { headless: true },
      );
      await contexts[i]!.setOffline(true);
      const page = await contexts[i]!.newPage();
      await page.goto(
        base +
          (i === 0 ? '/events/' : '/scan/') +
          id +
          '?scanner=' +
          profiles[i],
      );
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Harbor Makers Rehearsal — fictional',
        }),
      ).toBeVisible();
      const after = await nativeSnapshot(page, profiles[i]);
      expect(after.rows.operations).toEqual(before[i]!.rows.operations);
      expect(after.keys).toEqual(before[i]!.keys);
      expect(after.scanners).toEqual(before[i]!.scanners);
    }
    await mkdir('.cache/stage3', { recursive: true });
    await writeFile(
      `.cache/stage3/acceptance-${browserName}.json`,
      JSON.stringify(
        {
          eventId: id,
          attendees: attendees.length,
          admittingDevices: 2,
          admissions: 7,
          uniqueTickets: 6,
          conflictTickets: 1,
          operationIds: (n.rows.operations as { operationId: string }[]).map(
            (r) => r.operationId,
          ),
          receiptRoots: receipts.map((r) => ({
            offered: r.ack!.h,
            resulting: r.ack!.g,
          })),
          profilesRestarted: 3,
          physicalCameraTested: false,
        },
        null,
        2,
      ),
    );
  } finally {
    for (const context of contexts) await context.close();
  }
});
