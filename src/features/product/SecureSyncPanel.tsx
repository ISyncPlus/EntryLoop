import { useCallback, useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { acceptFrame, convergenceStatus, frameText, missingIndices, missingRequest, startReceive } from '../security/exchange';
import type { SyncSession } from '../security/exchange';
import { useLiveData, message } from './shared';
import { SecurityInput, SecurityQr } from './SecurityTransfer';
import { Feedback } from './Feedback';
export function SecureSyncPanel({ db, eventId }: { db: EntryLoopDB; eventId: string }) {
  const [id, setId] = useState('');
  const [index, setIndex] = useState(0);
  const [resend, setResend] = useState<number[] | null>(null);
  const [special, setSpecial] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const query = useCallback(async () => {
    const sessions = await db.syncSessions.where('eventId').equals(eventId).toArray();
    const session = sessions.find(s => s.id === id);
    return { sessions, session, status: session ? await convergenceStatus(db, session) : '' };
  }, [db, eventId, id]);
  const { data, error: storageError } = useLiveData(query);
  const receive = useCallback(async (text: string) => {
    setBusy(true); setError('');
    try {
      const result = await acceptFrame(db, eventId, text);
      setId(result.session.id); setIndex(0); setResend(result.resend ?? null); setSpecial('');
    } catch (failure) { setError(message(failure)); } finally { setBusy(false); }
  }, [db, eventId]);
  async function begin() {
    setBusy(true); setError('');
    try { const session = await startReceive(db, eventId); setId(session.id); setIndex(0); setResend(null); setSpecial(''); }
    catch (failure) { setError(message(failure)); } finally { setBusy(false); }
  }
  const session = data?.session;
  const queue = session ? outgoingFrames(session, resend) : [];
  const current = special || queue[index]?.text || '';
  const missing = session?.direction === 'incoming' ? missingIndices(session) : [];
  return <section className="panel transfer" aria-labelledby="secure-sync-title">
    <h2 id="secure-sync-title">Authenticated offline exchange</h2>
    <p>Receiver: create a request. Sender: scan it, then show the offer and every prepared batch. Receiver: scan those codes and return the acknowledgment. Exchange in both directions until operation identities and integrity match. No network is used.</p>
    <p>900 UTF-8 bytes per QR · 2 admissions per data batch · up to 10,000 operations per snapshot. Advance codes manually after successful reads; no timed animation.</p>
    <button disabled={busy} onClick={() => void begin()}>Start receiving</button>
    <label>Resume saved exchange<select aria-label="Resume saved exchange" value={id} onChange={e => { setId(e.target.value); setIndex(0); setSpecial(''); setResend(null); }}><option value="">Choose exchange</option>{data?.sessions.map(s => <option key={s.id} value={s.id}>{s.direction} · {s.id.slice(0,8)} · {s.ack ? 'receipt stored' : 'incomplete'}</option>)}</select></label>
    {session && <>
      <p>Exchange <code data-testid="sync-session-id">{session.id}</code></p>
      {session.direction === 'incoming' && <><p data-testid="sync-progress">{Object.keys(session.frames).length} / {session.offer?.f ?? 0} frames received · {missing.length} missing</p>{missing.length > 0 && <><p role="status">Incomplete sync. Staged frames survive reload; admissions are not accepted until the whole snapshot verifies.</p><button disabled={busy} onClick={() => { setBusy(true); setError(''); void missingRequest(db, session.id).then(setSpecial).catch((failure: unknown) => setError(message(failure))).finally(()=>setBusy(false)); }}>Request missing batches</button><p>One missing-frame request lists at most 32 indices. Repeat after those arrive if more remain.</p></>}</>}
      {session.result && <dl className="counts">{(['transferred','imported','skipped','rejected'] as const).map(k=><div key={k}><dt>{k}</dt><dd data-testid={`secure-result-${k}`}>{session.result![k]}</dd></div>)}</dl>}
      {session.ack && <p role="status" data-testid="sync-completion">{data?.status}{session.direction === 'incoming' && ' Return the acknowledgment QR to the sender.'}</p>}
      {!session.ack && session.direction === 'outgoing' && <p role="status">Incomplete: waiting for the intended receiver’s signed acknowledgment.</p>}
    </>}
    <div className="transfer-grid"><div>
      {current && <><p data-testid="sync-frame-label">{special ? 'Missing-frame request' : queue[index]?.label}</p><SecurityQr key={current} text={current} /></>}
      {!special && queue.length > 1 && <div><button disabled={busy || index === 0} onClick={()=>setIndex(i=>i-1)}>Previous sync code</button><span> {index + 1} / {queue.length} </span><button disabled={busy || index >= queue.length - 1} onClick={()=>setIndex(i=>i+1)}>Next sync code</button></div>}
      {special && <button onClick={()=>setSpecial('')}>Return to exchange</button>}
    </div><div><h3>Read the other device’s code</h3><SecurityInput onPayload={receive} busy={busy} /></div></div>
    <Feedback error={error || storageError} />
    {error && <p>No unverified admissions were accepted from this frame. Previously verified admissions and staged frames remain stored. A trustworthy rejected-record count may be unavailable for malformed input.</p>}
  </section>;
}
function outgoingFrames(session: SyncSession, resend: number[] | null): { text: string; label: string }[] {
  if (session.direction === 'request') return [{ text: frameText(session.request), label: 'Receiver request — show to sender' }];
  if (session.direction === 'incoming') return session.ack ? [{ text: frameText(session.ack), label: 'Completion acknowledgment — return to sender' }] : [];
  const indices = resend ?? Array.from({ length: session.offer?.f ?? 0 }, (_, i)=>i);
  return [...(!resend && session.offer ? [{ text: frameText(session.offer), label: 'Signed offer — scan before data batches' }] : []), ...indices.map(i=>({ text: session.frames[String(i)]!, label: `Data batch ${i + 1} / ${session.offer?.f ?? 0}` }))];
}
