import { test, expect } from '@playwright/test';
import { readFile, writeFile, mkdir, symlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, join } from 'node:path';
import { cacheApp, createIssued } from './reliability-helpers';
const execute = promisify(execFile);
test('build identity, safe diagnostics, direct routes and first-use lazy QR decoding work offline', async ({
  page,
  browserName,
}, info) => {
  await cacheApp(page, 'http://127.0.0.1:4173/?scanner=readiness');
  const build = JSON.parse(await readFile('dist/build-info.json', 'utf8')) as {
    build: string;
    revision: string;
    dirty: boolean | null;
  };
  expect(await (await page.request.get('/build-info.json')).json()).toEqual(
    build,
  );
  await expect(page.getByTestId('build-id')).toHaveText(build.build);
  await expect(page.getByTestId('source-revision')).toContainText(
    build.revision,
  );
  await createIssued(page, 'readiness');
  const storage = page.locator('#workspace-storage');
  if ((await storage.getAttribute('open')) === null)
    await storage.locator('summary').click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download read-only storage diagnostic' })
    .click();
  const diagnostic = await readFile((await (await download).path())!, 'utf8');
  expect(diagnostic).not.toContain('@');
  expect(diagnostic).not.toContain('Test One');
  expect(diagnostic).not.toContain('"privateKey"');
  for (const path of [
    '/scan?scanner=readiness',
    '/events/new?scanner=readiness',
  ]) {
    await page.goto(path);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('/dev/workbench?scanner=stage3-perf');
  await expect(
    page.getByRole('button', { name: 'Admit ticket', exact: true }),
  ).toBeVisible();
  const scripts = () =>
    page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((r) => r.name.includes('/assets/') && r.name.endsWith('.js'))
        .map((r) => ({
          name: r.name.split('/').pop(),
          bytes: (r as PerformanceResourceTiming).decodedBodySize,
        })),
    );
  const before = await scripts();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Admit ticket', exact: true }).click();
  await expect(page.getByTestId('operations')).toHaveText('1');
  await page.getByRole('checkbox').first().check();
  const qrStart = Date.now();
  await page
    .getByRole('button', { name: 'Generate QR transfer', exact: true })
    .click();
  const image = page.getByRole('img', {
    name: 'QR transfer containing selected check-in operations',
    exact: true,
  });
  await expect(image).toBeVisible();
  const qrMs = Date.now() - qrStart;
  const data = Buffer.from(
    (await image.getAttribute('src'))!.split(',')[1]!,
    'base64',
  );
  const decodeStart = Date.now();
  await page
    .getByLabel('Read QR image (local file)', { exact: true })
    .setInputFiles({
      name: 'real-pixels.png',
      mimeType: 'image/png',
      buffer: data,
    });
  await expect(page.getByTestId('result-skipped')).toHaveText('1');
  const decodeMs = Date.now() - decodeStart,
    after = await scripts();
  expect(after.some((r) => !before.some((p) => p.name === r.name))).toBe(true);
  await page.reload();
  await expect(page.getByTestId('operations')).toHaveText('1');
  await mkdir('.cache/stage3', { recursive: true });
  const metrics = {
    browser: browserName,
    build,
    beforeDecoder: before,
    afterDecoder: after,
    generationWorkflowMs: qrMs,
    firstDecodeWorkflowMs: decodeMs,
    offlineFirstDecode: true,
    physicalCamera: false,
  };
  await writeFile(
    `.cache/stage3/readiness-${browserName}.json`,
    JSON.stringify(metrics, null, 2),
  );
  await info.attach('readiness and observed timings', {
    body: JSON.stringify(metrics),
    contentType: 'application/json',
  });
});

test('staging snapshot excludes browser/credential stores and refuses sensitive paths and symlinks', async ({
  browserName,
}, info) => {
  const root = info.outputPath('isolated-snapshot-source-' + browserName);
  await mkdir(join(root, 'dist'), { recursive: true });
  await writeFile(
    join(root, 'dist/build-info.json'),
    JSON.stringify({
      build: '0123456789ab',
      revision: 'a'.repeat(40),
      dirty: true,
    }),
  );
  const files = [
    'package.json',
    'package-lock.json',
    'index.html',
    'vite.config.ts',
    'tsconfig.json',
    'eslint.config.js',
    'playwright.config.ts',
    'vercel.json',
    '.gitignore',
    '.prettierrc.json',
    '.prettierignore',
    '.npmrc',
    'README.md',
    'AGENTS.md',
    'THIRD_PARTY_NOTICES.md',
  ];
  for (const file of files) await writeFile(join(root, file), '');
  for (const directory of [
    'src',
    'public',
    'tests',
    'scripts',
    '.vercel',
    '.cache',
  ])
    await mkdir(join(root, directory));
  await writeFile(join(root, '.env'), 'synthetic secret marker');
  await writeFile(join(root, '.vercel/project.json'), 'production-link-marker');
  const command = resolve('scripts/prepare-staging.mjs');
  await execute(process.execPath, [command], { cwd: root });
  const manifest = JSON.parse(
    await readFile(join(root, '.cache/stage3/staging-latest.json'), 'utf8'),
  ) as {
    files: { path: string }[];
    target: string;
    deploymentPerformed: boolean;
  };
  expect(manifest.deploymentPerformed).toBe(false);
  expect(
    manifest.files.some(
      (f) =>
        f.path.startsWith('.vercel') ||
        f.path.startsWith('.env') ||
        f.path.startsWith('.cache'),
    ),
  ).toBe(false);
  expect(
    JSON.parse(
      await readFile(join(manifest.target, 'build-provenance.json'), 'utf8'),
    ),
  ).toEqual({ revision: 'a'.repeat(40), dirty: true });
  await writeFile(join(root, 'public/secret.key'), 'synthetic marker');
  await expect(
    execute(process.execPath, [command], { cwd: root }),
  ).rejects.toThrow('sensitive path');
  // Separate fixture avoids deleting evidence from the first two runs.
  const linked = join(root, 'src/link');
  await symlink(join(root, 'README.md'), linked);
  await expect(
    execute(process.execPath, [command], { cwd: root }),
  ).rejects.toThrow('symbolic links');
});
