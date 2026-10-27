import type { EntryLoopDB } from '../check-in/persistence/database';
import { generateSigningKey, keyFingerprint, sign, verify } from '../tickets/signatures';
import { canonical, unsigned, securityMessage, credentialSchema, enrollmentSchema, policySchema, digest } from './models';
import type { Credential, Enrollment, Policy, ScannerKey } from './models';
import type { PublicKey } from '../events/models';
export async function identity(db: EntryLoopDB): Promise<ScannerKey> {
  const existing = await db.scannerKeys.get('local');
  if (existing) return existing;
  const keys = await generateSigningKey();
  const candidate: ScannerKey = { id: 'local', scannerId: crypto.randomUUID(), ...keys };
  return db.transaction('rw', db.scannerKeys, async () => {
    const current = await db.scannerKeys.get('local');
    if (current) return current;
    await db.scannerKeys.add(candidate);
    return candidate;
  });
}
export function currentPolicy(db: EntryLoopDB, eventId: string) {
  return db.policies.where('[eventId+epoch]').between([eventId, 0], [eventId, Number.MAX_SAFE_INTEGER], true, true).last();
}
export async function verifyPolicy(input: unknown, eventId: string, key: PublicKey): Promise<Policy> {
  const policy = policySchema.parse(input);
  if (policy.eventId !== eventId || new Set(policy.revokedScanners).size !== policy.revokedScanners.length || new Set(policy.revokedTickets).size !== policy.revokedTickets.length)
    throw new Error('Invalid event or repeated revocation identity.');
  if (!(await verify(securityMessage('POLICY', policy), policy.signature, key))) throw new Error('Invalid revocation policy signature.');
  return policy;
}
export function checkPolicyUpdate(previous: Policy | undefined, next: Policy) {
  if (!previous) return;
  if (next.epoch < previous.epoch) throw new Error('Stale revocation policy. Update this device.');
  if (next.epoch === previous.epoch && canonical(unsigned(next)) !== canonical(unsigned(previous))) throw new Error('Conflicting policy epoch. Nothing changed.');
  if (previous.revokedScanners.some(id => !next.revokedScanners.includes(id)) || previous.revokedTickets.some(id => !next.revokedTickets.includes(id))) throw new Error('Revocations cannot be removed.');
}
export async function importPolicy(db: EntryLoopDB, eventId: string, input: unknown) {
  const event = await db.events.get(eventId);
  if (!event) throw new Error('Prepare the event first.');
  const policy = await verifyPolicy(input, eventId, event.publicKey);
  await db.transaction('rw', db.policies, async () => {
    checkPolicyUpdate(await currentPolicy(db, eventId), policy);
    if (!(await db.policies.get([eventId, policy.epoch]))) await db.policies.add(policy);
  });
  return policy;
}
export async function changePolicy(db: EntryLoopDB, eventId: string, revoke?: { scanner?: string; ticket?: string }) {
  const event = await db.events.get(eventId);
  const key = await db.signingKeys.get(eventId);
  if (event?.role !== 'organizer' || !key) throw new Error('Organizer signing key is required.');
  const previous = await currentPolicy(db, eventId);
  const body = {
    v: 1 as const, eventId, epoch: (previous?.epoch ?? 0) + 1,
    revokedScanners: [...new Set([...(previous?.revokedScanners ?? []), ...(revoke?.scanner ? [revoke.scanner] : [])])].sort(),
    revokedTickets: [...new Set([...(previous?.revokedTickets ?? []), ...(revoke?.ticket ? [revoke.ticket] : [])])].sort(),
  };
  const policy = policySchema.parse({ ...body, signature: await sign(securityMessage('POLICY', body), key.privateKey) });
  await db.transaction('rw', db.policies, async () => {
    if (canonical(await currentPolicy(db, eventId)) !== canonical(previous)) throw new Error('Policy changed in another tab. Retry.');
    await db.policies.add(policy);
  });
  return policy;
}
export async function enrollmentRequest(db: EntryLoopDB, eventId: string, label: string): Promise<Enrollment> {
  if (!(await db.events.get(eventId))) throw new Error('Prepare the event first.');
  const own = await identity(db);
  const body = { kind: 'entryloop-enroll' as const, v: 1 as const, e: eventId, d: own.scannerId, l: label.trim(), k: own.publicKey, q: crypto.randomUUID() };
  return enrollmentSchema.parse({ ...body, s: await sign(securityMessage('ENROLL', body), own.privateKey) });
}
export async function inspectEnrollment(input: unknown, eventId: string) {
  const request = enrollmentSchema.parse(input);
  if (request.e !== eventId || !(await verify(securityMessage('ENROLL', request), request.s, request.k))) throw new Error('Wrong event or invalid scanner enrollment proof.');
  return { request, fingerprint: await keyFingerprint(request.k) };
}
export async function authorize(db: EntryLoopDB, eventId: string, input: unknown, confirmedFingerprint: string): Promise<Credential> {
  const { request, fingerprint } = await inspectEnrollment(input, eventId);
  if (fingerprint !== confirmedFingerprint) throw new Error('Compare the full scanner fingerprint on its screen before authorizing.');
  const event = await db.events.get(eventId);
  const key = await db.signingKeys.get(eventId);
  if (event?.role !== 'organizer' || !key) throw new Error('Only the organizer can authorize scanners.');
  const policy = await currentPolicy(db, eventId) ?? await changePolicy(db, eventId);
  if (policy.revokedScanners.includes(request.d)) throw new Error('Scanner was revoked. Enroll a new device identity.');
  const existing = await db.credentials.get([eventId, request.d]);
  if (existing) {
    if (canonical(existing.k) !== canonical(request.k)) throw new Error('Scanner identity collision.');
    return existing;
  }
  const body = { v: 1 as const, e: eventId, d: request.d, l: request.l, k: request.k, at: policy.epoch };
  const credential = credentialSchema.parse({ ...body, s: await sign(securityMessage('CREDENTIAL', body), key.privateKey) });
  await db.transaction('rw', db.credentials, db.policies, async () => {
    if (canonical(await currentPolicy(db, eventId)) !== canonical(policy)) throw new Error('Policy changed. Retry enrollment.');
    const current = await db.credentials.get([eventId, request.d]);
    if (current && canonical(unsigned(current)) !== canonical(unsigned(credential))) throw new Error('Scanner identity collision.');
    if (!current) await db.credentials.add(credential);
  });
  return credential;
}
export async function verifyCredential(input: unknown, eventId: string, key: PublicKey, policy: Policy): Promise<Credential> {
  const credential = credentialSchema.parse(input);
  if (credential.e !== eventId) throw new Error('Wrong event scanner credential.');
  if (credential.at > policy.epoch) throw new Error('Stale authorization policy. Import the organizer’s latest package.');
  if (policy.revokedScanners.includes(credential.d)) throw new Error('Scanner authorization revoked.');
  if (!(await verify(securityMessage('CREDENTIAL', credential), credential.s, key))) throw new Error('Unauthorized scanner: invalid organizer signature.');
  return credential;
}
export async function importOwnCredential(db: EntryLoopDB, eventId: string, input: unknown) {
  const event = await db.events.get(eventId);
  const policy = await currentPolicy(db, eventId);
  if (!event || !policy) throw new Error('Import a current security-enabled event package first.');
  const credential = await verifyCredential(input, eventId, event.publicKey, policy);
  const own = await identity(db);
  if (own.scannerId !== credential.d || canonical(own.publicKey) !== canonical(credential.k)) throw new Error('This credential belongs to another scanner.');
  await db.transaction('rw', db.credentials, db.policies, async () => {
    if (canonical(await currentPolicy(db, eventId)) !== canonical(policy)) throw new Error('Policy changed. Retry.');
    const existing = await db.credentials.get([eventId, credential.d]);
    if (existing && canonical(unsigned(existing)) !== canonical(unsigned(credential))) throw new Error('Conflicting scanner credential.');
    if (!existing) await db.credentials.add(credential);
  });
  return credential;
}
export async function ownAuthorization(db: EntryLoopDB, eventId: string) {
  const event = await db.events.get(eventId);
  const policy = await currentPolicy(db, eventId);
  const own = await identity(db);
  const credential = await db.credentials.get([eventId, own.scannerId]);
  if (!event || !policy || !credential) throw new Error('Scanner is not authorized. Complete organizer enrollment first.');
  await verifyPolicy(policy, eventId, event.publicKey);
  await verifyCredential(credential, eventId, event.publicKey, policy);
  if (canonical(own.publicKey) !== canonical(credential.k)) throw new Error('Scanner key no longer matches its authorization. Re-enroll a new identity.');
  return { event, policy, own, credential };
}
export async function credentialHash(credential: Credential) { return digest(canonical(unsigned(credential))); }
