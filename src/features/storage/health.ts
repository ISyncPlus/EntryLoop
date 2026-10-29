import type { EntryLoopDB } from '../check-in/persistence/database';
import { eventMetadataSchema, publicKeySchema } from '../events/models';
import { keyFingerprint, sign, verify } from '../tickets/signatures';
export async function workspaceHealth(db: EntryLoopDB) {
  const snapshot = await db.transaction('r', db.tables, async () => {
    const counts = Object.fromEntries(
      await Promise.all(
        db.tables.map(async (table) => [table.name, await table.count()]),
      ),
    );
    const events = await db.events.toArray();
    const keys = await db.signingKeys.toArray();
    const scannerKey = await db.scannerKeys.get('local');
    const references = await Promise.all([
      ...[
        db.attendees,
        db.issuedTickets,
        db.ticketCatalog,
        db.operations,
        db.operationProofs,
        db.policies,
        db.syncSessions,
      ].map(async (table) => ({
        table: table.name,
        ids: await table.orderBy('eventId').uniqueKeys(),
        indexedCount: await table.orderBy('eventId').count(),
      })),
      (async () => ({
        table: 'credentials',
        ids: await db.credentials.orderBy('e').uniqueKeys(),
        indexedCount: await db.credentials.orderBy('e').count(),
      }))(),
    ]);
    return { counts, events, keys, scannerKey, references };
  });
  const issues: string[] = [];
  const eventIds = new Set(snapshot.events.map((event) => event.id));
  for (const { table, ids, indexedCount } of snapshot.references) {
    if (indexedCount !== snapshot.counts[table])
      issues.push(
        `${table} contains rows without a valid event reference. Preserve the records for recovery.`,
      );
    for (const id of ids) {
      if (
        table === 'operations' &&
        (id === 'launchpad-lab' || id === 'community-lab')
      )
        continue;
      if (typeof id !== 'string' || !eventIds.has(id))
        issues.push(
          `${table} contains records without their event. Preserve these records and inspect the original workspace before recovery.`,
        );
    }
  }
  for (const key of snapshot.keys)
    if (!eventIds.has(key.eventId))
      issues.push(
        `A signing key has no event metadata (${key.eventId}). Do not replace or export this key; public event information may be recoverable from a trusted scanner package.`,
      );
  for (const event of snapshot.events) {
    if (
      !eventMetadataSchema.safeParse({
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        description: event.description,
        revision: event.revision,
      }).success ||
      !publicKeySchema.safeParse(event.publicKey).success ||
      !['organizer', 'scanner'].includes(event.role)
    ) {
      issues.push(
        'An event has invalid or incomplete stored metadata. It must not be presented as an empty workspace.',
      );
      continue;
    }
    if ((await keyFingerprint(event.publicKey)) !== event.fingerprint) {
      issues.push(
        `Stored verification-key fingerprint mismatch for event ${event.id}.`,
      );
      continue;
    }
    if (event.role === 'organizer') {
      const key = snapshot.keys.find(
        (key) => key.eventId === event.id,
      )?.privateKey;
      if (!key || key.extractable !== false || key.type !== 'private') {
        issues.push(
          `Organizer signing key unavailable or unsafe for event ${event.id}. Records remain stored; a public package cannot restore signing authority.`,
        );
        continue;
      }
      try {
        const challenge =
          'ENTRYLOOP:STORAGE-CHECK:1\n' + event.id + ':' + crypto.randomUUID();
        if (
          !(await verify(
            challenge,
            await sign(challenge, key),
            event.publicKey,
          ))
        )
          issues.push(
            `Organizer key does not match event ${event.id}. No keys were replaced.`,
          );
      } catch {
        issues.push(
          `Organizer signing capability could not be verified for event ${event.id}. Keep this browser data and inspect it using a compatible secure-origin build.`,
        );
      }
    } else if (snapshot.keys.some((key) => key.eventId === event.id))
      issues.push(
        `Event ${event.id} is marked scanner-only but has an organizer key. Preserve the original role/key evidence for investigation.`,
      );
  }
  if ((snapshot.counts.scannerKeys ?? 0) > 0 && !snapshot.scannerKey)
    issues.push(
      'Scanner key entries exist but the local identity is unavailable. Do not create a replacement identity during startup.',
    );
  if (snapshot.scannerKey) {
    const own = snapshot.scannerKey;
    try {
      const challenge =
        'ENTRYLOOP:SCANNER-STORAGE-CHECK:1\n' +
        own.scannerId +
        ':' +
        crypto.randomUUID();
      if (
        own.privateKey.extractable !== false ||
        (await keyFingerprint(own.publicKey)) !== own.fingerprint ||
        !(await verify(
          challenge,
          await sign(challenge, own.privateKey),
          own.publicKey,
        ))
      )
        issues.push(
          'Local scanner key identity is inconsistent. It was not replaced.',
        );
    } catch {
      issues.push(
        'Local scanner key could not be used. Preserve storage; do not silently generate a replacement identity.',
      );
    }
  }
  return {
    counts: snapshot.counts,
    eventIds: [...eventIds],
    organizerCount: snapshot.events.filter((e) => e.role === 'organizer')
      .length,
    scannerCount: snapshot.events.filter((e) => e.role === 'scanner').length,
    issues: [...new Set(issues)],
  };
}
export type WorkspaceHealth = Awaited<ReturnType<typeof workspaceHealth>>;
