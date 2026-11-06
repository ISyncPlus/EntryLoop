import { afterEach, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraScanner } from './CameraScanner';
const state = vi.hoisted(() => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release: () => release(), start: vi.fn() };
});
vi.mock('@zxing/browser', async () => {
  await state.gate;
  return {
    BrowserQRCodeReader: class {
      decodeFromVideoDevice(...args: unknown[]) {
        return state.start(...args);
      }
    },
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'mediaDevices');
});
it('never starts camera capture after the user cancels while the decoder is loading', async () => {
  vi.stubGlobal('isSecureContext', true);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
  render(<CameraScanner onPayload={vi.fn()} disabled={false} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Scan with camera' }));
  await user.click(screen.getByRole('button', { name: 'Stop camera' }));
  await act(async () => {
    state.release();
    await vi.dynamicImportSettled();
  });
  expect(state.start).not.toHaveBeenCalled();
});
