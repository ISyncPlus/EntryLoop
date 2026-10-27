import Papa from 'papaparse';
import { attendeeInputSchema, MAX_ATTENDEES } from '../events/models';
import type { AttendeeInput } from '../events/models';
export type CsvPreview = {
  rows: AttendeeInput[];
  duplicates: number;
  errors: string[];
};
export function parseAttendeeCsv(
  text: string,
  existingEmails: readonly string[] = [],
): CsvPreview {
  if (new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error('CSV exceeds the supported 1 MiB capacity.');
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) =>
      header
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase(),
  });
  if (parsed.errors.length)
    throw new Error(`Invalid CSV: ${parsed.errors[0]!.message}`);
  if (
    parsed.meta.fields?.length !== 2 ||
    !['name', 'email'].every((field) => parsed.meta.fields?.includes(field))
  )
    throw new Error('CSV must have exactly these headers: name,email.');
  if (!parsed.data.length || parsed.data.length > MAX_ATTENDEES)
    throw new Error(`Import 1–${MAX_ATTENDEES} rows per file.`);
  const seen = new Set(
    existingEmails.map((email) => email.trim().toLowerCase()),
  );
  const preview: CsvPreview = { rows: [], duplicates: 0, errors: [] };
  parsed.data.forEach((row, index) => {
    const result = attendeeInputSchema.safeParse({
      name: row.name,
      email: row.email?.trim(),
    });
    if (!result.success) {
      preview.errors.push(
        `Row ${index + 2}: ${result.error.issues.map((issue) => issue.message).join('; ')}`,
      );
      return;
    }
    if (seen.has(result.data.email)) {
      preview.duplicates++;
      return;
    }
    seen.add(result.data.email);
    preview.rows.push(result.data);
  });
  return preview;
}
