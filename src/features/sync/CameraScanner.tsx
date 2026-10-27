import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import {
  ChecksumException,
  FormatException,
  NotFoundException,
} from '@zxing/library';

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
    let cancelled = false;
    let controls: IScannerControls | undefined;
    const reader = new BrowserQRCodeReader();
    void reader
      .decodeFromVideoDevice(
        undefined,
        video.current,
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
      )
      .then((started) => {
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
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
