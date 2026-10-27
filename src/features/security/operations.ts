import type { EntryLoopDB } from '../check-in/persistence/database';
import type { CheckInRecord } from '../check-in/domain/models';
import { createCheckIn, reconcile, mergeLogs } from '../check-in/domain/reconcile';
import { sign, verify } from '../tickets/signatures';
import { currentPolicy, ownAuthorization, verifyCredential, verifyPolicy, credentialHash } from './authority';
import { canonical, unsigned, signedContent, signedOperationSchema, digest } from './models';
import type { Credential, Policy, SignedOperation } from './models';
import type { PublicKey } from '../events/models';
export function operationMessage(operation: SignedOperation) { return 'ENTRYLOOP:ADMISSION:1\n' + signedContent(operation); }
export async function verifyOperation(input: unknown, credential: Credential, policy: Policy, key: PublicKey, catalog: ReadonlySet<string>): Promise<SignedOperation> {
  const operation = signedOperationSchema.parse(input);
  const { record, proof } = operation;
  await verifyCredential(credential, policy.eventId, key, policy);
  if (record.eventId !== policy.eventId || proof.eventId !== record.eventId || proof.operationId !== record.operationId || record.scannerId !== credential.d) throw new Error('Wrong event or mismatched admission identities.');
  if (!catalog.has(record.ticketId)) throw new Error('Unknown issued ticket. Update the event package.');
  if (policy.revokedTickets.includes(record.ticketId)) throw new Error('Ticket revoked.');
  if (proof.authorizationEpoch < credential.at || proof.authorizationEpoch > policy.epoch || proof.credentialHash !== await credentialHash(credential)) throw new Error('Invalid admission authorization context.');
  if (!(await verify(operationMessage(operation), proof.signature, credential.k))) throw new Error('Invalid admission signature. Modified or forged operation rejected.');
  return operation;
}
export async function trustedSnapshot(db: EntryLoopDB, eventId: string) {
  const data = await db.transaction('r', [db.events, db.policies, db.operations, db.operationProofs, db.credentials, db.ticketCatalog], async () => ({
    event: await db.events.get(eventId), policy: await currentPolicy(db, eventId), records: await db.records(eventId),
    proofs: await db.operationProofs.where('eventId').equals(eventId).toArray(),
    credentials: await db.credentials.where('e').equals(eventId).toArray(),
    tickets: (await db.ticketCatalog.where('eventId').equals(eventId).toArray()).map(t => t.ticketId).sort(),
  }));
  const operations: SignedOperation[] = [];
  let legacy = 0, excluded = 0;
  if (data.policy && data.event) await verifyPolicy(data.policy, eventId, data.event.publicKey);
  const proofs = new Map(data.proofs.map(p => [p.operationId, p]));
  const credentials = new Map(data.credentials.map(c => [c.d, c]));
  for (const record of data.records) {
    const proof = proofs.get(record.operationId);
    if (!proof) { legacy++; continue; }
    const credential = credentials.get(record.scannerId);
    if (!credential || !data.event || !data.policy) throw new Error('Stored signed admission is missing its verification context.');
    // Revocation conservatively excludes all admissions by that device, regardless of claimed time.
    if (data.policy.revokedScanners.includes(record.scannerId) || data.policy.revokedTickets.includes(record.ticketId)) { excluded++; continue; }
    operations.push(await verifyOperation({ record, proof }, credential, data.policy, data.event.publicKey, new Set(data.tickets)));
  }
  operations.sort((a,b) => a.record.operationId < b.record.operationId ? -1 : 1);
  const root = await digest(canonical(operations.map(signedContent)));
  const context = await digest(canonical({ organizer: data.event?.fingerprint, policy: data.policy ? unsigned(data.policy) : null, tickets: data.tickets }));
  return { ...data, operations, legacy, excluded, root, context, state: reconcile(eventId, operations.map(o => o.record)) };
}
export async function admitTrusted(db: EntryLoopDB, eventId: string, ticketId: string): Promise<CheckInRecord> {
  const auth = await ownAuthorization(db, eventId);
  const local = await db.records(eventId);
  const record = createCheckIn(eventId, { id: ticketId, eventId, label: ticketId }, { id: auth.own.scannerId, label: auth.credential.l }, local, crypto.randomUUID(), new Date().toISOString());
  if (auth.policy.revokedTickets.includes(ticketId)) throw new Error('Ticket revoked.');
  const body = { v: 1 as const, eventId, operationId: record.operationId, authorizationEpoch: auth.policy.epoch, credentialHash: await credentialHash(auth.credential) };
  const unsignedOperation = { record, proof: { ...body, signature: '' } };
  const proof = { ...body, signature: await sign(operationMessage(unsignedOperation), auth.own.privateKey) };
  await db.transaction('rw', [db.operations, db.operationProofs, db.ticketCatalog, db.policies], async () => {
    if (canonical(await currentPolicy(db, eventId)) !== canonical(auth.policy)) throw new Error('Authorization changed. Retry.');
    if (!(await db.ticketCatalog.get([eventId, ticketId]))) throw new Error('Ticket is not in this device’s issued-ticket snapshot. Import an updated scanner package.');
    createCheckIn(eventId, { id: ticketId, eventId, label: ticketId }, { id: auth.own.scannerId, label: auth.credential.l }, await db.records(eventId), record.operationId, record.recordedAt);
    await db.operations.add(record); await db.operationProofs.add(proof);
  });
  return record;
}
export async function mergeTrusted(db: EntryLoopDB, eventId: string, input: readonly SignedOperation[], incomingCredentials: readonly Credential[], expectedContext?: string) {
  if (input.length > 10000 || incomingCredentials.length > 1000) throw new Error('Snapshot exceeds supported capacity.');
  const snapshot = await trustedSnapshot(db, eventId);
  if (!snapshot.event || !snapshot.policy) throw new Error('Current event security policy required.');
  if (expectedContext && snapshot.context !== expectedContext) throw new Error('Stale sync context. Update event packages and restart exchange.');
  const credentials = new Map(snapshot.credentials.map(c => [c.d, c]));
  for (const candidate of incomingCredentials) {
    const c = await verifyCredential(candidate, eventId, snapshot.event.publicKey, snapshot.policy);
    const existing = credentials.get(c.d);
    if (existing && canonical(unsigned(existing)) !== canonical(unsigned(c))) throw new Error('Scanner credential identity collision.');
    credentials.set(c.d, existing ?? c);
  }
  const verified: SignedOperation[] = [];
  for (const candidate of input) {
    const credential = credentials.get(candidate.record.scannerId);
    if (!credential) throw new Error('Unauthorized scanner. No organizer credential supplied.');
    verified.push(await verifyOperation(candidate, credential, snapshot.policy, snapshot.event.publicKey, new Set(snapshot.tickets)));
  }
  return db.transaction('rw', [db.operations, db.operationProofs, db.credentials, db.policies, db.ticketCatalog], async () => {
    if (canonical(await currentPolicy(db, eventId)) !== canonical(snapshot.policy) || canonical((await db.ticketCatalog.where('eventId').equals(eventId).toArray()).map(t=>t.ticketId).sort()) !== canonical(snapshot.tickets)) throw new Error('Authorization context changed. Restart exchange.');
    const local = await db.records(eventId);
    const result = mergeLogs(eventId, local, verified.map(o => o.record));
    const byId = new Map(local.map(r => [r.operationId, r]));
    const seen = new Map<string, string>();
    let imported = 0;
    for (const operation of verified) {
      const id = operation.record.operationId;
      const content = signedContent(operation);
      if (seen.has(id) && seen.get(id) !== content) throw new Error('Operation ID collision in signed evidence.');
      if (seen.has(id)) continue;
      seen.set(id, content);
      if (byId.has(id)) {
        const proof = await db.operationProofs.get([eventId, id]);
        if (!proof) throw new Error('Unsigned historical operation cannot be promoted to trusted. Preserve and investigate it.');
        if (signedContent({ record: byId.get(id)!, proof }) !== content) throw new Error('Operation ID collision in signed evidence.');
        continue;
      }
      await db.operations.add(operation.record); await db.operationProofs.add(operation.proof); imported++;
    }
    for (const credential of incomingCredentials) {
      const existing = await db.credentials.get([eventId, credential.d]);
      if (existing && canonical(unsigned(existing)) !== canonical(unsigned(credential))) throw new Error('Concurrent credential collision.');
      if (!existing) await db.credentials.add(credential);
    }
    return { ...result, transferred: input.length, imported, skipped: input.length - imported, rejected: 0 };
  });
}
