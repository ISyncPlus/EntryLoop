import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecurityQr } from './SecurityTransfer';
import { makeQrImage } from '../sync/qr';
vi.mock('../sync/qr', () => ({ makeQrImage: vi.fn(), readQrImage: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
it('hides the previous format immediately while a compatibility QR is being prepared', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const first = {
    image: 'first.png',
    displaySize: 100,
    version: 1,
    modules: 21,
    totalModules: 29,
    correction: 'M' as const,
    bytes: 10,
    imageSize: 232,
  };
  let finish!: (qr: typeof first) => void;
  vi.mocked(makeQrImage)
    .mockResolvedValueOnce(first)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  render(<SecurityQr text='{"v":1}' />);
  expect(
    await screen.findByAltText('Authenticated security exchange QR'),
  ).toHaveAttribute('src', 'first.png');
  await userEvent
    .setup()
    .click(
      screen.getByLabelText('Compatibility QR (JSON for older EntryLoop)'),
    );
  expect(
    screen.queryByAltText('Authenticated security exchange QR'),
  ).not.toBeInTheDocument();
  finish({ ...first, image: 'compatibility.png' });
  expect(
    await screen.findByAltText('Authenticated security exchange QR'),
  ).toHaveAttribute('src', 'compatibility.png');
});
