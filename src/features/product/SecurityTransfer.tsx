import { packOptical } from '../sync/optical';
import { QrDisplay } from '../sync/QrDisplay';
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
        Choose a code image or approval file
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
        <summary>Advanced text import</summary>
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
  const [legacy, setLegacy] = useState(false);
  const [generated, setQr] = useState<
    | (Awaited<ReturnType<typeof makeQrImage>> & {
        source: string;
        legacy: boolean;
      })
    | null
  >(null);
  const qr =
    generated?.source === text && generated.legacy === legacy
      ? generated
      : null;
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => makeQrImage(legacy ? text : packOptical(text), 320))
      .then((value) => {
        if (!cancelled) {
          setQr({ ...value, source: text, legacy });
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
  }, [text, legacy]);
  return (
    <div className="outgoing">
      {qr && (
        <>
          <QrDisplay
            image={qr.image}
            totalModules={qr.totalModules}
            alt="Authenticated security exchange QR"
          />
          <a href={qr.image} download="entryloop-security.png">
            Save security QR image
          </a>
        </>
      )}
      <details className="qr-diagnostics">
        <summary>Compatibility & QR details</summary>
        <label>
          <input
            type="checkbox"
            checked={legacy}
            onChange={(event) => setLegacy(event.target.checked)}
          />
          Compatibility QR (JSON for older EntryLoop)
        </label>
        <p data-testid="security-qr-statistics">
          {qr
            ? `${qr.bytes} QR bytes · version ${qr.version} · ${qr.modules} × ${qr.modules} modules · ${qr.correction} correction · ${qr.imageSize} × ${qr.imageSize} image pixels`
            : 'QR unavailable'}{' '}
          · {new TextEncoder().encode(text).length} signed JSON bytes
        </p>
        <p>
          Compact codes require the updated app on both devices. Choose
          compatibility for older apps. Signatures and authorization checks are
          identical.
        </p>
      </details>
      <details>
        <summary>Signed message JSON / manual fallback</summary>
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
