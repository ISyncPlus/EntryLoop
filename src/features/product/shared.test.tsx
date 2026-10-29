import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useLiveData, href } from './shared';
import { EventList } from './EventList';
import { createEvent } from '../events/repository';
import { EntryLoopDB } from '../check-in/persistence/database';
import { afterEach } from 'vitest';
const databases: EntryLoopDB[] = [];
afterEach(async () => {
  for (const db of databases) await db.delete();
  databases.length = 0;
});
function Probe({ query }: { query: () => Promise<string[]> }) {
  const { data, error } = useLiveData(query);
  return (
    <div>
      {error ? (
        <p role="alert">{error}</p>
      ) : data ? (
        <p>{data.length ? data.join(',') : 'Loaded empty'}</p>
      ) : (
        <p>Loading query</p>
      )}
    </div>
  );
}
describe('read failure and query lifecycle boundaries', () => {
  it('removes a previously loaded empty screen when the same live query later fails', async () => {
    const db = new EntryLoopDB(crypto.randomUUID().replaceAll('-', ''));
    databases.push(db);
    await db.open();
    const original = db.events.orderBy.bind(db.events);
    let fail = false;
    vi.spyOn(db.events, 'orderBy').mockImplementation((index) => {
      if (fail) throw new Error('Later storage read failed');
      return original(index);
    });
    render(<EventList db={db} />);
    await screen.findByText('No organizer events in this workspace.');
    fail = true;
    await act(async () => {
      await createEvent(db, {
        name: 'Retained event',
        date: '2026-11-12',
        location: 'Lab',
        description: '',
      });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Later storage read failed',
    );
    expect(
      screen.queryByText('No organizer events in this workspace.'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Create an event in this workspace'),
    ).not.toBeInTheDocument();
    expect(await db.events.count()).toBe(1);
  });

  it('does not render empty organizer state when the database read fails', async () => {
    const db = new EntryLoopDB(crypto.randomUUID().replaceAll('-', ''));
    databases.push(db);
    await db.open();
    vi.spyOn(db.events, 'orderBy').mockImplementation(() => {
      throw new Error('Synthetic read failure');
    });
    render(<EventList db={db} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Synthetic read failure',
    );
    expect(
      screen.queryByText('Create an event in this workspace'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('No organizer events in this workspace.'),
    ).not.toBeInTheDocument();
  });
  it('clears a previous empty result when changing to a failed query', async () => {
    const good = () => Promise.resolve<string[]>([]),
      bad = () => Promise.reject(new Error('Storage unavailable'));
    const view = render(<Probe query={good} />);
    await screen.findByText('Loaded empty');
    view.rerender(<Probe query={bad} />);
    expect(screen.queryByText('Loaded empty')).not.toBeInTheDocument();
    await screen.findByRole('alert');
    expect(screen.queryByText('Loaded empty')).not.toBeInTheDocument();
  });
  it('does not let an old pending query replace a newer workspace result', async () => {
    let finish: (value: string[]) => void = () => {};
    const old = () =>
      new Promise<string[]>((resolve) => {
        finish = resolve;
      });
    const current = () => Promise.resolve(['Current workspace']);
    const view = render(<Probe query={old} />);
    await screen.findByText('Loading query');
    view.rerender(<Probe query={current} />);
    await screen.findByText('Current workspace');
    await act(async () => {
      finish(['Old workspace']);
    });
    await waitFor(() =>
      expect(screen.getByText('Current workspace')).toBeVisible(),
    );
    expect(screen.queryByText('Old workspace')).not.toBeInTheDocument();
  });
  it('clears a previous query error when a new read succeeds', async () => {
    const bad = () => Promise.reject(new Error('Read failed')),
      good = () => Promise.resolve(['Stored event']);
    const view = render(<Probe query={bad} />);
    await screen.findByRole('alert');
    view.rerender(<Probe query={good} />);
    await screen.findByText('Stored event');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('includes the namespace even when the source URL omitted it', () => {
    expect(href('/scan')).toContain('scanner=main');
  });
});
