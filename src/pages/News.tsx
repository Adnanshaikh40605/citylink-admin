import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type NewsItem, type PageResult } from '../api';
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
  title: string;
  description: string;
  thumbnail: string;
  youtubeVideoId: string;
  publishedAt: string;
  featured: boolean;
  published: boolean;
};

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  thumbnail: '',
  youtubeVideoId: '',
  publishedAt: toLocalInput(new Date().toISOString()),
  featured: false,
  published: true,
});

export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<NewsItem> | null>(null);
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
      const res = await api<PageResult<NewsItem>>(`/admin/news?${query}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news.');
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

  function openEdit(item: NewsItem) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      youtubeVideoId: item.youtubeVideoId ?? '',
      publishedAt: toLocalInput(item.publishedAt),
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
        title: form.title.trim(),
        description: form.description,
        thumbnail: form.thumbnail,
        youtubeVideoId: form.youtubeVideoId.trim() || null,
        publishedAt: fromLocalInput(form.publishedAt),
        featured: form.featured,
        published: form.published,
      };
      if (form.id) {
        await api(`/admin/news/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setToast('News updated.');
      } else {
        await api('/admin/news', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setToast('News created.');
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
    if (!window.confirm('Delete this news item?')) return;
    try {
      await api(`/admin/news/${id}`, { method: 'DELETE' });
      setToast('News deleted.');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  return (
    <>
      <PageHeader
        title="News"
        subtitle="Publish news videos and featured updates for the mobile app."
        actions={
          <button type="button" className="btn" onClick={() => setForm(emptyForm())}>
            Add News
          </button>
        }
      />

      <div className="toolbar">
        <input
          style={{ maxWidth: 280 }}
          type="text"
          placeholder="Search news..."
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
        <EmptyState message="No news items yet." />
      ) : null}

      {result && result.data.length > 0 ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Published</th>
                <th>YouTube</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.description || '-'}</div>
                  </td>
                  <td>{new Date(item.publishedAt).toLocaleString()}</td>
                  <td className="muted">{item.youtubeVideoId || '-'}</td>
                  <td>
                    <div className="row-actions">
                      <StatusBadge
                        status={item.published ? 'published' : 'unpublished'}
                      />
                      {item.featured ? <StatusBadge status="featured" /> : null}
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
          title={form.id ? 'Edit News' : 'Add News'}
          onClose={() => setForm(null)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="full">
                Title
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
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
              <label className="full">
                YouTube Video ID
                <input
                  value={form.youtubeVideoId}
                  onChange={(e) =>
                    setForm({ ...form, youtubeVideoId: e.target.value })
                  }
                />
              </label>
              <ImageField
                label="Thumbnail"
                value={form.thumbnail}
                onChange={(thumbnail) => setForm({ ...form, thumbnail })}
              />
              <label>
                Publication date
                <input
                  type="datetime-local"
                  required
                  value={form.publishedAt}
                  onChange={(e) =>
                    setForm({ ...form, publishedAt: e.target.value })
                  }
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

      <Toast message={toast} />
    </>
  );
}
