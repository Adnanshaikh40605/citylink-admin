import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Match, type PageResult, type Photo } from '../api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  Toast,
} from '../components/ui';

type FormState = {
  matchId: string;
  imageUrl: string;
  caption: string;
  sortOrder: number;
  published: boolean;
};

const emptyPhotoForm = (matchId = ''): FormState => ({
  matchId,
  imageUrl: '',
  caption: '',
  sortOrder: 0,
  published: true,
});

export function PhotosPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [matchId, setMatchId] = useState('');
  const [result, setResult] = useState<PageResult<Photo> | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadMatches() {
    const res = await api<PageResult<Match>>('/admin/matches?limit=50');
    setMatches(res.data);
  }

  async function load() {
    setError(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '24',
      });
      if (matchId) query.set('matchId', matchId);
      const res = await api<PageResult<Photo>>(`/admin/photos?${query}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos.');
    }
  }

  useEffect(() => {
    void loadMatches().catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [page, matchId]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setForm(emptyPhotoForm(matches[0]?.id ?? ''));
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, matches]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await api(`/admin/matches/${form.matchId}/photos`, {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: form.imageUrl.trim(),
          caption: form.caption || null,
          sortOrder: Number(form.sortOrder) || 0,
          published: form.published,
        }),
      });
      setToast('Photo added to match.');
      setForm(null);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api(`/admin/photos/${id}`, { method: 'DELETE' });
      setToast('Photo deleted.');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  return (
    <>
      <PageHeader
        title="Photos"
        subtitle="Match photos only. Each photo belongs to one match."
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => setForm(emptyPhotoForm(matches[0]?.id ?? ''))}
          >
            Add Photo
          </button>
        }
      />

      <div className="toolbar">
        <select
          style={{ maxWidth: 320 }}
          value={matchId}
          onChange={(e) => {
            setPage(1);
            setMatchId(e.target.value);
          }}
        >
          <option value="">All matches</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.teamA} vs {m.teamB}
            </option>
          ))}
        </select>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {!error && !result ? <LoadingState /> : null}
      {result && result.data.length === 0 ? (
        <EmptyState message="No photos yet for this filter." />
      ) : null}

      {result && result.data.length > 0 ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Match</th>
                <th>Caption</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <img className="thumb" src={item.imageUrl} alt="" />
                  </td>
                  <td>{item.matchTitle || item.matchId}</td>
                  <td>{item.caption || '-'}</td>
                  <td>{item.sortOrder}</td>
                  <td>
                    <StatusBadge
                      status={item.published ? 'published' : 'unpublished'}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => void remove(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={result.page}
            total={result.total}
            limit={result.limit}
            onPage={setPage}
          />
        </div>
      ) : null}

      {form ? (
        <Modal title="Add Photo" onClose={() => setForm(null)}>
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="full">
                Match
                <select
                  required
                  value={form.matchId}
                  onChange={(e) =>
                    setForm({ ...form, matchId: e.target.value })
                  }
                >
                  <option value="">Select match</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.teamA} vs {m.teamB}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full">
                Image URL
                <input
                  type="url"
                  required
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                />
              </label>
              <label className="full">
                Caption
                <input
                  value={form.caption}
                  onChange={(e) =>
                    setForm({ ...form, caption: e.target.value })
                  }
                />
              </label>
              <label>
                Sort order
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sortOrder: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) =>
                    setForm({ ...form, published: e.target.checked })
                  }
                />
                Published
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <Toast message={toast} />
    </>
  );
}
