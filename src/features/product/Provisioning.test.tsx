import { afterEach, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryLoopDB } from '../check-in/persistence/database';
import {
  createEvent,
  addAttendees,
  issueTickets,
  exportEventPackage,
} from '../events/repository';
import { PackageImport } from './Provisioning';
const databases: EntryLoopDB[] = [];
afterEach(async () => {
  for (const db of databases) await db.delete();
  databases.length = 0;
});
it('retains a selected package until asynchronous reading finishes and then allows the same file again', async () => {
  const org = new EntryLoopDB(crypto.randomUUID().replaceAll('-', ''));
  const scanner = new EntryLoopDB(crypto.randomUUID().replaceAll('-', ''));
  databases.push(org, scanner);
  const event = await createEvent(org, {
    name: 'File lifetime',
    date: '2026-11-12',
    location: 'Lagos',
    description: '',
  });
  await addAttendees(org, event.id, [
    { name: 'Guest', email: 'guest@example.com' },
  ]);
  await issueTickets(org, event.id, [(await org.attendees.toArray())[0]!.id]);
  const text = await exportEventPackage(org, event.id);
  let finish: (value: string) => void = () => {
    throw new Error('File read did not start');
  };
  const pending = new Promise<string>((resolve) => {
    finish = resolve;
  });
  const file = new File([text], 'event.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => pending });
  render(<PackageImport db={scanner} />);
  const input = screen.getByLabelText<HTMLInputElement>('Choose event package');
  const user = userEvent.setup();
  await user.upload(input, file);
  expect(input.files?.[0]).toBe(file);
  expect(input).toBeDisabled();
  await act(async () => {
    finish(text);
  });
  await screen.findByLabelText('Organizer fingerprint');
  await waitFor(() => expect(input.files).toHaveLength(0));
  expect(input).not.toBeDisabled();
  await user.upload(input, file);
  expect(
    await screen.findByRole('heading', { name: 'File lifetime' }),
  ).toBeVisible();
  expect(await scanner.events.count()).toBe(0);
});
