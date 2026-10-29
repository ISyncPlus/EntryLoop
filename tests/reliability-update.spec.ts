import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import {
  cacheApp,
  createIssued,
  nativeSnapshot,
  authorizeOwn,
} from './reliability-helpers';
const execute = promisify(execFile);
test('two actual production builds and a waiting service-worker update preserve keys, credentials and signed operations', async ({
  playwright,
  browserName,
}, info) => {
  test.setTimeout(90000);
  const rootA = resolve(`.cache/reliability-builds/${browserName}-a`),
    rootB = resolve(`.cache/reliability-builds/${browserName}-b`);
  for (const [root, build] of [
    [rootA, 'reliability-build-A'],
    [rootB, 'reliability-build-B'],
  ] as const) {
    await execute(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'build', '--outDir', root],
      {
        cwd: process.cwd(),
        env: { ...process.env, ENTRYLOOP_BUILD_ID: build },
        timeout: 30000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
  }
  const config = JSON.parse(await readFile('vercel.json', 'utf8')) as {
    rewrites: { source: string; destination: string }[];
  };
  expect(config.rewrites).toContainEqual({
    source: '/(.*)',
    destination: '/index.html',
  });
  let root = rootA;
  const server = createServer((request, response) => {
    void (async () => {
      try {
        const pathname = decodeURIComponent(
          new URL(request.url!, 'http://localhost').pathname,
        );
        let path = resolve(root, '.' + pathname);
        if (!path.startsWith(root + '/') && path !== root) {
          response.writeHead(403);
          response.end();
          return;
        }
        try {
          if ((await stat(path)).isDirectory())
            path = resolve(path, 'index.html');
          await stat(path);
        } catch {
          path = resolve(root, '.' + config.rewrites[0]!.destination);
        }
        const types: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.webmanifest': 'application/manifest+json',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.woff2': 'font/woff2',
        };
        response.writeHead(200, {
          'Content-Type': types[extname(path)] ?? 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        response.end(await readFile(path));
      } catch {
        response.writeHead(500);
        response.end('Fixture server read failed');
      }
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Fixture origin unavailable');
  const origin = `http://127.0.0.1:${address.port}`,
    dir = info.outputPath('compatible-update-profile');
  let context = await playwright[browserName].launchPersistentContext(dir, {
    headless: true,
  });
  try {
    let page = await context.newPage();
    await cacheApp(page, origin + '/?scanner=organizer');
    const id = await createIssued(page, 'organizer', origin);
    await authorizeOwn(page);
    const issued = await nativeSnapshot(page);
    await page
      .getByRole('link', { name: 'Open check-in', exact: true })
      .click();
    await page
      .getByText('Use an image or payload instead', { exact: true })
      .click();
    await page
      .getByLabel('Signed ticket payload')
      .fill((issued.rows.issuedTickets as { payload: string }[])[0]!.payload);
    await page.getByRole('button', { name: 'Verify and admit ticket' }).click();
    await expect(page.getByTestId('real-operations')).toHaveText('1');
    const before = await nativeSnapshot(page);
    await page
      .getByText('Scanner authorization and policy', { exact: true })
      .click();
    await expect(page.getByTestId('build-id')).toHaveText(
      'reliability-build-A',
    );
    root = rootB;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('No real service worker');
      await registration.update();
    });
    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
        ),
      )
      .toBe(true);
    await expect(page.getByTestId('app-update-waiting')).toBeVisible();
    expect(await nativeSnapshot(page)).toEqual(before);
    await context.close();
    context = await playwright[browserName].launchPersistentContext(dir, {
      headless: true,
    });
    page = await context.newPage();
    await page.goto(origin + `/events/${id}?scanner=organizer`);
    await expect(page.getByTestId('issued-count')).toHaveText('3');
    await page
      .getByText('Storage context and recovery', { exact: true })
      .click();
    await expect(page.getByTestId('build-id')).toHaveText(
      'reliability-build-B',
    );
    expect(await nativeSnapshot(page)).toEqual(before);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('attendee-count')).toHaveText('3');
    expect(await nativeSnapshot(page)).toEqual(before);
    await page
      .getByRole('link', { name: 'Open check-in', exact: true })
      .click();
    await page
      .getByText('Use an image or payload instead', { exact: true })
      .click();
    await page
      .getByLabel('Signed ticket payload')
      .fill((issued.rows.issuedTickets as { payload: string }[])[1]!.payload);
    await page.getByRole('button', { name: 'Verify and admit ticket' }).click();
    await expect(page.getByTestId('real-operations')).toHaveText('2');
    expect((await nativeSnapshot(page)).keys).toEqual(before.keys);
  } finally {
    await context.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
