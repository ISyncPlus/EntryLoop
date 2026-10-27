import { useEffect, useState, useId } from 'react';
import { CameraScanner } from '../sync/CameraScanner';
import { makeQrImage, readQrImage } from '../sync/qr';
import { message } from './shared';
import { Feedback } from './Feedback';
export function SecurityInput({
  onPayload,
  busy,
}: {
  onPayload: (text: string) => Promise<void>;
  busy: boolean;
}) {
  const inputId = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  async function file(file: File) {
    setReading(true);
    setError('');
    try {
      if (file.size > 1024 * 1024)
        throw new Error('Security import exceeds 1 MiB.');
      await onPayload(
        file.type.startsWith('image/')
          ? await readQrImage(file)
          : await file.text(),
      );
    } catch (failure) {
      setError(message(failure));
    } finally {
      setReading(false);
    }
  }
  return (
    <div className="scan-input">
      <CameraScanner onPayload={onPayload} disabled={busy || reading} />
      <p className="fine-print">
        Scan one code, review the result, then scan the next. Camera requires
        HTTPS or localhost.
      </p>
      <label>
        Read security QR or JSON file
        <input
          type="file"
          accept="image/*,.json,application/json"
          disabled={busy || reading}
          onChange={(e) => {
            const input = e.currentTarget;
            const selected = input.files?.[0];
            if (selected)
              void file(selected).finally(() => {
                input.value = '';
              });
          }}
        />
      </label>
      <details>
        <summary>Security payload fallback</summary>
        <label htmlFor={inputId}>Incoming security payload</label>
        <textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          disabled={busy || reading || !text}
          onClick={() => void onPayload(text)}
        >
          Process security payload
        </button>
      </details>
      <Feedback error={error} />
    </div>
  );
}
export function SecurityQr({ text }: { text: string }) {
  const [qr, setQr] = useState<Awaited<ReturnType<typeof makeQrImage>> | null>(
    null,
  );
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    void makeQrImage(text, 320)
      .then((value) => {
        if (!cancelled) {
          setQr(value);
          setError('');
        }
      })
      .catch((failure: unknown) => {
        if (!cancelled) {
          setQr(null);
          setError(message(failure));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [text]);
  return (
    <div className="outgoing">
      {qr && (
        <>
          <img
            className="qr"
            src={qr.image}
            style={{ width: qr.displaySize }}
            alt="Authenticated security exchange QR"
          />
          <a href={qr.image} download="entryloop-security.png">
            Save security QR image
          </a>
        </>
      )}
      <p>{new TextEncoder().encode(text).length} UTF-8 bytes</p>
      <details>
        <summary>Exact security payload</summary>
        <textarea
          aria-label="Outgoing security payload"
          readOnly
          value={text}
        />
      </details>
      <Feedback error={error} />
    </div>
  );
}
