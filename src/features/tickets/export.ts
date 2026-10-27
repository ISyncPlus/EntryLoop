import QRCode from 'qrcode';
import type { Attendee, IssuedTicket, ManagedEvent } from '../events/models';
export const escapeXml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!,
  );
export function downloadText(
  filename: string,
  text: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function textLines(value: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const parts = word.match(new RegExp(`.{1,${width}}`, 'gu')) ?? [];
    for (const part of parts) {
      if ((line + ' ' + part).trim().length > width) {
        lines.push(line);
        line = part;
      } else line = (line + ' ' + part).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}
export async function renderTicketSvg(
  event: ManagedEvent,
  attendee: Attendee,
  ticket: IssuedTicket,
): Promise<string> {
  if (
    ticket.eventId !== event.id ||
    attendee.eventId !== event.id ||
    ticket.ticketId !== attendee.ticketId ||
    ticket.attendeeId !== attendee.id
  )
    throw new Error('Ticket export identity mismatch.');
  const modules =
    QRCode.create(ticket.payload, { errorCorrectionLevel: 'H' }).modules.size +
    8;
  const qrSize = modules * Math.max(1, Math.floor(520 / modules));
  const qr = await QRCode.toString(ticket.payload, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 4,
    width: qrSize,
  });
  const lines = (
    text: string,
    width: number,
    x: number,
    y: number,
    size: number,
    color = '#172c27',
  ) =>
    textLines(text, width)
      .map(
        (line, index) =>
          `<text x="${x}" y="${y + index * (size + 9)}" font-size="${size}" fill="${color}">${escapeXml(line)}</text>`,
      )
      .join('');
  const nameLines = textLines(event.name, 32).length;
  const locationTop = 228 + nameLines * 45;
  const guestTop = locationTop + textLines(event.location, 68).length * 25 + 30;
  const guestLines = textLines(attendee.name, 42).length;
  const qrTop = guestTop + guestLines * 30 + 40;
  const height = qrTop + qrSize + 190;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${height}" viewBox="0 0 760 ${height}" role="img" aria-labelledby="title"><title id="title">${escapeXml(event.name)} — ${escapeXml(attendee.name)}</title><rect width="760" height="${height}" fill="#fff"/><rect x="24" y="24" width="712" height="${height - 48}" rx="18" fill="#f3f7f5"/><g font-family="Arial, sans-serif"><text x="64" y="92" font-size="30" font-weight="bold" fill="#164f47">EntryLoop</text><text x="696" y="92" text-anchor="end" font-size="15" fill="#405a50">ADMISSION</text>${lines(event.name, 32, 64, 177, 34)}<text x="64" y="${195 + nameLines * 45}" font-size="19">${escapeXml(event.date)}</text>${lines(event.location, 68, 64, 228 + nameLines * 45, 16)}<line x1="64" x2="696" y1="${guestTop - 20}" y2="${guestTop - 20}" stroke="#a9bdb2" stroke-dasharray="5 6"/>${lines(attendee.name, 42, 64, guestTop + 30, 23)}<g transform="translate(${(760 - qrSize) / 2} ${qrTop})">${qr}</g><text x="380" y="${qrTop + qrSize + 38}" text-anchor="middle" font-size="16">${escapeXml(ticket.ticketId)}</text><text x="380" y="${qrTop + qrSize + 79}" text-anchor="middle" font-size="20" font-weight="bold">Your place in the room.</text><text x="380" y="${qrTop + qrSize + 111}" text-anchor="middle" font-size="15" fill="#405a50">Show this signed QR at entry. Keep your ticket private.</text></g></svg>`;
}
export async function renderTicketSheet(
  event: ManagedEvent,
  attendees: readonly Attendee[],
  tickets: readonly IssuedTicket[],
): Promise<string> {
  if (!tickets.length || tickets.length > 500)
    throw new Error(
      'Export a sheet containing 1–500 issued tickets. Individual SVG downloads remain available.',
    );
  const sections: string[] = [];
  for (const ticket of tickets) {
    const attendee = attendees.find((row) => row.id === ticket.attendeeId);
    if (!attendee) throw new Error('Attendee missing from ticket export.');
    sections.push(
      `<article>${await renderTicketSvg(event, attendee, ticket)}</article>`,
    );
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeXml(event.name)} · EntryLoop tickets</title><style>body{margin:0;background:#e6ece8;font-family:Arial,sans-serif}article{max-width:480px;margin:24px auto;break-after:page}article>svg{width:100%;height:auto;display:block}@media print{body{background:white}article{margin:0 auto;max-width:160mm;page-break-after:always}}</style></head><body>${sections.join('')}</body></html>`;
}
