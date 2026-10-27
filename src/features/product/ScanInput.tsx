import { useState } from 'react';
import { CameraScanner } from '../sync/CameraScanner';
import { readQrImage } from '../sync/qr';
import { message } from './shared';
import { Feedback } from './Feedback';
export function ScanInput({
  onPayload,
  busy,
}: {
  onPayload: (text: string) => Promise<void>;
  busy: boolean;
}) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [text, setText] = useState('');
  async function image(file: File) {
    setReading(true);
    setError('');
    try {
      await onPayload(await readQrImage(file));
    } catch (failure) {
      setError('QR image could not be read: ' + message(failure));
    } finally {
      setReading(false);
    }
  }
  return (
    <div className="scan-input">
      <CameraScanner onPayload={onPayload} disabled={busy || reading} />
      <p>
        Position the ticket QR inside the camera view. The camera stops after
        each code so you can review the admission.
      </p>
      <details>
        <summary>Use an image or payload instead</summary>
        <label className="file-label">
          Read ticket QR image
          <input
            type="file"
            accept="image/*"
            disabled={busy || reading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void image(file);
              e.target.value = '';
            }}
          />
        </label>
        <label>
          Signed ticket payload
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button
          disabled={busy || reading || !text}
          onClick={() => void onPayload(text)}
        >
          Verify and admit ticket
        </button>
        <p className="fine-print">
          Image import and manual payload entry use the same signature
          verification. They do not prove physical camera scanning.
        </p>
      </details>
      <Feedback error={error} />
      {reading && <p role="status">Reading QR pixels locally…</p>}
    </div>
  );
}
