import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScannerAuthority } from './ScannerAuthority';
import { useLiveData } from './shared';
import { enrollmentRequest } from '../security/authority';
import { opticalFixtures } from '../../test/optical-fixtures';
import type { EntryLoopDB } from '../check-in/persistence/database';
import type { ManagedEvent } from '../events/models';
vi.mock('./shared', async (original) => ({
  ...(await original<typeof import('./shared')>()),
  useLiveData: vi.fn(),
}));
vi.mock('../security/authority', async (original) => ({
  ...(await original<typeof import('../security/authority')>()),
  enrollmentRequest: vi.fn(),
}));
// Presentation-only stub; real protocol verification remains covered by security tests.
vi.mock('./SecurityTransfer', () => ({
  SecurityInput: () => null,
  SecurityQr: () => <div data-testid="unit-qr">Prior QR</div>,
}));
const db = { name: 'entryloop-v1-test' } as EntryLoopDB;
async function event(): Promise<ManagedEvent> {
  const f = await opticalFixtures();
  return {
    id: f.event,
    name: 'Fictional event',
    date: '2026-11-19',
    location: 'Test lab',
    description: '',
    revision: 1,
    publicKey: f.organizerKey,
    fingerprint: 'a'.repeat(64),
    role: 'scanner',
    locked: true,
  };
}
it('does not report missing approval or enable enrollment while authorization storage is loading or failed', async () => {
  const e = await event();
  vi.mocked(useLiveData).mockReturnValue({ data: undefined, error: '' });
  const view = render(<ScannerAuthority db={db} event={e} />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'Opening saved scanner authorization',
  );
  expect(screen.queryByTestId('authorization-status')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Create enrollment request' }),
  ).not.toBeInTheDocument();
  vi.mocked(useLiveData).mockReturnValue({
    data: undefined,
    error: 'Injected credential read failure',
  });
  view.rerender(<ScannerAuthority db={db} event={e} />);
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Injected credential read failure',
  );
  expect(screen.getByTestId('storage-error')).toHaveTextContent(
    'Do not clear site data',
  );
  expect(screen.queryByTestId('authorization-status')).not.toBeInTheDocument();
});
it('does not redisplay an old enrollment QR after a replacement request fails', async () => {
  const f = await opticalFixtures();
  vi.mocked(useLiveData).mockReturnValue({
    data: { own: undefined, policy: f.messages.policy, credentials: [] },
    error: '',
  });
  vi.mocked(enrollmentRequest)
    .mockResolvedValueOnce(f.messages.enrollment)
    .mockRejectedValueOnce(new Error('Injected write failure'));
  render(<ScannerAuthority db={db} event={await event()} />);
  const user = userEvent.setup(),
    button = screen.getByRole('button', { name: 'Create enrollment request' });
  await user.click(button);
  expect(screen.getByTestId('unit-qr')).toBeVisible();
  await user.click(button);
  expect(screen.getByRole('alert')).toHaveTextContent('Injected write failure');
  expect(screen.queryByTestId('unit-qr')).not.toBeInTheDocument();
});
