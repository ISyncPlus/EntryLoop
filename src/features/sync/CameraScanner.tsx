import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';

type Props = {
  onPayload: (payload: string) => Promise<void>;
  disabled: boolean;
};
export function CameraScanner({ onPayload, disabled }: Props) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!active || !video.current) return;
    const preview = video.current;
    let cancelled = false;
    let controls: IScannerControls | undefined;
    void (async () => {
      const [
        { BrowserQRCodeReader },
        { ChecksumException, FormatException, NotFoundException },
      ] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);
      if (cancelled) return undefined;
      return new BrowserQRCodeReader().decodeFromVideoDevice(
        undefined,
        preview,
        (result, scanError, current) => {
          if (cancelled) {
            current.stop();
            return;
          }
          if (result) {
            cancelled = true;
            current.stop();
            setActive(false);
            void onPayload(result.getText());
          } else if (
            scanError &&
            !(scanError instanceof NotFoundException) &&
            !(scanError instanceof ChecksumException) &&
            !(scanError instanceof FormatException)
          ) {
            cancelled = true;
            current.stop();
            setActive(false);
            setError(scanError.message);
          }
        },
      );
    })()
      .then((started) => {
        if (!started) return;
        controls = started;
        if (cancelled) started.stop();
      })
      .catch((failure: unknown) => {
        if (!cancelled) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'Camera could not start.',
          );
          setActive(false);
        }
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active, onPayload]);
  return (
    <div className="camera">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setError('');
          if (
            !active &&
            (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
          ) {
            setError(
              'Camera requires HTTPS (or localhost), a supported browser and permission.',
            );
            return;
          }
          setActive((value) => !value);
        }}
      >
        {active ? 'Stop camera' : 'Scan with camera'}
      </button>
      {active && (
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          aria-label="QR camera preview"
        />
      )}
      {error && (
        <div className="camera-error">
          <p role="alert">{error}</p>
          <p>
            Check camera permission in this browser’s site settings, then retry.
            You can also read an original QR image using the file option below.
          </p>
        </div>
      )}
    </div>
  );
}
