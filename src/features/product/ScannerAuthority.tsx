import { useCallback, useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import type { ManagedEvent } from '../events/models';
import { authorize, changePolicy, currentPolicy, enrollmentRequest, identity, importOwnCredential, importPolicy, inspectEnrollment } from '../security/authority';
import type { Enrollment } from '../security/models';
import { SecurityInput, SecurityQr } from './SecurityTransfer';
import { useLiveData, message } from './shared';
import { Feedback } from './Feedback';
import { downloadText } from '../tickets/export';
export function ScannerAuthority({ db, event }: { db: EntryLoopDB; event: ManagedEvent }) {
  const query = useCallback(async () => ({ own: await db.scannerKeys.get('local'), policy: await currentPolicy(db, event.id), credentials: await db.credentials.where('e').equals(event.id).toArray() }), [db, event.id]);
  const { data, error: storageError } = useLiveData(query);
  const [label, setLabel] = useState('Entrance scanner');
  const [outgoing, setOutgoing] = useState('');
  const [request, setRequest] = useState<{ request: Enrollment; fingerprint: string } | null>(null);
  const [confirmed, setConfirmed] = useState('');
  const [ticket, setTicket] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function action(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (failure) { setError(message(failure)); } finally { setBusy(false); }
  }
  const receive = useCallback(async (text: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (new TextEncoder().encode(text).length > 1024 * 1024) throw new Error('Security payload exceeds 1 MiB.');
      const value: unknown = JSON.parse(text);
      if (typeof value !== 'object' || !value) throw new Error('Invalid security payload.');
      if ('kind' in value) {
        if (event.role !== 'organizer') throw new Error('Take the enrollment request to the organizer.');
        setRequest(await inspectEnrollment(value, event.id)); setConfirmed('');
      } else if ('revokedScanners' in value) {
        await importPolicy(db, event.id, value); setNotice('Signed revocation policy imported. Review excluded historical admissions.');
      } else {
        await importOwnCredential(db, event.id, value); setNotice('Organizer authorization verified. This scanner can now sign admissions.');
      }
    } catch (failure) { setError(message(failure)); } finally { setBusy(false); }
  }, [db, event]);
  const credential = data?.credentials.find(c => c.d === data.own?.scannerId);
  const revoked = credential && data?.policy?.revokedScanners.includes(credential.d);
  return <section className="panel" aria-labelledby="scanner-authorization-title">
    <h2 id="scanner-authorization-title">Scanner authorization</h2>
    <p data-testid="authorization-status">{credential && !revoked ? 'Authorized for this event' : revoked ? 'Scanner revoked' : 'Not authorized for admissions'}</p>
    <p>Profiles separate browser databases; they do not grant authorization. Prepare the event package, show this scanner’s request to the organizer, compare its fingerprint, then scan the organizer’s authorization response.</p>
    {data?.own && <div className="scanner-id"><span>Cryptographic scanner identity</span><code data-testid="scanner-crypto-id">{data.own.scannerId}</code><span>Scanner fingerprint — compare all 64 characters</span><code data-testid="scanner-fingerprint">{data.own.fingerprint}</code></div>}
    <p>Revocation policy: {data?.policy?.epoch ?? 'not installed'}. Disconnected scanners cannot know about newer revocations. Confirm the latest policy with the organizer before each shift.</p>
    <label>Scanner name<input maxLength={24} value={label} onChange={e => setLabel(e.target.value)} /></label>
    <button disabled={busy || !label.trim()} onClick={() => void action(async () => { setOutgoing(JSON.stringify(await enrollmentRequest(db, event.id, label))); })}>Create enrollment request</button>
    {event.role === 'organizer' && <button disabled={busy || !label.trim()} onClick={() => void action(async () => {
      const own = await identity(db);
      await authorize(db, event.id, await enrollmentRequest(db, event.id, label), own.fingerprint);
      setNotice('This organizer device was explicitly authorized as a scanner.');
    })}>Authorize this device</button>}
    <SecurityInput onPayload={receive} busy={busy} />
    {request && <div className="package-review"><h3>Authorize {request.request.l}?</h3><p>Compare the fingerprint directly on the intended scanner. The request proves possession of a key, not a staff member’s identity.</p><code>{request.fingerprint}</code><label>Confirm scanner fingerprint<input value={confirmed} onChange={e => setConfirmed(e.target.value)} autoComplete="off" /></label><button disabled={busy || confirmed !== request.fingerprint} onClick={() => void action(async () => {
      setOutgoing(JSON.stringify(await authorize(db, event.id, request.request, confirmed))); setRequest(null); setNotice('Authorization signed. Return this QR to the requesting scanner.');
    })}>Authorize requested scanner</button></div>}
    {outgoing && <SecurityQr key={outgoing} text={outgoing} />}
    {event.role === 'organizer' && <details><summary>Revocation and recovery</summary><p>Revocation is permanent for this identity. All its admissions stay stored but are excluded from trusted totals after the policy update. Distribute the updated package or signed policy to every scanner. Lost organizer keys cannot be recovered here; keep this browser’s storage and original device safe.</p>
      {data?.credentials.map(c => <p key={c.d}>{c.l} · <code>{c.d}</code> <button disabled={busy || data.policy?.revokedScanners.includes(c.d)} onClick={() => { if (window.confirm(`Revoke ${c.l}? All its admissions will be excluded from trusted attendance. Offline devices need the updated policy.`)) void action(async () => { await changePolicy(db, event.id, { scanner: c.d }); setNotice('Scanner revoked locally. Distribute the latest signed policy.'); }); }}>Revoke {c.l}</button></p>)}
      <label>Ticket ID to revoke<input value={ticket} onChange={e => setTicket(e.target.value)} /></label><button disabled={busy || !ticket} onClick={() => { if (window.confirm('Permanently revoke this ticket and exclude its admissions? Distribute the updated policy to every scanner.')) void action(async () => { if (!(await db.ticketCatalog.get([event.id, ticket]))) throw new Error('Unknown issued ticket ID.'); await changePolicy(db, event.id, { ticket }); setTicket(''); setNotice('Ticket revoked locally. Distribute the latest signed policy.'); }); }}>Revoke ticket</button>
      {data?.policy && <><p>{data.policy.revokedScanners.length} revoked scanners · {data.policy.revokedTickets.length} revoked tickets</p><button disabled={busy} onClick={() => { downloadText('entryloop-policy.json', JSON.stringify(data.policy), 'application/json'); }}>Download signed policy</button><button disabled={busy || new TextEncoder().encode(JSON.stringify(data.policy)).length > 900} onClick={() => setOutgoing(JSON.stringify(data.policy))}>Show policy QR (up to 900 bytes)</button><p>Policies over 900 bytes require a JSON file or an updated event package; nothing is truncated.</p></>}
    </details>}
    <Feedback error={error || storageError} notice={notice} />
  </section>;
}
