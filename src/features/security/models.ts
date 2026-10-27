import { z } from 'zod';
import { publicKeySchema, signatureSchema } from '../tickets/key-models';
import { recordSchema, ticketIdSchema } from '../check-in/domain/models';
const epoch = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const policySchema = z
  .object({
    v: z.literal(1),
    eventId: z.uuid(),
    epoch,
    revokedScanners: z.array(z.uuid()).max(1000),
    revokedTickets: z.array(ticketIdSchema).max(5000),
    signature: signatureSchema,
  })
  .strict();
export const credentialSchema = z
  .object({
    v: z.literal(1),
    e: z.uuid(),
    d: z.uuid(),
    l: z.string().trim().min(1).max(24),
    k: publicKeySchema,
    at: epoch,
    s: signatureSchema,
  })
  .strict();
export const enrollmentSchema = z
  .object({
    kind: z.literal('entryloop-enroll'),
    v: z.literal(1),
    e: z.uuid(),
    d: z.uuid(),
    l: z.string().trim().min(1).max(24),
    k: publicKeySchema,
    q: z.uuid(),
    s: signatureSchema,
  })
  .strict();
export const proofSchema = z
  .object({
    v: z.literal(1),
    eventId: z.uuid(),
    operationId: z.uuid(),
    authorizationEpoch: epoch,
    credentialHash: hashSchema,
    signature: signatureSchema,
  })
  .strict();
export const signedOperationSchema = z
  .object({ record: recordSchema, proof: proofSchema })
  .strict();
export type Policy = z.infer<typeof policySchema>;
export type Credential = z.infer<typeof credentialSchema>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type OperationProof = z.infer<typeof proofSchema>;
export type SignedOperation = z.infer<typeof signedOperationSchema>;
export type ScannerKey = {
  id: 'local';
  scannerId: string;
  privateKey: CryptoKey;
  publicKey: z.infer<typeof publicKeySchema>;
  fingerprint: string;
};
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value) ?? 'undefined';
}
export function unsigned<T extends object>(
  value: T,
): Omit<T, 's' | 'signature'> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== 's' && key !== 'signature'),
  ) as Omit<T, 's' | 'signature'>;
}
export function signedContent(operation: SignedOperation): string {
  return canonical({
    record: operation.record,
    proof: unsigned(operation.proof),
  });
}
export async function digest(text: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export function securityMessage(kind: string, value: object): string {
  return `ENTRYLOOP:${kind}:1\n` + canonical(unsigned(value));
}
