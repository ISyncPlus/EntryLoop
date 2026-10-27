import { afterEach, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryLoopDB } from '../check-in/persistence/database';
import { createEvent, updateEvent } from '../events/repository';
import { EventForm } from './EventForm';
const databases: EntryLoopDB[] = [];
afterEach(async () => {
  for (const db of databases) await db.delete();
  databases.length = 0;
});
it('protects a loaded draft from overwriting a newer live revision', async () => {
  const db = new EntryLoopDB(crypto.randomUUID().replaceAll('-', ''));
  databases.push(db);
  const fields = {
    name: 'Open Room',
    date: '2026-11-12',
    location: 'Lagos',
    description: 'Original',
  };
  const initial = await createEvent(db, fields);
  const user = userEvent.setup();
  const view = render(<EventForm db={db} event={initial} />);
  await user.clear(screen.getByLabelText('Description'));
  await user.type(screen.getByLabelText('Description'), 'Local draft');
  await updateEvent(
    db,
    initial.id,
    { ...fields, description: 'Another tab' },
    initial.revision,
  );
  const updated = (await db.events.get(initial.id))!;
  view.rerender(<EventForm db={db} event={updated} />);
  await user.click(screen.getByRole('button', { name: 'Save event' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('another tab');
  expect((await db.events.get(initial.id))?.description).toBe('Another tab');
  await user.click(
    screen.getByRole('button', {
      name: 'Reload current event details (discard draft)',
    }),
  );
  expect(screen.getByLabelText('Description')).toHaveValue('Another tab');
});
