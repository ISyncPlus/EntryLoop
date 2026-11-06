import { describe, it, expect } from 'vitest';
import { base45, unbase45, packOptical, unpackOptical } from './optical';
import { opticalFixtures } from '../../test/optical-fixtures';
import { canonical, securityMessage, unsigned } from '../security/models';
import {
  inspectEnrollment,
  verifyCredential,
  verifyPolicy,
} from '../security/authority';
import { verifyTicket, verify } from '../tickets/signatures';
import { parseFrame } from '../security/exchange';
import { qrGeometry } from './qr-render';
describe('bounded lossless optical transport', () => {
  it('rejects lone UTF-16 surrogates rather than replacing signed text, while legacy JSON remains unchanged', () => {
    const legacy = JSON.stringify({ l: '\ud800' });
    expect(() => packOptical(legacy)).toThrow('well-formed Unicode');
    expect(unpackOptical(legacy)).toBe(legacy);
    const valid = JSON.stringify({ l: 'Entrance 🚪 入口' });
    expect(JSON.parse(unpackOptical(packOptical(valid)))).toEqual(
      JSON.parse(valid),
    );
  });
  it('retains an exported ELQ1 enrollment golden vector independently of the current encoder', () => {
    // Public all-zero transport fixture only; it is not a valid authorization/signature.
    const wire =
      'ELQ1:2T1CL6CL6CL6DM8HQGCL6CL6CL6CO0GS8GS8GS8ZT8GS8GS8GS8%Q86J18%E6%EDZCK4FYKEIN10000000000000000000000000000000000000000000000006Y0000000000000000000000000000000000000000000000400KZAKZAKZAJY8N%GKZAKZAKZA$*000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    const expected = {
      kind: 'entryloop-enroll',
      v: 1,
      e: '33333333-3333-4333-8333-333333333333',
      d: '44444444-4444-4444-8444-444444444444',
      l: 'Future word',
      k: { kty: 'EC', crv: 'P-256', x: 'A'.repeat(43), y: 'A'.repeat(43) },
      q: '55555555-5555-4555-8555-555555555555',
      s: 'A'.repeat(86),
    };
    expect(JSON.parse(unpackOptical(wire))).toEqual(expected);
    expect(packOptical(JSON.stringify(expected))).toBe(wire);
  });

  it('implements RFC 9285 vectors, rejects invalid lengths/characters/overflow, and roundtrips every byte', () => {
    for (const [plain, encoded] of [
      ['AB', 'BB8'],
      ['Hello!!', '%69 VD92EX0'],
      ['base-45', 'UJCLQE7W581'],
    ]) {
      expect(base45(new TextEncoder().encode(plain!))).toBe(encoded);
      expect(new TextDecoder().decode(unbase45(encoded!))).toBe(plain);
    }
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(unbase45(base45(bytes))).toEqual(bytes);
    for (const text of ['A', 'ZZ', 'ZZZ', 'a0', '0\n', '0'.repeat(901)])
      expect(() => unbase45(text)).toThrow();
  });
  it('roundtrips every signed format without changing signed content, signatures, IDs or keys', async () => {
    const fixtures = await opticalFixtures();
    for (const [kind, value] of Object.entries(fixtures.messages)) {
      const original = JSON.stringify(value),
        wire = packOptical(original);
      const decoded = unpackOptical(wire);
      expect(canonical(JSON.parse(decoded))).toBe(canonical(value));
      expect(wire.length).toBeLessThan(
        new TextEncoder().encode(original).length,
      );
      expect(qrGeometry(wire).modules).toBeLessThan(
        qrGeometry(original, 'H').modules,
      );
      if (
        [
          'request',
          'offer',
          'operations',
          'authors',
          'missing',
          'acknowledgment',
        ].includes(kind)
      ) {
        const frame = parseFrame(wire);
        const body = Object.fromEntries(
          Object.entries(frame).filter(([key]) => key !== 'z'),
        );
        expect(
          await verify(
            'ENTRYLOOP:SYNC:2\n' + canonical(body),
            frame.z,
            fixtures.scannerKey,
          ),
        ).toBe(true);
      }
    }
    await expect(
      inspectEnrollment(
        JSON.parse(
          unpackOptical(
            packOptical(JSON.stringify(fixtures.messages.enrollment)),
          ),
        ) as unknown,
        fixtures.event,
      ),
    ).resolves.toHaveProperty('fingerprint');
    await expect(
      verifyCredential(
        JSON.parse(
          unpackOptical(
            packOptical(JSON.stringify(fixtures.messages.credential)),
          ),
        ) as unknown,
        fixtures.event,
        fixtures.organizerKey,
        fixtures.messages.policy,
      ),
    ).resolves.toEqual(fixtures.messages.credential);
    await expect(
      verifyPolicy(
        JSON.parse(
          unpackOptical(packOptical(JSON.stringify(fixtures.messages.policy))),
        ) as unknown,
        fixtures.event,
        fixtures.organizerKey,
      ),
    ).resolves.toEqual(fixtures.messages.policy);
    await expect(
      verifyTicket(
        packOptical(JSON.stringify(fixtures.messages.ticket)),
        fixtures.event,
        fixtures.organizerKey,
      ),
    ).resolves.toEqual(fixtures.messages.ticket);
  });
  it('preserves old JSON, rejects unsupported/truncated/noncanonical/oversized/deep/duplicate-map inputs', () => {
    const legacy = '{"k":"ELT","v":1}';
    expect(unpackOptical(legacy)).toBe(legacy);
    expect(() => unpackOptical('ELQ2:00')).toThrow('Unsupported');
    expect(() => packOptical('x'.repeat(901))).toThrow('capacity');
    const wire = packOptical(legacy);
    for (let cut = 1; cut < wire.length - 5; cut++)
      expect(() => unpackOptical(wire.slice(0, -cut))).toThrow();
    for (const bytes of [
      [255],
      [1, 128, 0],
      [0, 1, 255],
      [3, 2, 34, 1, 1, 34, 1, 1],
      [2, 255, 127],
      [11, 11],
    ])
      expect(() =>
        unpackOptical('ELQ1:' + base45(Uint8Array.from(bytes))),
      ).toThrow();
    let nested: unknown = 0;
    for (let i = 0; i < 12; i++) nested = [nested];
    expect(() => packOptical(JSON.stringify(nested))).toThrow();
    expect(() => unpackOptical('ELQ1:' + '0'.repeat(900))).toThrow('capacity');
    expect(() => unpackOptical(packOptical('{"__proto__":1}'))).toThrow();
  });
  it('does not normalize signed strings, drop unknown fields, truncate aliases or accept forged tickets', async () => {
    const f = await opticalFixtures();
    const changed = {
      ...f.messages.enrollment,
      l: '入口 A',
      extra: 'retained',
    };
    expect(
      JSON.parse(unpackOptical(packOptical(JSON.stringify(changed)))),
    ).toEqual(changed);
    await expect(
      inspectEnrollment(
        JSON.parse(
          unpackOptical(packOptical(JSON.stringify(changed))),
        ) as unknown,
        f.event,
      ),
    ).rejects.toThrow();
    const upper = {
      ...f.messages.enrollment,
      e: f.event.toUpperCase(),
      s: 'A'.repeat(85) + 'B',
    };
    expect(
      JSON.parse(unpackOptical(packOptical(JSON.stringify(upper)))),
    ).toEqual(upper);
    const ticket = f.messages.ticket as { s: string; e: string; t: string };
    await expect(
      verifyTicket(
        packOptical(
          JSON.stringify({ ...ticket, t: 'T-1123456789ABCDEF012345' }),
        ),
        f.event,
        f.organizerKey,
      ),
    ).rejects.toThrow('signature');
    await expect(
      verifyTicket(
        packOptical(JSON.stringify(ticket)),
        crypto.randomUUID(),
        f.organizerKey,
      ),
    ).rejects.toThrow('Wrong event');
    const enrollment = JSON.parse(
      unpackOptical(
        packOptical(JSON.stringify({ ...f.messages.enrollment, l: 'Forged' })),
      ),
    ) as typeof f.messages.enrollment;
    expect(
      await verify(
        securityMessage('ENROLL', enrollment),
        enrollment.s,
        enrollment.k,
      ),
    ).toBe(false);
    expect(unsigned(enrollment)).not.toHaveProperty('s');
  });
  it('keeps arbitrary accepted integer/string contents and rejects excessive output without truncating', () => {
    for (const value of [
      0,
      127,
      128,
      16384,
      Number.MAX_SAFE_INTEGER,
      '00'.repeat(32),
      'a'.repeat(43),
      'A'.repeat(86),
      '入口',
      false,
      true,
      null,
      ['x', 1],
    ])
      expect(
        JSON.parse(unpackOptical(packOptical(JSON.stringify(value)))),
      ).toEqual(value);
    expect(() => packOptical(JSON.stringify('a'.repeat(890)))).toThrow(
      'capacity',
    );
    for (let i = 0; i < 60; i++) {
      const value = {
        id: crypto.randomUUID(),
        value: i * 9831741,
        text: '入口 ' + i,
        key: base45(crypto.getRandomValues(new Uint8Array(i))),
      };
      expect(
        JSON.parse(unpackOptical(packOptical(JSON.stringify(value)))),
      ).toEqual(value);
    }
  });
});
