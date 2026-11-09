import { test, expect } from '@playwright/test';
import { build } from 'vite';
import { resolve } from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync, deflateRawSync } from 'node:zlib';
import { base45, unbase45 } from '../src/features/sync/optical';
import { cacheApp, createIssued } from './reliability-helpers';
import type { Correction } from '../src/features/sync/qr-render';
let bundle: string;
test.beforeAll(async ({ browserName }, worker) => {
  const bundleRoot = resolve(
    `.cache/qr-audit-harness/${browserName}-${worker.workerIndex}`,
  );
  bundle = resolve(bundleRoot, 'audit.iife.js');
  await build({
    configFile: false,
    logLevel: 'error',
    build: {
      outDir: bundleRoot,
      emptyOutDir: true,
      lib: {
        entry: resolve('tests/qr-harness.ts'),
        name: 'QrAudit',
        formats: ['iife'],
        fileName: () => 'audit.iife.js',
      },
    },
  });
});
test('measures every signed QR format at M/Q/H and decodes real downloads, screenshots and fractional resizes', async ({
  page,
  browserName,
}, info) => {
  test.setTimeout(240000);
  await page.goto('/?scanner=qr-audit');
  await page.addScriptTag({ path: bundle });
  const fixture = await page.evaluate(() => window.qrAudit.fixtures());
  const results: {
    kind: string;
    format: string;
    correction: Correction;
    bytes: number;
    version: number;
    modules: number;
    totalModules: number;
    imageSize: number;
    displaySize: number;
    original: boolean;
    screenshot: boolean;
    fractional240: boolean;
    binaryBytes: number;
    gzipJson: number;
    deflateJson: number;
    gzipBinary: number;
    deflateBinary: number;
    compressedBinaryWireBytes: number;
  }[] = [];
  await page.setContent(
    '<body style="margin:24px;background:#dbe4df"><img id="target" alt="QR benchmark" style="display:block;image-rendering:pixelated"></body>',
  );
  // setContent preserves the realm containing the independently compiled production helpers.
  for (const [kind, message] of Object.entries(fixture.messages)) {
    const json = JSON.stringify(message);
    const packed = await page.evaluate(
      (json) => window.qrAudit.pack(json),
      json,
    );
    const binary = unbase45(packed.slice(5));
    for (const format of ['legacy', 'compact'])
      for (const correction of ['M', 'Q', 'H'] as const) {
        const text = format === 'compact' ? packed : json;
        const qr = await page.evaluate(
          ({ text, correction }) => window.qrAudit.image(text, 320, correction),
          { text, correction },
        );
        const original = await page.evaluate(
          async ({ image, text }) => {
            try {
              return (await window.qrAudit.decode(image)) === text;
            } catch {
              return false;
            }
          },
          { image: qr.image, text },
        );
        await page.locator('#target').evaluate(async (element, qr) => {
          const image = element as HTMLImageElement;
          image.src = qr.image;
          image.style.width = qr.displaySize + 'px';
          image.style.height = qr.displaySize + 'px';
          await image.decode();
        }, qr);
        const capture = await page.locator('#target').screenshot();
        const screenshot = await page.evaluate(
          async ({ image, text }) => {
            try {
              return (await window.qrAudit.decode(image)) === text;
            } catch {
              return false;
            }
          },
          {
            image: 'data:image/png;base64,' + capture.toString('base64'),
            text,
          },
        );
        const fractional240 = await page.evaluate(
          async ({ image, text }) => {
            const source = new Image();
            source.src = image;
            await source.decode();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 240;
            canvas.getContext('2d')!.drawImage(source, 0, 0, 240, 240);
            try {
              return (await window.qrAudit.decode(canvas.toDataURL())) === text;
            } catch {
              return false;
            }
          },
          { image: qr.image, text },
        );
        results.push({
          kind,
          format,
          correction,
          bytes: qr.bytes,
          version: qr.version,
          modules: qr.modules,
          totalModules: qr.totalModules,
          imageSize: qr.imageSize,
          displaySize: qr.displaySize,
          original,
          screenshot,
          fractional240,
          binaryBytes: binary.length,
          gzipJson: gzipSync(json).length,
          deflateJson: deflateRawSync(json).length,
          gzipBinary: gzipSync(binary).length,
          deflateBinary: deflateRawSync(binary).length,
          compressedBinaryWireBytes: 5 + base45(gzipSync(binary)).length,
        });
      }
  }
  await mkdir('.cache/qr-audit-results', { recursive: true });
  await writeFile(
    `.cache/qr-audit-results/${browserName}.json`,
    JSON.stringify(
      { browser: browserName, measurements: results, publicFixtures: fixture },
      null,
      2,
    ),
  );
  await info.attach('QR measurements and actual decode outcomes', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  const chosen = results.filter(
    (row) => row.format === 'compact' && row.correction === 'M',
  );
  expect(chosen).toHaveLength(10);
  expect(chosen.every((row) => row.original && row.screenshot)).toBe(true);
  for (const row of chosen)
    expect(row.bytes).toBeLessThan(
      results.find(
        (before) =>
          before.kind === row.kind &&
          before.format === 'legacy' &&
          before.correction === 'H',
      )!.bytes,
    );
});

test('enrollment images downloaded by the app and actual responsive screenshots preserve signatures at multiple DPRs', async ({
  browser,
}, info) => {
  test.setTimeout(120000);
  for (const ratio of [1, 1.25, 2]) {
    const context = await browser.newContext({
      deviceScaleFactor: ratio,
      viewport: { width: 390, height: 844 },
    });
    try {
      const page = await context.newPage();
      await cacheApp(page, 'http://127.0.0.1:4173/?scanner=qr-organizer');
      await createIssued(page, 'qr-organizer');
      await page
        .getByRole('tab', { name: 'Scanner devices', exact: true })
        .click();
      await page
        .getByText('Use this organizer device for check-in or receiving', {
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'Create enrollment request', exact: true })
        .click();
      const qr = page.getByRole('img', {
        name: 'Authenticated security exchange QR',
        exact: true,
      });
      await expect(qr).toBeVisible();
      await page.addScriptTag({ path: bundle });
      await context.setOffline(true);
      const original = await page
        .getByLabel('Outgoing security payload')
        .inputValue();
      const downloading = page.waitForEvent('download');
      await page
        .getByRole('link', { name: 'Save security QR image', exact: true })
        .click();
      const download = await downloading;
      const bytes = await readFile((await download.path())!);
      const packed = await page.evaluate(
        (image) => window.qrAudit.decode(image),
        'data:image/png;base64,' + bytes.toString('base64'),
      );
      expect(packed.startsWith('ELQ1:')).toBe(true);
      const optics = await page.evaluate(
        async ({ image, packed }) => {
          const source = new Image();
          source.src = image;
          await source.decode();
          const modules = (await window.qrAudit.image(packed)).totalModules;
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = source.naturalWidth;
          const context = canvas.getContext('2d')!;
          context.drawImage(source, 0, 0);
          const data = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          const border = (4 * canvas.width) / modules;
          let blackWhite = true,
            quiet = true;
          for (let y = 0; y < canvas.height; y++)
            for (let x = 0; x < canvas.width; x++) {
              const offset = (y * canvas.width + x) * 4;
              if (
                data[offset + 3] !== 255 ||
                data[offset] !== data[offset + 1] ||
                data[offset] !== data[offset + 2] ||
                ![0, 255].includes(data[offset]!)
              )
                blackWhite = false;
              if (
                (x < border ||
                  y < border ||
                  x >= canvas.width - border ||
                  y >= canvas.height - border) &&
                data[offset] !== 255
              )
                quiet = false;
            }
          return {
            blackWhite,
            quiet,
            integral: Number.isInteger(canvas.width / modules),
            scale: canvas.width / modules,
          };
        },
        { image: 'data:image/png;base64,' + bytes.toString('base64'), packed },
      );
      expect(optics).toEqual({
        blackWhite: true,
        quiet: true,
        integral: true,
        scale: 8,
      });
      expect(
        JSON.parse(
          await page.evaluate((text) => window.qrAudit.unpack(text), packed),
        ),
      ).toEqual(JSON.parse(original));
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(() =>
            qr.evaluate((image) => {
              const element = image as HTMLImageElement;
              const modules = Number(element.dataset.totalModules),
                pixels =
                  (parseFloat(element.style.width) * window.devicePixelRatio) /
                  modules;
              return Math.abs(pixels - Math.round(pixels)) < 0.0001;
            }),
          )
          .toBe(true);
        const screenshot = await qr.screenshot();
        expect(
          await page.evaluate(
            (image) => window.qrAudit.decode(image),
            'data:image/png;base64,' + screenshot.toString('base64'),
          ),
        ).toBe(packed);
        await info.attach(`enrollment-${ratio}dpr-${width}px`, {
          body: screenshot,
          contentType: 'image/png',
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
      await page
        .getByText('Compatibility & QR details', { exact: true })
        .click();
      await page
        .getByLabel('Compatibility QR (JSON for older EntryLoop)', {
          exact: true,
        })
        .check();
      await expect(page.getByTestId('security-qr-statistics')).toContainText(
        'JSON bytes',
      );
      await expect
        .poll(() => qr.getAttribute('src'))
        .not.toBe('data:image/png;base64,' + bytes.toString('base64'));
      const legacy = await qr.getAttribute('src');
      expect(
        await page.evaluate((image) => window.qrAudit.decode(image!), legacy),
      ).toBe(original);
      if (ratio === 1) {
        await page.getByText('Advanced text import', { exact: true }).click();
        const incoming = page.getByLabel('Incoming security payload', {
          exact: true,
        });
        const process = page.getByRole('button', {
          name: 'Process security payload',
          exact: true,
        });
        const forged = await page.evaluate(
          (original) =>
            window.qrAudit.pack(
              JSON.stringify({
                ...(JSON.parse(original) as object),
                l: 'Modified alias',
              }),
            ),
          original,
        );
        await incoming.fill(forged);
        await process.click();
        await expect(page.getByRole('alert')).toContainText(
          'invalid scanner enrollment proof',
        );
        await expect(page.getByTestId('authorization-status')).toHaveText(
          'Not authorized for admissions',
        );
        await incoming.fill(packed);
        await process.click();
        await expect(
          page.getByLabel('Confirm scanner fingerprint'),
        ).toBeVisible();
        const fingerprint = await page
          .getByTestId('scanner-fingerprint')
          .textContent();
        await page.getByLabel('Confirm scanner fingerprint').fill(fingerprint!);
        await page
          .getByRole('button', {
            name: 'Authorize requested scanner',
            exact: true,
          })
          .click();
        await expect(page.getByRole('status')).toContainText(
          'Authorization signed',
        );
        const responseImage = await qr.getAttribute('src');
        const credential = await page.evaluate(
          (image) => window.qrAudit.decode(image!),
          responseImage,
        );
        expect(credential.startsWith('ELQ1:')).toBe(true);
        await incoming.fill(credential);
        await process.click();
        await expect(page.getByTestId('authorization-status')).toHaveText(
          'Authorized for this event',
        );
      }
    } finally {
      await context.close();
    }
  }
});

test('new and legacy full ticket SVG downloads decode actual QR pixels and retain native signature checks', async ({
  page,
}) => {
  await page.goto('/?scanner=qr-tickets');
  await page.addScriptTag({ path: bundle });
  const f = await page.evaluate(() => window.qrAudit.fixtures());
  const ticket = f.messages.ticket as {
    k: 'ELT';
    v: 1;
    e: string;
    t: string;
    s: string;
  };
  for (const legacy of [false, true]) {
    const svg = await page.evaluate(
      async ({ f, ticket, legacy }) =>
        window.qrAudit.ticketSvg(
          {
            id: f.event,
            name: 'Synthetic QR audit',
            date: '2026-11-20',
            location: 'Test venue',
            description: '',
            revision: 1,
            publicKey: f.organizerKey,
            fingerprint: '',
            role: 'organizer',
            locked: true,
          },
          {
            id: 'test-attendee',
            eventId: f.event,
            ticketId: ticket.t,
            name: 'Synthetic Guest',
            email: 'guest@example.com',
          },
          {
            eventId: f.event,
            ticketId: ticket.t,
            attendeeId: 'test-attendee',
            payload: JSON.stringify(ticket),
            issuedAt: '2026-11-06T12:00:00.000Z',
          },
          legacy,
        ),
      { f, ticket, legacy },
    );
    const wire = await page.evaluate(
      async (svg) =>
        window.qrAudit.read(
          new File([svg], 'ticket.svg', { type: 'image/svg+xml' }),
        ),
      svg,
    );
    expect(wire.startsWith('ELQ1:')).toBe(!legacy);
    expect(
      await page.evaluate(
        ({ wire, f }) =>
          window.qrAudit.verifyTicket(wire, f.event, f.organizerKey),
        { wire, f },
      ),
    ).toEqual(ticket);
  }
});
