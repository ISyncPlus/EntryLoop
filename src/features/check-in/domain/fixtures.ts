import type { Event, Ticket } from './models';
export const events: readonly Event[] = [
  { id: 'launchpad-lab', name: 'LaunchPad · Synthetic lab' },
  { id: 'community-lab', name: 'Community · Synthetic lab' },
];
export function ticketsFor(eventId: string): Ticket[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `TEST-${String(index + 1).padStart(3, '0')}`,
    eventId,
    label: `Synthetic guest ${index + 1}`,
  }));
}
export function requireSyntheticTicket(
  eventId: string,
  ticketId: string,
): void {
  if (
    !events.some((event) => event.id === eventId) ||
    !ticketsFor(eventId).some((ticket) => ticket.id === ticketId)
  ) {
    throw new Error('Unknown synthetic event or ticket. No records written.');
  }
}
