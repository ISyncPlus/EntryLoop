import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecureSyncPanel } from './SecureSyncPanel';
import { useLiveData } from './shared';
import { startReceive, parseFrame } from '../security/exchange';
import { opticalFixtures } from '../../test/optical-fixtures';
import type { EntryLoopDB } from '../check-in/persistence/database';
vi.mock('./shared', async (original) => ({
  ...(await original<typeof import('./shared')>()),
  useLiveData: vi.fn(),
}));
vi.mock('../security/exchange', async (original) => ({
  ...(await original<typeof import('../security/exchange')>()),
  startReceive: vi.fn(),
}));
// Unit presentation stub only: no decoder result or cryptographic success is mocked.
vi.mock('./SecurityTransfer', () => ({
  SecurityInput: () => null,
  SecurityQr: () => <div data-testid="unit-qr">Prior QR</div>,
}));
it('hides the prior QR while a new receiving request is pending', async () => {
  const f = await opticalFixtures(),
    request = parseFrame(JSON.stringify(f.messages.request));
  if (request.k !== 'request')
    throw new Error('Expected signed request fixture');
  vi.mocked(useLiveData).mockReturnValue({
    data: {
      sessions: [],
      session: {
        id: request.q,
        eventId: f.event,
        direction: 'request',
        request,
        frames: {},
      },
      status: '',
    },
    error: '',
  });
  vi.mocked(startReceive).mockImplementation(() => new Promise(() => {}));
  render(<SecureSyncPanel db={{} as EntryLoopDB} eventId={f.event} />);
  expect(screen.getByTestId('unit-qr')).toBeVisible();
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Start receiving' }));
  expect(screen.queryByTestId('unit-qr')).not.toBeInTheDocument();
});
it('blocks exchange actions and codes when saved-session storage cannot be read', () => {
  vi.mocked(useLiveData).mockReturnValue({
    data: undefined,
    error: 'Injected session read failure',
  });
  render(
    <SecureSyncPanel
      db={{ name: 'entryloop-v1-test' } as EntryLoopDB}
      eventId={crypto.randomUUID()}
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Injected session read failure',
  );
  expect(
    screen.queryByRole('button', { name: 'Start receiving' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByTestId('unit-qr')).not.toBeInTheDocument();
});
