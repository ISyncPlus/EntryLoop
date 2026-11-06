import {
  generateSigningKey,
  sign,
  signTicket,
} from '../features/tickets/signatures';
import {
  canonical,
  securityMessage,
  digest,
  unsigned,
  signedContent,
} from '../features/security/models';
import type {
  Credential,
  Enrollment,
  Policy,
  SignedOperation,
} from '../features/security/models';
export async function opticalFixtures() {
  const organizer = await generateSigningKey(),
    scanner = await generateSigningKey();
  const event = crypto.randomUUID();
  const device = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const session = crypto.randomUUID();
  const enrollBody = {
    kind: 'entryloop-enroll' as const,
    v: 1 as const,
    e: event,
    d: device,
    l: 'Entrance scanner',
    k: scanner.publicKey,
    q: nonce,
  };
  const enrollment: Enrollment = {
    ...enrollBody,
    s: await sign(securityMessage('ENROLL', enrollBody), scanner.privateKey),
  };
  const credentialBody = {
    v: 1 as const,
    e: event,
    d: device,
    l: enrollment.l,
    k: scanner.publicKey,
    at: 1,
  };
  const credential: Credential = {
    ...credentialBody,
    s: await sign(
      securityMessage('CREDENTIAL', credentialBody),
      organizer.privateKey,
    ),
  };
  const policyBody = {
    v: 1 as const,
    eventId: event,
    epoch: 1,
    revokedScanners: [] as string[],
    revokedTickets: [] as string[],
  };
  const policy: Policy = {
    ...policyBody,
    signature: await sign(
      securityMessage('POLICY', policyBody),
      organizer.privateKey,
    ),
  };
  const ticket = await signTicket(
    event,
    'T-0123456789ABCDEF012345',
    organizer.privateKey,
  );
  const operations: SignedOperation[] = [];
  for (let i = 0; i < 2; i++) {
    const operationId = crypto.randomUUID();
    const record = {
      operationId,
      eventId: event,
      ticketId: i ? 'T-1123456789ABCDEF012345' : 'T-0123456789ABCDEF012345',
      scannerId: device,
      recordedAt: '2026-11-06T12:00:00.000Z',
    };
    const proof = {
      v: 1 as const,
      eventId: event,
      operationId,
      authorizationEpoch: 1,
      credentialHash: await digest(canonical(unsigned(credential))),
      signature: '',
    };
    proof.signature = await sign(
      securityMessage('ADMISSION', { record, proof: unsigned(proof) }),
      scanner.privateKey,
    );
    // signedContent is the existing admission message body; it excludes only the signature.
    if (
      'ENTRYLOOP:ADMISSION:1\n' + signedContent({ record, proof }) !==
      securityMessage('ADMISSION', { record, proof: unsigned(proof) })
    )
      throw new Error('Fixture canonicalization mismatch');
    operations.push({ record, proof });
  }
  const c = await digest('synthetic authorization context'),
    h = await digest('source operations'),
    g = await digest('receiver operations');
  async function sync(body: object) {
    return {
      p: 'ELS',
      v: 2,
      ...body,
      z: await sign(
        'ENTRYLOOP:SYNC:2\n' + canonical({ p: 'ELS', v: 2, ...body }),
        scanner.privateKey,
      ),
    };
  }
  const messages = {
    enrollment,
    credential,
    ticket: JSON.parse(ticket) as unknown,
    request: await sync({ k: 'request', q: nonce, c, d: credential }),
    offer: await sync({
      k: 'offer',
      q: nonce,
      s: session,
      c,
      h,
      n: 2,
      f: 1,
      d: credential,
    }),
    operations: await sync({
      k: 'data',
      s: session,
      i: 0,
      t: 'operations',
      o: operations.map(({ record, proof }) => [
        record.operationId,
        record.ticketId,
        record.scannerId,
        Date.parse(record.recordedAt),
        proof.authorizationEpoch,
        proof.credentialHash,
        proof.signature,
      ]),
    }),
    authors: await sync({
      k: 'data',
      s: session,
      i: 0,
      t: 'credentials',
      d: credential,
    }),
    missing: await sync({ k: 'missing', s: session, c, m: [0], total: 1 }),
    acknowledgment: await sync({
      k: 'ack',
      s: session,
      q: nonce,
      c,
      h,
      g,
      n: 2,
    }),
    policy,
  };
  return {
    messages,
    event,
    organizerKey: organizer.publicKey,
    scannerKey: scanner.publicKey,
  };
}
