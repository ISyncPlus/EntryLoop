import { test, expect } from '@playwright/test';
import { cacheApp, createIssued, nativeSnapshot } from './reliability-helpers';

test('website explains the workflow, switches roles, pauses motion and works offline without opening a database', async ({
  page,
}) => {
  await cacheApp(page, '/welcome');
  await expect(
    page.getByRole('heading', { name: 'Doors open. Network off.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
  await page
    .getByRole('button', { name: 'I’m on the door', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'I’m on the door', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Exchange the records', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Exchange the records', exact: true }),
  ).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.journey-picture img')).toHaveAttribute(
    'src',
    '/website/exchange.png',
  );
  await page
    .locator('summary')
    .filter({ hasText: 'Interrupted exchange?' })
    .click();
  await expect(page.locator('details[open]')).toContainText(
    'Resume the saved exchange',
  );
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(page.locator('.entryloop-site')).toHaveAttribute(
    'data-motion',
    'off',
  );
  await page.getByRole('button', { name: 'Back to top', exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Doors open. Network off.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Prepare the entrances', exact: true })
    .click();
  await expect(page.locator('.journey-picture img')).toBeVisible();
  expect(
    await page
      .locator('.journey-picture img')
      .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
  ).toBe(true);
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
});

test('website links preserve the original event, keys and profile, and do not choose between multiple workspaces', async ({
  page,
}) => {
  const profile = 'website-original';
  await cacheApp(page, `/?scanner=${profile}`);
  const id = await createIssued(page, profile);
  const before = await nativeSnapshot(page, profile);
  await page
    .getByRole('link', { name: 'About EntryLoop', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp('/welcome\\?scanner=' + profile));
  await page
    .getByRole('link', { name: 'Open app', exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp('/\\?scanner=' + profile));
  await expect(
    page.getByRole('link', { name: /Persistence acceptance/ }),
  ).toBeVisible();
  await page.goto('/welcome');
  await page
    .getByRole('link', { name: 'Prepare an entrance phone', exact: false })
    .click();
  await expect(page).toHaveURL(new RegExp('/scan\\?.*scanner=' + profile));
  await page.goto(`/events/${id}?scanner=${profile}`);
  expect(await nativeSnapshot(page, profile)).toEqual(before);
  await page.goto('/?scanner=second-workspace');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/welcome');
  await page
    .getByRole('link', { name: 'Open app', exact: false })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Choose this browser’s workspace' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open workspace ' + profile, exact: true }),
  ).toBeVisible();
  expect(
    (await page.evaluate(() => indexedDB.databases()))
      .map((d) => d.name)
      .sort(),
  ).toEqual(['entryloop-v1-second-workspace', 'entryloop-v1-website-original']);
});

test('public website remains readable on a storage error, but its start action never creates a fallback database', async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.databases = async () => {
      throw new Error('Injected storage enumeration failure');
    };
    const original = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (
      ...args: Parameters<IDBFactory['open']>
    ) {
      sessionStorage.setItem('unexpected-open', 'yes');
      return original.apply(this, args);
    };
  });
  await page.goto('/welcome');
  await expect(
    page.getByRole('heading', { name: 'Doors open. Network off.' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Organize an event', exact: false })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Injected storage enumeration failure',
  );
  await expect(
    page.getByText('Start with your event', { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem('unexpected-open')),
  ).toBeNull();
});

test('website keeps readable controls, visible content and no overflow at phone, tablet and desktop widths with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/welcome');
    await expect(
      page.getByRole('heading', { name: 'Doors open. Network off.' }),
    ).toBeVisible();
    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      smallTargets: [
        ...document.querySelectorAll<HTMLElement>(
          'button, .site-button, summary',
        ),
      ]
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.height > 0 && box.height < 44;
        })
        .map((el) => el.textContent?.trim()),
      moving: document.getAnimations().filter((a) => a.playState === 'running')
        .length,
      brokenImages: [...document.images].filter(
        (el) => el.complete && el.naturalWidth === 0,
      ).length,
    }));
    expect(result).toEqual({
      overflow: false,
      smallTargets: [],
      moving: 0,
      brokenImages: 0,
    });
    for (const link of await page.locator('a[href^="#"]').all()) {
      const href = await link.getAttribute('href');
      expect(await page.locator(href!).count()).toBe(1);
    }
    await page
      .getByRole('link', { name: 'Data & recovery', exact: true })
      .click();
    await expect(page).toHaveURL(/#trust$/);
    await expect(
      page.getByRole('heading', { name: 'Clear about the limits.' }),
    ).toBeInViewport();
  }
});
