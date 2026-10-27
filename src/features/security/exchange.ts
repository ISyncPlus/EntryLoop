import { z } from 'zod';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { sign, verify } from '../tickets/signatures';
import { ownAuthorization, verifyCredential } from './authority';
import { trustedSnapshot, mergeTrusted } from './operations';
import {
  canonical,
  credentialSchema,
  hashSchema,
  signedContent,
  digest,
  signedOperationSchema,
} from './models';
import type { Credential, SignedOperation } from './models';
import { signatureSchema } from '../tickets/key-models';
import { ticketIdSchema } from '../check-in/domain/models';
export const MAX_FRAME_BYTES = 900;
export const MAX_SYNC_OPERATIONS = 10000;
const integer = z.number().int().nonnegative().max(11000);
const base = z.object({ p: z.literal('ELS'), v: z.literal(2) });
const requestSchema = base
  .extend({
    k: z.literal('request'),
    q: z.uuid(),
    c: hashSchema,
    d: credentialSchema,
    z: signatureSchema,
  })
  .strict();
const offerSchema = base
  .extend({
    k: z.literal('offer'),
    q: z.uuid(),
    s: z.uuid(),
    c: hashSchema,
    h: hashSchema,
    n: integer.max(MAX_SYNC_OPERATIONS),
    f: integer.max(6000),
    d: credentialSchema,
    z: signatureSchema,
  })
  .strict();
const tupleSchema = z.tuple([
  z.uuid(),
  ticketIdSchema,
  z.uuid(),
  z.number().int().min(0).max(8640000000000000),
  z.number().int().positive(),
  hashSchema,
  signatureSchema,
]);
const dataSchema = z.discriminatedUnion('t', [
  base
    .extend({
      k: z.literal('data'),
      s: z.uuid(),
      i: integer,
      t: z.literal('credentials'),
      d: credentialSchema,
      z: signatureSchema,
    })
    .strict(),
  base
    .extend({
      k: z.literal('data'),
      s: z.uuid(),
      i: integer,
      t: z.literal('operations'),
      o: z.array(tupleSchema).min(1).max(2),
      z: signatureSchema,
    })
    .strict(),
]);
const ackSchema = base
  .extend({
    k: z.literal('ack'),
    s: z.uuid(),
    q: z.uuid(),
    c: hashSchema,
    h: hashSchema,
    g: hashSchema,
    n: integer,
    z: signatureSchema,
  })
  .strict();
const missingSchema = base
  .extend({
    k: z.literal('missing'),
    s: z.uuid(),
    c: hashSchema,
    m: z.array(integer).min(1).max(32),
    total: integer,
    z: signatureSchema,
  })
  .strict();
const messageSchema = z.union([
  requestSchema,
  offerSchema,
  dataSchema,
  ackSchema,
  missingSchema,
]);
type Request = z.infer<typeof requestSchema>;
type Offer = z.infer<typeof offerSchema>;
type Data = z.infer<typeof dataSchema>;
type Ack = z.infer<typeof ackSchema>;
type Message = z.infer<typeof messageSchema>;
export type SyncSession = {
  id: string;
  eventId: string;
  direction: 'request' | 'outgoing' | 'incoming';
  request: Request;
  offer?: Offer;
  frames: Record<string, string>;
  ack?: Ack;
  result?: {
    transferred: number;
    imported: number;
    skipped: number;
    rejected: number;
  };
};
function messageBody(message: object) {
  return Object.fromEntries(
    Object.entries(message).filter(([key]) => key !== 'z'),
  );
}
function messageText(message: object) {
  return 'ENTRYLOOP:SYNC:2\n' + canonical(messageBody(message));
}
export function frameText(message: Message): string {
  const text = JSON.stringify(message);
  if (new TextEncoder().encode(text).length > MAX_FRAME_BYTES)
    throw new Error(
      'QR exceeds the supported 900-byte capacity. Nothing truncated.',
    );
  return text;
}
export function parseFrame(text: string): Message {
  if (new TextEncoder().encode(text).length > MAX_FRAME_BYTES)
    throw new Error('QR exceeds the supported 900-byte capacity.');
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('Corrupted QR: invalid JSON.');
  }
  if (typeof input === 'object' && input && 'v' in input && input.v !== 2)
    throw new Error(
      'Unsupported synchronization version. Use the same current EntryLoop app on both devices.',
    );
  const result = messageSchema.safeParse(input);
  if (!result.success)
    throw new Error('Invalid authenticated synchronization QR schema.');
  return result.data;
}
async function signed<T extends object>(
  body: T,
  key: CryptoKey,
): Promise<T & { z: string }> {
  return { ...body, z: await sign(messageText(body), key) };
}
async function verifyMessage(message: Message, credential: Credential) {
  if (!(await verify(messageText(message), message.z, credential.k)))
    throw new Error('Invalid synchronization signature. Frame rejected.');
}
function toTuple(op: SignedOperation): z.infer<typeof tupleSchema> {
  return [
    op.record.operationId,
    op.record.ticketId,
    op.record.scannerId,
    Date.parse(op.record.recordedAt),
    op.proof.authorizationEpoch,
    op.proof.credentialHash,
    op.proof.signature,
  ];
}
function fromTuple(
  tuple: z.infer<typeof tupleSchema>,
  eventId: string,
): SignedOperation {
  const [
    operationId,
    ticketId,
    scannerId,
    time,
    authorizationEpoch,
    credentialHash,
    signature,
  ] = tuple;
  return signedOperationSchema.parse({
    record: {
      operationId,
      eventId,
      ticketId,
      scannerId,
      recordedAt: new Date(time).toISOString(),
    },
    proof: {
      v: 1,
      eventId,
      operationId,
      authorizationEpoch,
      credentialHash,
      signature,
    },
  });
}
export async function startReceive(
  db: EntryLoopDB,
  eventId: string,
): Promise<SyncSession> {
  const auth = await ownAuthorization(db, eventId);
  const snapshot = await trustedSnapshot(db, eventId);
  const request = requestSchema.parse(
    await signed(
      {
        p: 'ELS',
        v: 2,
        k: 'request',
        q: crypto.randomUUID(),
        c: snapshot.context,
        d: auth.credential,
      },
      auth.own.privateKey,
    ),
  );
  frameText(request);
  const session: SyncSession = {
    id: request.q,
    eventId,
    direction: 'request',
    request,
    frames: {},
  };
  await db.syncSessions.add(session);
  return session;
}
async function prepareSend(
  db: EntryLoopDB,
  eventId: string,
  request: Request,
): Promise<SyncSession> {
  const auth = await ownAuthorization(db, eventId);
  const snapshot = await trustedSnapshot(db, eventId);
  await verifyCredential(request.d, eventId, auth.event.publicKey, auth.policy);
  await verifyMessage(request, request.d);
  if (request.d.d === auth.own.scannerId)
    throw new Error('Use two independent scanner identities for exchange.');
  if (request.c !== snapshot.context)
    throw new Error(
      'Event packages or revocation policies differ. Update both devices before synchronization.',
    );
  const previous = await db.syncSessions
    .where('eventId')
    .equals(eventId)
    .filter((s) => s.direction === 'outgoing' && s.request.q === request.q)
    .first();
  if (previous) {
    if (canonical(previous.request) !== canonical(request))
      throw new Error('Conflicting receiver request identity.');
    return previous;
  }
  if (snapshot.operations.length > MAX_SYNC_OPERATIONS)
    throw new Error('Snapshot exceeds 10,000 operations. Nothing truncated.');
  const sessionId = crypto.randomUUID();
  const credentials = snapshot.credentials
    .filter(
      (c) =>
        c.d !== auth.own.scannerId &&
        snapshot.operations.some((o) => o.record.scannerId === c.d),
    )
    .sort((a, b) => (a.d < b.d ? -1 : 1));
  const frames: Record<string, string> = {};
  let i = 0;
  for (const credential of credentials) {
    const frame = dataSchema.parse(
      await signed(
        {
          p: 'ELS',
          v: 2,
          k: 'data',
          s: sessionId,
          i,
          t: 'credentials',
          d: credential,
        },
        auth.own.privateKey,
      ),
    );
    frames[String(i++)] = frameText(frame);
  }
  for (let j = 0; j < snapshot.operations.length; j += 2) {
    const frame = dataSchema.parse(
      await signed(
        {
          p: 'ELS',
          v: 2,
          k: 'data',
          s: sessionId,
          i,
          t: 'operations',
          o: snapshot.operations.slice(j, j + 2).map(toTuple),
        },
        auth.own.privateKey,
      ),
    );
    frames[String(i++)] = frameText(frame);
  }
  const offer = offerSchema.parse(
    await signed(
      {
        p: 'ELS',
        v: 2,
        k: 'offer',
        q: request.q,
        s: sessionId,
        c: snapshot.context,
        h: snapshot.root,
        n: snapshot.operations.length,
        f: i,
        d: auth.credential,
      },
      auth.own.privateKey,
    ),
  );
  frameText(offer);
  const session: SyncSession = {
    id: sessionId,
    eventId,
    direction: 'outgoing',
    request,
    offer,
    frames,
  };
  await db.syncSessions.add(session);
  return session;
}
export function missingIndices(session: SyncSession): number[] {
  return Array.from({ length: session.offer?.f ?? 0 }, (_, i) => i).filter(
    (i) => !session.frames[String(i)],
  );
}
async function finishReceive(
  db: EntryLoopDB,
  session: SyncSession,
): Promise<SyncSession> {
  const offer = session.offer;
  if (!offer || missingIndices(session).length) return session;
  const operations: SignedOperation[] = [];
  const credentials: Credential[] = [offer.d];
  for (let i = 0; i < offer.f; i++) {
    const frame = parseFrame(session.frames[String(i)]!) as Data;
    if (frame.k !== 'data' || frame.s !== offer.s || frame.i !== i)
      throw new Error('Stored frame identity mismatch.');
    await verifyMessage(frame, offer.d);
    if (frame.t === 'credentials') credentials.push(frame.d);
    else
      operations.push(
        ...frame.o.map((tuple) => fromTuple(tuple, session.eventId)),
      );
  }
  operations.sort((a, b) =>
    a.record.operationId < b.record.operationId ? -1 : 1,
  );
  if (
    operations.length !== offer.n ||
    new Set(operations.map((o) => o.record.operationId)).size !== offer.n ||
    (await digest(canonical(operations.map(signedContent)))) !== offer.h
  )
    throw new Error(
      'Incomplete or conflicting snapshot: operation identities/content do not match the signed manifest.',
    );
  const result = await mergeTrusted(
    db,
    session.eventId,
    operations,
    credentials,
    offer.c,
    session.id,
  );
  const auth = await ownAuthorization(db, session.eventId);
  const snapshot = await trustedSnapshot(db, session.eventId);
  if (
    snapshot.context !== offer.c ||
    auth.own.scannerId !== session.request.d.d
  )
    throw new Error('Receiver context changed. Restart synchronization.');
  const ack = ackSchema.parse(
    await signed(
      {
        p: 'ELS',
        v: 2,
        k: 'ack',
        s: offer.s,
        q: offer.q,
        c: offer.c,
        h: offer.h,
        g: snapshot.root,
        n: offer.n,
      },
      auth.own.privateKey,
    ),
  );
  frameText(ack);
  const completed = {
    ...session,
    ack,
    result: session.result ?? {
      transferred: result.transferred,
      imported: result.imported,
      skipped: result.skipped,
      rejected: 0,
    },
  };
  await db.transaction('rw', db.syncSessions, async () => {
    const latest = await db.syncSessions.get(session.id);
    if (!latest) throw new Error('Receiving session missing.');
    completed.result = latest.result ?? completed.result;
    await db.syncSessions.put({ ...latest, ack, result: completed.result });
  });
  return completed;
}
export async function missingRequest(
  db: EntryLoopDB,
  sessionId: string,
): Promise<string> {
  const session = await db.syncSessions.get(sessionId);
  if (!session?.offer || session.direction !== 'incoming')
    throw new Error('No receiving session selected.');
  const auth = await ownAuthorization(db, session.eventId);
  if (auth.own.scannerId !== session.request.d.d)
    throw new Error('Receiver identity changed.');
  const missing = missingIndices(session);
  if (!missing.length)
    throw new Error('No missing frames. Return the completion acknowledgment.');
  return frameText(
    missingSchema.parse(
      await signed(
        {
          p: 'ELS',
          v: 2,
          k: 'missing',
          s: sessionId,
          c: session.offer.c,
          m: missing.slice(0, 32),
          total: missing.length,
        },
        auth.own.privateKey,
      ),
    ),
  );
}
export async function acceptFrame(
  db: EntryLoopDB,
  eventId: string,
  text: string,
): Promise<{ session: SyncSession; resend?: number[] }> {
  const message = parseFrame(text);
  if (message.k === 'request')
    return { session: await prepareSend(db, eventId, message) };
  const auth = await ownAuthorization(db, eventId);
  const snapshot = await trustedSnapshot(db, eventId);
  if (message.k === 'offer') {
    const requestSession = await db.syncSessions.get(message.q);
    if (
      !requestSession ||
      requestSession.direction !== 'request' ||
      requestSession.eventId !== eventId ||
      requestSession.request.d.d !== auth.own.scannerId
    )
      throw new Error(
        'Offer is not bound to this receiver’s stored request. Start receiving first.',
      );
    await verifyCredential(
      message.d,
      eventId,
      auth.event.publicKey,
      auth.policy,
    );
    await verifyMessage(message, message.d);
    if (
      message.c !== snapshot.context ||
      message.c !== requestSession.request.c
    )
      throw new Error(
        'Stale authorization/catalog context. Update packages and start again.',
      );
    const existing = await db.syncSessions.get(message.s);
    if (existing) {
      if (
        canonical(messageBody(existing.offer!)) !==
        canonical(messageBody(message))
      )
        throw new Error('Conflicting session offer.');
      return { session: await finishReceive(db, existing) };
    }
    const session: SyncSession = {
      id: message.s,
      eventId,
      direction: 'incoming',
      request: requestSession.request,
      offer: message,
      frames: {},
    };
    await db.syncSessions.add(session);
    return { session: await finishReceive(db, session) };
  }
  const session = await db.syncSessions.get(message.s);
  if (!session?.offer || session.eventId !== eventId)
    throw new Error('Scan the signed transfer offer before its frames.');
  if (session.offer.c !== snapshot.context)
    throw new Error('Authorization/catalog changed. Start a new exchange.');
  await verifyCredential(
    session.offer.d,
    eventId,
    auth.event.publicKey,
    auth.policy,
  );
  await verifyCredential(
    session.request.d,
    eventId,
    auth.event.publicKey,
    auth.policy,
  );
  if (message.k === 'data') {
    if (
      session.direction !== 'incoming' ||
      session.request.d.d !== auth.own.scannerId ||
      message.i >= session.offer.f
    )
      throw new Error('Wrong receiver or frame index.');
    await verifyMessage(message, session.offer.d);
    const frame = frameText(message);
    await db.transaction('rw', db.syncSessions, async () => {
      const latest = await db.syncSessions.get(session.id);
      if (!latest) throw new Error('Receiving session missing.');
      const previous = latest.frames[String(message.i)];
      if (
        previous &&
        canonical(messageBody(parseFrame(previous))) !==
          canonical(messageBody(message))
      )
        throw new Error(
          'Conflicting frame identity. Existing evidence retained.',
        );
      if (!previous)
        await db.syncSessions.put({
          ...latest,
          frames: { ...latest.frames, [String(message.i)]: frame },
        });
    });
    return {
      session: await finishReceive(
        db,
        (await db.syncSessions.get(session.id))!,
      ),
    };
  }
  if (
    session.direction !== 'outgoing' ||
    session.offer.d.d !== auth.own.scannerId
  )
    throw new Error('Acknowledgment is for another sender.');
  await verifyMessage(message, session.request.d);
  if (message.c !== session.offer.c)
    throw new Error('Acknowledgment context mismatch.');
  if (message.k === 'missing') {
    if (
      new Set(message.m).size !== message.m.length ||
      message.m.some((i) => i >= session.offer!.f) ||
      message.total < message.m.length ||
      message.total > session.offer.f
    )
      throw new Error('Invalid missing-frame request.');
    return { session, resend: message.m };
  }
  if (
    message.q !== session.request.q ||
    message.h !== session.offer.h ||
    message.n !== session.offer.n
  )
    throw new Error('Acknowledgment does not match the offered snapshot.');
  const completed = { ...session, ack: message };
  await db.syncSessions.put(completed);
  return { session: completed };
}
export async function convergenceStatus(
  db: EntryLoopDB,
  session: SyncSession,
): Promise<string> {
  if (!session.ack || !session.offer)
    return 'Incomplete: no verified completion acknowledgment.';
  const snapshot = await trustedSnapshot(db, session.eventId);
  if (snapshot.context !== session.ack.c)
    return 'Historical receipt only: authorization/catalog has changed.';
  if (session.ack.h === session.ack.g && snapshot.root === session.ack.h)
    return 'Matching operation identities and integrity confirmed at acknowledgment. Exchange again after new admissions.';
  return 'Receipt verified. Logs differ: perform the reverse exchange, then exchange again to confirm convergence.';
}
