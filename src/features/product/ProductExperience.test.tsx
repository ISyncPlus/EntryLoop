import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventOverview } from './EventOverview';
import { EntryLoopDB } from '../check-in/persistence/database';
import { createEvent } from '../events/repository';
import { AdmissionFeedback } from './AdmissionFeedback';
import { ExchangeGuide } from './ExchangeGuide';
import { EnrollmentGuide } from './EnrollmentGuide';
it('keeps an invalid signature rejected and provides an ordinary next action', () => {
  render(
    <AdmissionFeedback
      busy={false}
      last={null}
      error="Invalid ticket signature."
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Ticket could not be verified',
  );
  expect(
    screen.queryByText('Admitted', { exact: true }),
  ).not.toBeInTheDocument();
});
it('distinguishes asking to send from a received confirmation', () => {
  render(
    <ExchangeGuide
      session={undefined}
      sending
      missing={0}
      index={0}
      total={0}
    />,
  );
  expect(screen.getByRole('heading')).toHaveTextContent(
    'Scan the receiving device’s request',
  );
  expect(screen.queryByText(/Confirmation received/)).not.toBeInTheDocument();
});
it('does not mistake preparation for authorization or shorten independent trust checks', () => {
  const view = render(
    <EnrollmentGuide
      organizer={false}
      authorized={false}
      revoked={false}
      outgoing={false}
      reviewing={false}
    />,
  );
  expect(screen.getByText(/does not grant permission/)).toBeVisible();
  view.rerender(
    <EnrollmentGuide
      organizer
      authorized={false}
      revoked={false}
      outgoing={false}
      reviewing
    />,
  );
  expect(
    screen.getByText(/every fingerprint character on that phone/),
  ).toBeVisible();
});
it('keeps advanced controls behind an operable native disclosure', async () => {
  render(
    <details>
      <summary>Advanced information</summary>
      <button>Inspect records</button>
    </details>,
  );
  const user = userEvent.setup();
  await user.tab();
  expect(screen.getByText('Advanced information')).toHaveFocus();
  await user.click(screen.getByText('Advanced information'));
  expect(screen.getByRole('button', { name: 'Inspect records' })).toBeVisible();
});

it('does not invent progress for an empty event, and gives a real next step after issuance', async () => {
  const db = new EntryLoopDB(crypto.randomUUID().replaceAll('-', ''));
  try {
    const event = await createEvent(db, {
      name: 'Fictional rehearsal',
      date: '2026-11-19',
      location: 'Test hall',
      description: '',
    });
    const onView = vi.fn();
    const view = render(
      <EventOverview
        event={event}
        guests={0}
        issued={0}
        credentials={[]}
        policy={undefined}
        conflicts={0}
        operations={[]}
        onView={onView}
      />,
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Build guest list' }));
    expect(onView).toHaveBeenCalledWith('Guest list');
    view.rerender(
      <EventOverview
        event={event}
        guests={3}
        issued={2}
        credentials={[]}
        policy={undefined}
        conflicts={0}
        operations={[]}
        onView={onView}
      />,
    );
    expect(
      screen.getByRole('progressbar', { name: 'Ticket issuance' }),
    ).toHaveAttribute('value', '2');
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '3');
    expect(
      screen.getByRole('button', { name: 'Issue remaining tickets' }),
    ).toBeVisible();
  } finally {
    await db.delete();
  }
});
