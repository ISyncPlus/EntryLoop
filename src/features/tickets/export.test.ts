import { describe, expect, it } from 'vitest';
import { renderTicketSvg, renderTicketSheet } from './export';
import type { ManagedEvent, Attendee, IssuedTicket } from '../events/models';
const event = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Room <script>alert(1)</script>',
  date: '2026-11-12',
  location: 'Lagos & beyond',
  description: '',
  revision: 1,
  role: 'organizer',
  locked: true,
} as ManagedEvent;
const attendee: Attendee = {
  id: 'a',
  eventId: event.id,
  name: 'Ada <img src=x onerror=alert(1)>',
  email: 'ada@example.com',
  ticketId: 'T-123',
};
const ticket: IssuedTicket = {
  eventId: event.id,
  ticketId: 'T-123',
  attendeeId: 'a',
  payload: 'test QR payload',
  issuedAt: '2026-10-27T00:00:00.000Z',
};
describe('safe offline ticket exports', () => {
  it('escapes personal/event text and retains the QR viewBox and exact opaque ticket ID', async () => {
    const svg = await renderTicketSvg(event, attendee, ticket);
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('T-123');
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(svg).not.toContain('ada@example.com');
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelectorAll('svg').length).toBe(2);
  });
  it('exports an offline printable sheet without external resources or scripts', async () => {
    const html = await renderTicketSheet(event, [attendee], [ticket]);
    expect(html).toContain('<article>');
    expect(html).not.toContain('<script>');
    expect(html).not.toMatch(/(?:src|href)="https?:/);
  });
  it('rejects mismatched identities and unsupported sheet sizes', async () => {
    await expect(
      renderTicketSvg(event, { ...attendee, eventId: 'other' }, ticket),
    ).rejects.toThrow('mismatch');
    await expect(renderTicketSheet(event, [attendee], [])).rejects.toThrow(
      '1–500',
    );
  });
});
