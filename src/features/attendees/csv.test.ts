import { describe, expect, it } from 'vitest';
import { parseAttendeeCsv } from './csv';
describe('attendee CSV boundary', () => {
  it('supports UTF-8 BOM, CRLF, quotes and embedded commas/newlines', () => {
    const result = parseAttendeeCsv(
      '\uFEFFName,Email\r\n"Okafor, Ada",ADA@example.com\r\n"Sam\nRiver",sam@example.com\r\n',
    );
    expect(result).toEqual({
      rows: [
        { name: 'Okafor, Ada', email: 'ada@example.com' },
        { name: 'Sam\nRiver', email: 'sam@example.com' },
      ],
      duplicates: 0,
      errors: [],
    });
  });
  it('normalizes emails and skips within-file and existing duplicates', () => {
    const result = parseAttendeeCsv(
      'name,email\nAda, ADA@example.com \nAda Copy,ada@example.com\nSam,sam@example.com',
      ['SAM@example.com'],
    );
    expect(result.rows).toEqual([{ name: 'Ada', email: 'ada@example.com' }]);
    expect(result.duplicates).toBe(2);
  });
  it('reports invalid row numbers without treating them as imported', () => {
    const result = parseAttendeeCsv(
      'name,email\nAda,not-an-email\n,valid@example.com\nSam,sam@example.com',
    );
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('Row 2');
    expect(result.rows).toHaveLength(1);
  });
  it.each([
    '',
    'name\nAda',
    'name,email,private\nAda,a@example.com,x',
    'name,email\n"broken,a@example.com',
  ])('rejects malformed/unsupported CSV %s', (text) => {
    expect(() => parseAttendeeCsv(text)).toThrow();
  });
  it('bounds input bytes and row count', () => {
    expect(() => parseAttendeeCsv('x'.repeat(1024 * 1024 + 1))).toThrow(
      'capacity',
    );
    expect(() =>
      parseAttendeeCsv(
        'name,email\n' +
          Array.from(
            { length: 5001 },
            (_, i) => `Guest ${i},guest${i}@example.com`,
          ).join('\n'),
      ),
    ).toThrow('5000');
  });
});
