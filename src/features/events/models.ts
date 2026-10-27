import { z } from 'zod';
import { publicKeySchema, signatureSchema } from '../tickets/key-models';
export { publicKeySchema, signatureSchema } from '../tickets/key-models';
import { policySchema } from '../security/models';
import { ticketIdSchema } from '../check-in/domain/models';
export const MAX_ATTENDEES = 5000;
export const MAX_PACKAGE_BYTES = 1024 * 1024;
export const eventInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Event name is required.').max(100),
    date: z.iso.date(),
    location: z.string().trim().min(1, 'Location is required.').max(160),
    description: z.string().trim().max(2000),
  })
  .strict();
export const eventMetadataSchema = eventInputSchema
  .extend({ id: z.uuid(), revision: z.number().int().positive() })
  .strict();
export const ticketTokenSchema = z
  .object({
    k: z.literal('ELT'),
    v: z.literal(1),
    e: z.uuid(),
    t: ticketIdSchema,
    s: signatureSchema,
  })
  .strict();
const legacyPackageSchema = z
  .object({
    kind: z.literal('entryloop-event'),
    version: z.literal(1),
    event: eventMetadataSchema,
    publicKey: publicKeySchema,
    ticketIds: z
      .array(ticketIdSchema)
      .max(MAX_ATTENDEES)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Duplicate ticket IDs in package.',
      ),
    signature: signatureSchema,
  })
  .strict();
export const packageSchema = z.discriminatedUnion('version', [legacyPackageSchema, legacyPackageSchema.extend({ version: z.literal(2), policy: policySchema }).strict()]);
export const attendeeInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Attendee name is required.').max(120),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  })
  .strict();
export type EventInput = z.infer<typeof eventInputSchema>;
export type EventMetadata = Readonly<z.infer<typeof eventMetadataSchema>>;
export type PublicKey = Readonly<z.infer<typeof publicKeySchema>>;
export type EventPackage = Readonly<z.infer<typeof packageSchema>>;
export type ManagedEvent = EventMetadata &
  Readonly<{
    publicKey: PublicKey;
    fingerprint: string;
    role: 'organizer' | 'scanner';
    locked: boolean;
  }>;
export type AttendeeInput = z.infer<typeof attendeeInputSchema>;
export type Attendee = Readonly<
  AttendeeInput & { id: string; eventId: string; ticketId: string }
>;
export type IssuedTicket = Readonly<{
  eventId: string;
  ticketId: string;
  attendeeId: string;
  payload: string;
  issuedAt: string;
}>;
export type CatalogTicket = Readonly<{ eventId: string; ticketId: string }>;
export type SigningKey = Readonly<{ eventId: string; privateKey: CryptoKey }>;
export type TicketToken = Readonly<z.infer<typeof ticketTokenSchema>>;
export function eventMetadata(event: EventMetadata): EventMetadata {
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    location: event.location,
    description: event.description,
    revision: event.revision,
  };
}
