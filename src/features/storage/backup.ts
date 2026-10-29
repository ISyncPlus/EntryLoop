import type { EntryLoopDB } from '../check-in/persistence/database';
// Explicit field allowlists: never serialize key tables or whole database objects.
function publicKey(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const fields = value as Record<string, unknown>;
  return Object.fromEntries(
    ['kty', 'crv', 'x', 'y'].map((key) => [
      key,
      typeof fields[key] === 'string' ? fields[key] : null,
    ]),
  );
}
const PUBLIC_FIELDS = {
  events: [
    'id',
    'name',
    'date',
    'location',
    'description',
    'revision',
    'publicKey',
    'fingerprint',
    'role',
    'locked',
  ],
  attendees: ['id', 'eventId', 'ticketId', 'name', 'email'],
  issuedTickets: ['eventId', 'ticketId', 'attendeeId', 'payload', 'issuedAt'],
  ticketCatalog: ['eventId', 'ticketId'],
  devices: ['id', 'label'],
  operations: ['operationId', 'eventId', 'ticketId', 'scannerId', 'recordedAt'],
  operationProofs: [
    'v',
    'eventId',
    'operationId',
    'authorizationEpoch',
    'credentialHash',
    'signature',
  ],
  credentials: ['v', 'e', 'd', 'l', 'k', 'at', 's'],
  policies: [
    'v',
    'eventId',
    'epoch',
    'revokedScanners',
    'revokedTickets',
    'signature',
  ],
} as const;
export async function exportRecoverableRecords(
  db: EntryLoopDB,
  origin: string,
  build: string,
): Promise<string> {
  const tables = await db.transaction(
    'r',
    Object.keys(PUBLIC_FIELDS).map((name) => db.table(name)),
    async () => {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(PUBLIC_FIELDS).map(async ([name, fields]) => {
            const rows: Record<string, unknown>[] = await db
              .table(name)
              .toArray();
            return [
              name,
              rows.map((row) =>
                Object.fromEntries(
                  fields.map((field) => [
                    field,
                    field === 'publicKey' || field === 'k'
                      ? publicKey(row[field])
                      : row[field],
                  ]),
                ),
              ),
            ];
          }),
        ),
      );
    },
  );
  return JSON.stringify(
    {
      kind: 'entryloop-recoverable-records',
      version: 1,
      createdAt: new Date().toISOString(),
      source: { origin, database: db.name, schema: db.verno, build },
      signingKeysIncluded: false,
      scannerPrivateKeysIncluded: false,
      restoresSigningAuthority: false,
      tables,
    },
    null,
    2,
  );
}
