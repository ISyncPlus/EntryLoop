import QRCode from 'qrcode';
export type Correction = 'M' | 'Q' | 'H';
// Clean screen-to-camera targets: M favors larger modules. Physical acceptance remains required.
export const QR_CORRECTION: Correction = 'M';
export const QUIET_ZONE = 4;
export const IMAGE_SCALE = 8;
export function qrGeometry(
  text: string,
  correction: Correction = QR_CORRECTION,
) {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > 900)
    throw new Error(
      'QR exceeds the supported 900-byte capacity. Nothing truncated.',
    );
  const qr = QRCode.create(text, { errorCorrectionLevel: correction });
  const totalModules = qr.modules.size + QUIET_ZONE * 2;
  return {
    version: qr.version,
    modules: qr.modules.size,
    totalModules,
    correction,
    bytes,
    imageSize: totalModules * IMAGE_SCALE,
  };
}
export async function makeQrImage(
  text: string,
  available = 320,
  correction: Correction = QR_CORRECTION,
) {
  const geometry = qrGeometry(text, correction);
  const displaySize =
    geometry.totalModules *
    Math.max(1, Math.floor(Math.min(360, available) / geometry.totalModules));
  const image = await QRCode.toDataURL(text, {
    errorCorrectionLevel: correction,
    margin: QUIET_ZONE,
    scale: IMAGE_SCALE,
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
  return { image, displaySize, ...geometry };
}
