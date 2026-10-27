import { test, expect, type Page } from '@playwright/test';
async function ready(page: Page, profile: string) {
  await page.goto(`/dev/workbench?scanner=${profile}`);
  await expect(
    page.getByRole('button', { name: 'Admit ticket' }),
  ).toBeVisible();
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
async function admit(page: Page, ticket: string) {
  await page
    .getByRole('combobox', { name: 'Synthetic ticket', exact: true })
    .selectOption(ticket);
  await page.getByRole('button', { name: 'Admit ticket' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: `Admitted ${ticket}` }),
  ).toBeVisible();
}
async function batchImage(page: Page) {
  for (const box of await page.getByRole('checkbox').all()) await box.check();
  await page.getByRole('button', { name: 'Generate QR transfer' }).click();
  const image = page.getByRole('img', {
    name: 'QR transfer containing selected check-in operations',
  });
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (node) =>
          (node as HTMLImageElement).complete &&
          (node as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
  return image.screenshot();
}
test('two isolated offline browsers exchange actual QR images and converge', async ({
  browser,
}, testInfo) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  const errors: string[] = [];
  for (const page of [pa, pb])
    page.on('pageerror', (error) => errors.push(error.message));
  try {
    await ready(pa, 'a');
    await ready(pb, 'b');
    const idA = await pa.getByTestId('scanner-id').textContent();
    const idB = await pb.getByTestId('scanner-id').textContent();
    expect(idA).not.toBe(idB);
    await a.setOffline(true);
    await b.setOffline(true);
    const networkRequests: string[] = [];
    for (const page of [pa, pb])
      page.on('request', (request) => {
        if (/^https?:/.test(request.url())) networkRequests.push(request.url());
      });
    await admit(pa, 'TEST-001');
    await admit(pa, 'TEST-002');
    await admit(pb, 'TEST-001');
    await admit(pb, 'TEST-003');
    const imageA = await batchImage(pa);
    const imageB = await batchImage(pb);
    await pb
      .getByLabel('Read QR image (local file)')
      .setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: imageA });
    await expect(pb.getByTestId('result-imported')).toHaveText('2');
    await pa
      .getByLabel('Read QR image (local file)')
      .setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: imageB });
    await expect(pa.getByTestId('result-imported')).toHaveText('2');
    await pb.getByLabel('Read QR image (local file)').setInputFiles({
      name: 'a-again.png',
      mimeType: 'image/png',
      buffer: imageA,
    });
    await expect(pb.getByTestId('result-imported')).toHaveText('0');
    await expect(pb.getByTestId('result-skipped')).toHaveText('2');
    for (const page of [pa, pb]) {
      await expect(page.getByTestId('attendance')).toHaveText('3');
      await expect(page.getByTestId('operations')).toHaveText('4');
      await expect(page.getByTestId('conflicts')).toHaveText('1');
    }
    const ids = async (page: Page) =>
      page
        .getByRole('checkbox')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('aria-label')).sort(),
        );
    expect(await ids(pa)).toEqual(await ids(pb));
    expect(networkRequests).toEqual([]);
    await pa.reload();
    await expect(pa.getByTestId('operations')).toHaveText('4');
    await expect(pa.getByTestId('scanner-id')).toHaveText(idA!);
    await pa.screenshot({
      path: testInfo.outputPath('converged-desktop.png'),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
test('isolated profiles, event isolation, invalid imports and mobile layout', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, 'a');
  await admit(page, 'TEST-001');
  await page.getByText('Manual payload fallback').click();
  await page.getByLabel('Incoming payload').fill('{"v":99}');
  await page.getByRole('button', { name: 'Import payload' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Unsupported payload version',
  );
  await page.getByLabel('Test event').selectOption('community-lab');
  await expect(page.getByTestId('attendance')).toHaveText('0');
  await page.goto('/dev/workbench?scanner=b');
  await expect(page.getByTestId('attendance')).toHaveText('0');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('mobile.png'),
    fullPage: true,
  });
});

test('stored operations and cached shell survive a real browser process restart', async ({
  playwright,
  browserName,
}, testInfo) => {
  const engine = playwright[browserName];
  const userDataDir = testInfo.outputPath('persistent-profile');
  const first = await engine.launchPersistentContext(userDataDir, {
    headless: true,
  });
  let scannerId: string;
  try {
    const page = await first.newPage();
    await ready(page, 'restart');
    await admit(page, 'TEST-004');
    scannerId = (await page.getByTestId('scanner-id').textContent())!;
  } finally {
    await first.close();
  }
  const second = await engine.launchPersistentContext(userDataDir, {
    headless: true,
    offline: true,
  });
  try {
    const page = await second.newPage();
    await page.goto('http://127.0.0.1:4173/dev/workbench?scanner=restart');
    await expect(page.getByTestId('operations')).toHaveText('1');
    await expect(page.getByTestId('scanner-id')).toHaveText(scannerId);
  } finally {
    await second.close();
  }
});
test('a maximum five-operation QR frame decodes without a network', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await ready(page, 'max-batch');
    await context.setOffline(true);
    for (let n = 1; n <= 5; n++)
      await admit(page, `TEST-${String(n).padStart(3, '0')}`);
    const image = await batchImage(page);
    await expect(page.getByTestId('outgoing-count')).toContainText(
      'Encoded 5 records',
    );
    await page.getByLabel('Read QR image (local file)').setInputFiles({
      name: 'five.png',
      mimeType: 'image/png',
      buffer: image,
    });
    await expect(page.getByTestId('result-skipped')).toHaveText('5');
    await admit(page, 'TEST-006');
    for (const box of await page.getByRole('checkbox').all()) await box.check();
    await page.getByRole('button', { name: 'Generate QR transfer' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'nothing was truncated',
    );
    await expect(
      page.getByRole('img', {
        name: 'QR transfer containing selected check-in operations',
      }),
    ).toHaveCount(0);
    for (const box of await page.getByRole('checkbox').all())
      await box.uncheck();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Generate QR transfer' }).click();
    await expect(
      page.getByRole('img', {
        name: 'QR transfer containing selected check-in operations',
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Reset selected event…' }).click();
    await page
      .getByRole('button', { name: 'Confirm reset selected event' })
      .click();
    await expect(page.getByTestId('operations')).toHaveText('0');
    await expect(
      page.getByRole('img', {
        name: 'QR transfer containing selected check-in operations',
      }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('decodes the retained WebKit QR detector regression image', async ({
  page,
}) => {
  await ready(page, 'qr-regression');
  await page.context().setOffline(true);
  await page
    .getByLabel('Read QR image (local file)')
    .setInputFiles('tests/fixtures/webkit-qr-regression.png');
  await expect(page.getByTestId('result-imported')).toHaveText('5');
  await expect(page.getByTestId('attendance')).toHaveText('5');
});
