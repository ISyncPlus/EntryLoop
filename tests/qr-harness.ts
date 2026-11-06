// Test-only bundle: exercise production encoders/decoders, not mocked scan callbacks.
import { opticalFixtures } from '../src/test/optical-fixtures';
import { packOptical, unpackOptical } from '../src/features/sync/optical';
import { makeQrImage } from '../src/features/sync/qr-render';
import { readQrImage } from '../src/features/sync/qr';
import { renderTicketSvg } from '../src/features/tickets/export';
import { verifyTicket } from '../src/features/tickets/signatures';
const audit = {
  fixtures: opticalFixtures,
  pack: packOptical,
  unpack: unpackOptical,
  image: makeQrImage,
  read: readQrImage,
  ticketSvg: renderTicketSvg,
  verifyTicket,
  async decode(data: string, name = 'qr.png') {
    const response = await fetch(data);
    return readQrImage(
      new File([await response.blob()], name, {
        type: response.headers.get('content-type') ?? 'image/png',
      }),
    );
  },
};
window.qrAudit = audit;
declare global {
  interface Window {
    qrAudit: typeof audit;
  }
}
