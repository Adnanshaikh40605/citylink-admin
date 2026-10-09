import { useEffect, useState, type FormEvent } from 'react';
import { api, type BroadcastItem, type PageResult } from '../api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Toast,
} from '../components/ui';

export function UpdatesPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PageResult<BroadcastItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setResult(await api<PageResult<BroadcastItem>>('/admin/broadcasts?limit=20'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load updates.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ broadcast: BroadcastItem }>('/admin/broadcasts', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), message: message.trim() }),
      });
      const status = res.broadcast.pushStatus;
      setToast(
        status === 'sent'
          ? 'Update published and push sent.'
          : status === 'skipped_no_fcm_key'
            ? 'Update saved. Push was not sent because FCM is not configured yet.'
            : `Update saved. Push status: ${status}.`,
      );
      setTitle('');
      setMessage('');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not send update.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: BroadcastItem) {
    if (!window.confirm(`Delete update "${item.title}"?`)) return;
    await api(`/admin/broadcasts/${item.id}`, { method: 'DELETE' });
    setToast('Update deleted.');
    await load();
  }

  return (
    <>
      <PageHeader
        title="Update Message"
        subtitle="Publish an official City Link update. Native push is sent when FCM is configured."
      />
      <form className="card card-pad" onSubmit={send}>
        <div className="form-grid">
          <label className="full">
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Live match starts at 7:00 PM"
            />
          </label>
          <label className="full">
            Message
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Join now."
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send / Publish'}
          </button>
        </div>
      </form>
      <div style={{ height: 16 }} />
      {error ? <ErrorState message={error} /> : null}
      {!error && !result ? <LoadingState /> : null}
      {result && result.data.length === 0 ? (
        <EmptyState message="No updates published yet." />
      ) : null}
      {result && result.data.length > 0 ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Update</th>
                <th>Push</th>
                <th>Sent</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.message}</div>
                  </td>
                  <td className="muted">{item.pushStatus}</td>
                  <td>{new Date(item.publishedAt).toLocaleString()}</td>
                  <td>
                    <button type="button" className="btn danger" onClick={() => void remove(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Toast message={toast} />
    </>
  );
}
