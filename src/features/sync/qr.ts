import QRCode from 'qrcode';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
export async function makeQrImage(
  text: string,
  available = 320,
): Promise<{ image: string; displaySize: number }> {
  const modules =
    QRCode.create(text, { errorCorrectionLevel: 'H' }).modules.size + 8;
  const displaySize =
    modules * Math.max(1, Math.floor(Math.min(360, available) / modules));
  const image = await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'H',
    margin: 4,
    scale: 8,
  });
  return { image, displaySize };
}
// Only generated SVG ticket geometry is used here; no payload text is read from markup.
async function readTicketCrop(file: File, url: string): Promise<string | null> {
  if (file.type !== 'image/svg+xml') return null;
  const parsedSvg = new DOMParser().parseFromString(
    await file.text(),
    'image/svg+xml',
  );
  const qr = parsedSvg.querySelector('svg svg');
  const transform = qr?.parentElement
    ?.getAttribute('transform')
    ?.match(/^translate\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)\)$/);
  if (!qr || !transform) return null;
  const x = Number(transform[1]);
  const y = Number(transform[2]);
  const width = Number(qr.getAttribute('width'));
  const height = Number(qr.getAttribute('height'));
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    width > 2048 ||
    height > 2048
  )
    return null;
  const source = new Image();
  await new Promise<void>((resolve, reject) => {
    source.onload = () => resolve();
    source.onerror = () =>
      reject(new Error('SVG ticket image could not load.'));
    source.src = url;
  });
  if (
    source.naturalWidth * source.naturalHeight > 16_000_000 ||
    x + width > source.naturalWidth ||
    y + height > source.naturalHeight
  )
    throw new Error('SVG ticket dimensions exceed the supported bounds.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image decoding requires a 2D canvas.');
  context.drawImage(source, x, y, width, height, 0, 0, width, height);
  return new BrowserQRCodeReader(new Map([[DecodeHintType.PURE_BARCODE, true]]))
    .decodeFromCanvas(canvas)
    .getText();
}
export async function readQrImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024)
    throw new Error('Choose an image no larger than 10 MiB.');
  const url = URL.createObjectURL(file);
  try {
    try {
      const cropped = await readTicketCrop(file, url);
      if (cropped) return cropped;
    } catch {
      /* A foreign/unsupported SVG can still be decoded by the general reader below. */
    }
    try {
      return (
        await new BrowserQRCodeReader(
          new Map([[DecodeHintType.TRY_HARDER, true]]),
        ).decodeFromImageUrl(url)
      ).getText();
    } catch {
      // ZXing's pure pixel path handles pristine screen captures missed by its general detector.
      return (
        await new BrowserQRCodeReader(
          new Map([[DecodeHintType.PURE_BARCODE, true]]),
        ).decodeFromImageUrl(url)
      ).getText();
    }
  } catch (failure) {
    throw new Error(
      'No readable QR was found in the image. Use the original QR image or scan with the camera.',
      { cause: failure },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
