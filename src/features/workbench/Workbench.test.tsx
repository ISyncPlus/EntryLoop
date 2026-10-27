import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Workbench } from './Workbench';
import { EntryLoopDB } from '../check-in/persistence/database';
import { encodeTransfer } from '../sync/codec';
import { eventId, record, scannerB } from '../../test/records';
const databases: EntryLoopDB[] = [];
afterEach(async () => {
  for (const db of databases) await db.delete();
  databases.length = 0;
});
async function setup() {
  const db = new EntryLoopDB(crypto.randomUUID().replaceAll('-', ''));
  databases.push(db);
  const user = userEvent.setup();
  render(<Workbench db={db} />);
  await screen.findByRole('button', { name: 'Admit ticket' });
  return { db, user };
}
describe('real workbench integration', () => {
  it('creates, persists and rejects locally duplicate check-ins; events stay isolated', async () => {
    const { db, user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Admit ticket' }));
    await waitFor(() =>
      expect(screen.getByTestId('attendance')).toHaveTextContent('1'),
    );
    expect(await db.records(eventId)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Admit ticket' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'already admitted',
    );
    await user.selectOptions(
      screen.getByLabelText('Test event'),
      'community-lab',
    );
    await waitFor(() =>
      expect(screen.getByTestId('attendance')).toHaveTextContent('0'),
    );
  });
  it('imports actual payloads, reports real counters, preserves conflicts and skips repeats', async () => {
    const { db, user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Admit ticket' }));
    await waitFor(() =>
      expect(screen.getByTestId('attendance')).toHaveTextContent('1'),
    );
    const payload = await encodeTransfer(eventId, [
      record(7, 'TEST-001', scannerB.id),
    ]);
    await user.click(screen.getByText('Manual payload fallback'));
    await user.click(screen.getByLabelText('Incoming payload'));
    await user.paste(payload);
    await user.click(screen.getByRole('button', { name: 'Import payload' }));
    await waitFor(() =>
      expect(screen.getByTestId('result-imported')).toHaveTextContent('1'),
    );
    expect(screen.getByTestId('conflicts')).toHaveTextContent('1');
    expect(screen.getByTestId('attendance')).toHaveTextContent('1');
    expect(await db.records(eventId)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Import payload' }));
    await waitFor(() =>
      expect(screen.getByTestId('result-skipped')).toHaveTextContent('1'),
    );
    expect(screen.getByTestId('result-imported')).toHaveTextContent('0');
    expect(screen.getByTestId('result-rejected')).toHaveTextContent('0');
  });
  it('rejects malformed input visibly and requires a scoped reset confirmation', async () => {
    const { db, user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Admit ticket' }));
    await waitFor(() =>
      expect(screen.getByTestId('attendance')).toHaveTextContent('1'),
    );
    await user.click(screen.getByText('Manual payload fallback'));
    await user.type(screen.getByLabelText('Incoming payload'), 'broken');
    await user.click(screen.getByRole('button', { name: 'Import payload' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid JSON');
    await user.click(
      screen.getByRole('button', { name: 'Reset selected event…' }),
    );
    expect(await db.records(eventId)).toHaveLength(1);
    await user.click(
      screen.getByRole('button', { name: 'Confirm reset selected event' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('attendance')).toHaveTextContent('0'),
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Operation ledger' }),
      ).getByText(/No admissions stored/),
    ).toBeVisible();
  });
  it('reports rejected record counts for a valid-schema wrong-event batch', async () => {
    const { user } = await setup();
    const payload = await encodeTransfer('community-lab', [
      { ...record(1), eventId: 'community-lab' },
    ]);
    await user.click(screen.getByText('Manual payload fallback'));
    await user.click(screen.getByLabelText('Incoming payload'));
    await user.paste(payload);
    await user.click(screen.getByRole('button', { name: 'Import payload' }));
    await waitFor(() =>
      expect(screen.getByTestId('result-rejected')).toHaveTextContent('1'),
    );
    expect(screen.getByTestId('result-transferred')).toHaveTextContent('1');
    expect(screen.getByTestId('attendance')).toHaveTextContent('0');
  });
  it('does not silently truncate an oversized manual payload', async () => {
    const { user } = await setup();
    await user.click(screen.getByText('Manual payload fallback'));
    const input = screen.getByLabelText('Incoming payload');
    await user.click(input);
    await user.paste('x'.repeat(901));
    expect(input).toHaveValue('x'.repeat(901));
    await user.click(screen.getByRole('button', { name: 'Import payload' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('capacity');
    expect(screen.queryByTestId('result-rejected')).not.toBeInTheDocument();
  });
});
