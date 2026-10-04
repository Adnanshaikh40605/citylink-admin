import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type PageResult, type Tournament } from '../api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  Toast,
  fromLocalInput,
  toLocalInput,
} from '../components/ui';
import { ImageField } from '../components/ImageField';

type FormState = {
  id?: string;
  name: string;
  description: string;
  thumbnail: string;
  startDate: string;
  endDate: string;
  featured: boolean;
  published: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  thumbnail: '',
  startDate: '',
  endDate: '',
  featured: false,
  published: true,
});

function toastIsError(message: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('fail') || lower.includes('invalid');
}

export function TournamentsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<Tournament> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (q.trim()) query.set('q', q.trim());
      const res = await api<PageResult<Tournament>>(
        `/admin/tournaments?${query}`,
      );
      setResult(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load tournaments.',
      );
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setForm(emptyForm());
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openEdit(item: Tournament) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description,
      thumbnail: item.thumbnail,
      startDate: toLocalInput(item.startDate),
      endDate: toLocalInput(item.endDate),
      featured: item.featured,
      published: item.published,
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description,
        thumbnail: form.thumbnail,
        startDate: fromLocalInput(form.startDate),
        endDate: fromLocalInput(form.endDate),
        featured: form.featured,
        published: form.published,
      };
      if (form.id) {
        await api(`/admin/tournaments/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setToast('Tournament updated.');
      } else {
        await api('/admin/tournaments', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setToast('Tournament created.');
      }
      setForm(null);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this tournament and all of its matches?')) return;
    try {
      await api(`/admin/tournaments/${id}`, { method: 'DELETE' });
      setToast('Tournament deleted.');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  return (
    <>
      <PageHeader
        title="Tournaments"
        subtitle="Create and publish tournaments. Matches belong to a tournament."
        actions={
          <button type="button" className="btn" onClick={() => setForm(emptyForm())}>
            Add Tournament
          </button>
        }
      />

      <div className="toolbar">
        <input
          style={{ maxWidth: 280 }}
          type="text"
          placeholder="Search tournaments..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Search
        </button>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {!error && !result ? <LoadingState /> : null}
      {result && result.data.length === 0 ? (
        <EmptyState message="No tournaments yet. Add the first tournament." />
      ) : null}

      {result && result.data.length > 0 ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Dates</th>
                <th>Matches</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <div className="muted">{item.description || '-'}</div>
                  </td>
                  <td>
                    {new Date(item.startDate).toLocaleDateString()}
                    {' - '}
                    {new Date(item.endDate).toLocaleDateString()}
                  </td>
                  <td>{item.matchCount ?? 0}</td>
                  <td>
                    <div className="row-actions">
                      <StatusBadge
                        status={item.published ? 'published' : 'unpublished'}
                      />
                      {item.featured ? (
                        <StatusBadge status="featured" />
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => void remove(item.id)}
                      >
                        Delete
                      </button>
                    </div>
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
        <Modal
          title={form.id ? 'Edit Tournament' : 'Add Tournament'}
          onClose={() => setForm(null)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="full">
                Tournament name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="full">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <ImageField
                label="Thumbnail"
                value={form.thumbnail}
                onChange={(thumbnail) => setForm({ ...form, thumbnail })}
              />
              <label>
                Start date
                <input
                  type="datetime-local"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </label>
              <label>
                End date
                <input
                  type="datetime-local"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                />
                Featured
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

      <Toast message={toast} error={toastIsError(toast)} />
    </>
  );
}
