import { useCallback, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import type { CheckInRecord, SyncResult } from '../check-in/domain/models';
import type { EntryLoopDB } from '../check-in/persistence/database';
import {
  encodeTransfer,
  MAX_PAYLOAD_BYTES,
  MAX_RECORDS,
  payloadBytes,
} from './codec';
import { CameraScanner } from './CameraScanner';
import { BatchRejectedError } from './rejection';

type Props = {
  db: EntryLoopDB;
  eventId: string;
  selected: readonly CheckInRecord[];
  onImported: () => void;
};
export function TransferPanel({ db, eventId, selected, onImported }: Props) {
  const [payload, setPayload] = useState('');
  const [outgoing, setOutgoing] = useState<{
    text: string;
    image: string;
    count: number;
    displaySize: number;
  } | null>(null);
  const [result, setResult] = useState<Pick<
    SyncResult,
    'transferred' | 'imported' | 'skipped' | 'rejected'
  > | null>(null);
  const sendArea = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const receive = useCallback(
    async (text: string) => {
      setBusy(true);
      setError('');
      setResult(null);
      try {
        setResult(await db.importTransfer(eventId, text));
        onImported();
      } catch (failure) {
        if (failure instanceof BatchRejectedError)
          setResult({
            transferred: failure.recordCount,
            imported: 0,
            skipped: 0,
            rejected: failure.recordCount,
          });
        setError(
          failure instanceof Error
            ? failure.message
            : 'Import failed. No records written.',
        );
      } finally {
        setBusy(false);
      }
    },
    [db, eventId, onImported],
  );
  async function generate() {
    setBusy(true);
    setError('');
    setOutgoing(null);
    try {
      const text = await encodeTransfer(eventId, selected);
      const modules =
        QRCode.create(text, { errorCorrectionLevel: 'H' }).modules.size + 8;
      const available = Math.min(360, sendArea.current?.clientWidth ?? 320);
      const displaySize =
        modules * Math.max(1, Math.floor(available / modules));
      const image = await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H',
        margin: 4,
        scale: 8,
      });
      setOutgoing({ text, image, count: selected.length, displaySize });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'QR generation failed.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function readImage(file: File) {
    setBusy(true);
    setError('');
    setResult(null);
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError('Choose an image no larger than 10 MiB.');
      setBusy(false);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      let text: string;
      try {
        text = (
          await new BrowserQRCodeReader(
            new Map([[DecodeHintType.TRY_HARDER, true]]),
          ).decodeFromImageUrl(url)
        ).getText();
      } catch {
        // ZXing's detector can miss pristine screen captures; its pure-QR path decodes their actual pixels.
        text = (
          await new BrowserQRCodeReader(
            new Map([[DecodeHintType.PURE_BARCODE, true]]),
          ).decodeFromImageUrl(url)
        ).getText();
      }
      await receive(text);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? `QR image could not be read: ${failure.message || failure.name || 'No readable QR found. Use the original image or improve resolution.'}`
          : 'QR image could not be read.',
      );
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }
  return (
    <section className="panel transfer" aria-labelledby="transfer-title">
      <div className="section-title">
        <h2 id="transfer-title">Exchange operations</h2>
        <span>Single-frame experiment</span>
      </div>
      <p>
        Select up to {MAX_RECORDS} operations in the ledger. Every batch is
        limited to {MAX_PAYLOAD_BYTES} UTF-8 bytes. Exchange all batches in both
        directions to converge.
      </p>
      <div className="transfer-grid">
        <div ref={sendArea}>
          <h3>Send a batch</h3>
          <p>{selected.length} selected</p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy || !selected.length}
          >
            Generate QR transfer
          </button>
          {outgoing && (
            <div className="outgoing">
              <img
                className="qr"
                style={{ width: outgoing.displaySize }}
                src={outgoing.image}
                alt="QR transfer containing selected check-in operations"
              />
              <p data-testid="outgoing-count">
                Encoded {outgoing.count} records · {payloadBytes(outgoing.text)}{' '}
                bytes
              </p>
              <a href={outgoing.image} download="entryloop-transfer.png">
                Save QR image
              </a>
              <details>
                <summary>Exact outgoing payload</summary>
                <textarea
                  aria-label="Outgoing payload"
                  readOnly
                  value={outgoing.text}
                />
              </details>
              <p className="muted">
                This QR is a snapshot of the generated batch.
              </p>
            </div>
          )}
        </div>
        <div>
          <h3>Receive a batch</h3>
          <CameraScanner onPayload={receive} disabled={busy} />
          <p className="muted">
            Camera access needs HTTPS or localhost. Unsigned imports have no
            verified author.
          </p>
          <label className="file-label">
            Read QR image (local file)
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readImage(file);
                event.target.value = '';
              }}
            />
          </label>
          <details>
            <summary>Manual payload fallback</summary>
            <label>
              Incoming payload
              <textarea
                value={payload}

                onChange={(event) => setPayload(event.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={busy || !payload}
              onClick={() => void receive(payload)}
            >
              Import payload
            </button>
          </details>
          {result && (
            <div role="status" className="import-result">
              <p>
                {result.rejected
                  ? 'Batch rejected atomically. No operations written.'
                  : 'Batch imported. Checksum matches; author unverified.'}
              </p>
              <dl className="counts">
                {(
                  ['transferred', 'imported', 'skipped', 'rejected'] as const
                ).map((key) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd data-testid={`result-${key}`}>{result[key]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
      {busy && <p role="status">Processing locally…</p>}
      {error && (
        <p role="alert" className="error">
          {error} Batch not applied. For malformed input, a trustworthy record
          count is unavailable.
        </p>
      )}
    </section>
  );
}
