import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import {
  cacheApp,
  createIssued,
  authorizeOwn,
  nativeSnapshot,
} from './reliability-helpers';
const profile = 'stage4-review';
async function measure(page: Page) {
  return page.evaluate(() => {
    const rgb = (value: string) =>
      (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (c: number[]) =>
      c
        .map((v) => {
          const n = v / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        })
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i]!, 0);
    const issues: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      'button, .button, input:not([type="checkbox"]), select, summary',
    )) {
      const box = el.getBoundingClientRect();
      if (box.width && box.height && box.height < 43.9)
        issues.push(`Small target: ${el.textContent?.trim().slice(0, 40)}`);
    }
    for (const el of document.querySelectorAll<HTMLElement>(
      'input:not([type="checkbox"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    )) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height || el.closest('details:not([open])'))
        continue;
      const style = getComputedStyle(el);
      const a = luminance(rgb(style.borderTopColor)),
        b = luminance(rgb(style.backgroundColor));
      if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 3)
        issues.push('Control boundary contrast below 3:1');
    }
    for (const el of document.querySelectorAll<HTMLElement>(
      'h1, h2, h3, .state-tag, .network-state, .admission-success, .admission-rejected, button',
    )) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height || el.closest('details:not([open])'))
        continue;
      const style = getComputedStyle(el);
      let parent: HTMLElement | null = el,
        background = 'rgba(0, 0, 0, 0)';
      while (
        parent &&
        (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')
      ) {
        background = getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      const a = luminance(rgb(style.color)),
        b = luminance(rgb(background));
      if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 4.5)
        issues.push(`Contrast: ${el.textContent?.trim().slice(0, 40)}`);
    }
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      issues,
    };
  });
}
test('Stage 4 organizer and staff views use real state, keep offline security and guide handoffs', async ({
  page,
  browserName,
}, info) => {
  await cacheApp(page, `/?scanner=${profile}`);
  const id = await createIssued(page, profile);
  const before = await nativeSnapshot(page, profile);
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Prepare your entrances', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('tab', { name: 'Overview', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('button', { name: 'Prepare an entrance', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Approve an entrance phone',
      exact: true,
    }),
  ).toBeVisible();
  await authorizeOwn(page);
  await page.getByRole('tab', { name: 'Tickets', exact: true }).click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download digital ticket', exact: true })
    .click();
  const ticket = await readFile((await (await download).path())!);
  await page.goto(`/scan/${id}?scanner=${profile}`);
  await expect(
    page.getByRole('button', { name: 'Scan with camera', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Ready to admit guests', { exact: true }),
  ).toBeHidden();
  await page.context().setOffline(true);
  await page
    .getByText('Use an image or payload instead', { exact: true })
    .click();
  await page.getByLabel('Read ticket QR image', { exact: true }).setInputFiles({
    name: 'ticket.svg',
    mimeType: 'image/svg+xml',
    buffer: ticket,
  });
  await expect(page.getByTestId('real-attendance')).toHaveText('1');
  await expect(page.getByRole('status')).toContainText('Admitted');
  await page.getByLabel('Read ticket QR image', { exact: true }).setInputFiles({
    name: 'ticket.svg',
    mimeType: 'image/svg+xml',
    buffer: ticket,
  });
  await expect(page.getByRole('alert')).toContainText(
    'Already checked in here',
  );
  await expect(page.getByTestId('real-operations')).toHaveText('1');
  await page
    .getByRole('tab', { name: 'Sync & conflicts', exact: true })
    .click();
  await page.getByRole('button', { name: 'Send records', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Scan the receiving device’s request',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Start receiving', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Show this request to the sending device',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Authenticated security exchange QR',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Send records', exact: true }).click();
  await expect(
    page.getByRole('img', {
      name: 'Authenticated security exchange QR',
      exact: true,
    }),
  ).toHaveCount(0);
  const after = await nativeSnapshot(page, profile);
  expect(after.events).toEqual(before.events);
  expect(after.keys).toEqual(before.keys);
  expect(after.counts.attendees).toBe(3);
  expect(after.counts.issuedTickets).toBe(3);
  expect(after.counts.operations).toBe(1);
  await mkdir('.cache/stage4', { recursive: true });
  await writeFile(
    `.cache/stage4/workflow-${browserName}.json`,
    JSON.stringify(
      {
        event: id,
        before: before.counts,
        after: after.counts,
        organizerKeysUnchanged: true,
      },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: info.outputPath('exchange-guidance.png'),
    fullPage: true,
  });
});

test('Stage 4 major screens remain readable in both themes at four widths and 200 percent equivalent viewport', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180000);
  await cacheApp(page, `/?scanner=${profile}`);
  const id = await createIssued(page, profile);
  await authorizeOwn(page);
  const reports = [];
  await mkdir(`.cache/stage4/screens/${browserName}`, { recursive: true });
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 390, 768, 1440, 720]) {
      await page.setViewportSize({ width, height: width === 720 ? 450 : 960 });
      for (const screen of [
        'Events',
        'Create event',
        'Preparation',
        'Overview',
        'Guest list',
        'Tickets',
        'Scanner devices',
        'Attendance & sync',
        'Check-in',
        'Sync & conflicts',
      ]) {
        const scanner = screen === 'Check-in' || screen === 'Sync & conflicts';
        const path =
          screen === 'Events'
            ? '/'
            : screen === 'Create event'
              ? '/events/new'
              : screen === 'Preparation'
                ? '/scan'
                : `/${scanner ? 'scan' : 'events'}/${id}`;
        await page.goto(`${path}?scanner=${profile}&theme=${theme}`);
        if (!['Events', 'Create event', 'Preparation'].includes(screen))
          await page.getByRole('tab', { name: screen, exact: true }).click();
        if (screen === 'Tickets')
          await expect(page.getByTestId('ticket-qr')).toBeVisible();
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const report = await measure(page);
        expect(report, `${theme} ${width} ${screen}`).toEqual({
          overflow: false,
          issues: [],
        });
        const name = `${theme}-${width}-${screen.replaceAll(/[^a-z]/gi, '-').toLowerCase()}`;
        reports.push({ theme, width, screen, ...report });
        await page.screenshot({
          path: `.cache/stage4/screens/${browserName}/${name}.png`,
          fullPage: true,
        });
      }
    }
  }
  await writeFile(
    `.cache/stage4/layout-${browserName}.json`,
    JSON.stringify(reports, null, 2),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/events/${id}?scanner=${profile}&theme=dark`);
  await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Guest list', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('tab', { name: 'Guest list', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('button', { name: 'Use light mode', exact: true })
    .click();
  expect(page.url()).toContain(`scanner=${profile}`);
  expect(page.url()).toContain('theme=light');
  await expect(
    page.getByRole('tab', { name: 'Guest list', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
});

// Native keyboard activation is exercised in browsers; jsdom does not implement it.
test('recovery disclosure opens with the keyboard and reduced motion does not hide content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await cacheApp(page, '/?scanner=stage4-keyboard');
  const storage = page.locator('#workspace-storage');
  await storage.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(storage).toHaveAttribute('open', '');
  await expect(
    page.getByRole('button', {
      name: 'Download recoverable records (no keys)',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your events', exact: true }),
  ).toBeVisible();
});

test('fresh browser leads with organizer or entrance choice without silently creating identities', async ({
  browser,
}, info) => {
  for (const mode of ['organizer', 'staff']) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setViewportSize({ width: 320, height: 844 });
      await page.goto('/?theme=' + (mode === 'organizer' ? 'light' : 'dark'));
      await expect(
        page.getByRole('heading', {
          name: 'Doors open. Network off.',
          exact: true,
        }),
      ).toBeVisible();
      const action = page.getByRole('link', {
        name:
          mode === 'organizer'
            ? 'Organize an event'
            : 'Prepare an entrance phone',
        exact: true,
      });
      expect((await action.boundingBox())!.y).toBeLessThan(700);
      await expect(
        page.getByLabel('Workspace name', { exact: true }),
      ).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await page.screenshot({
        path: info.outputPath(`first-use-${mode}.png`),
        fullPage: true,
      });
      await action.click();
      await expect(page).toHaveURL(
        mode === 'organizer' ? /scanner=main/ : /scan\?.*scanner=main/,
      );
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const snapshot = await nativeSnapshot(page, 'main');
      expect(snapshot.counts.events).toBe(0);
      expect(snapshot.counts.scannerKeys).toBe(0);
      expect(snapshot.counts.signingKeys).toBe(0);
    } finally {
      await context.close();
    }
  }
});
