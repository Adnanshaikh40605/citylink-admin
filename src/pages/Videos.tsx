import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, api, type PageResult, type ShowItem } from '../api';
import { ImageField } from '../components/ImageField';
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

type FormState = {
  id?: string;
  title: string;
  description: string;
  category: ShowItem['category'];
  videoSource: 'YOUTUBE' | 'UPLOAD';
  youtubeVideoId: string;
  videoFileUrl: string;
  thumbnail: string;
  duration: string;
  views: string;
  featured: boolean;
  published: boolean;
  publishedAt: string;
};

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  category: 'EVENTS',
  videoSource: 'YOUTUBE',
  youtubeVideoId: '',
  videoFileUrl: '',
  thumbnail: '',
  duration: '',
  views: '0',
  featured: false,
  published: false,
  publishedAt: toLocalInput(new Date().toISOString()),
});

export function VideosPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<ShowItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(page), limit: '20' });
      if (q.trim()) query.set('q', q.trim());
      if (category) query.set('category', category);
      setResult(await api<PageResult<ShowItem>>(`/admin/shows?${query}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos.');
    }
  }

  useEffect(() => {
    void load();
  }, [page, category]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setForm(emptyForm());
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openEdit(item: ShowItem) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      videoSource: item.videoSource,
      youtubeVideoId: item.youtubeVideoId ?? '',
      videoFileUrl: item.videoFileUrl ?? '',
      thumbnail: item.thumbnail,
      duration: item.duration,
      views: String(item.views),
      featured: item.featured,
      published: item.published,
      publishedAt: toLocalInput(item.publishedAt),
    });
  }

  async function uploadVideo(file: File | null) {
    if (!file || !form) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api<{ url: string }>('/admin/uploads/video', {
        method: 'POST',
        body,
      });
      setForm({ ...form, videoFileUrl: res.url, videoSource: 'UPLOAD' });
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Video upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        videoSource: form.videoSource,
        youtubeVideoId:
          form.videoSource === 'YOUTUBE' ? form.youtubeVideoId.trim() || null : null,
        videoFileUrl:
          form.videoSource === 'UPLOAD' ? form.videoFileUrl.trim() || null : null,
        thumbnail: form.thumbnail,
        duration: form.duration,
        views: Number(form.views) || 0,
        featured: form.featured,
        published: form.published,
        publishedAt: fromLocalInput(form.publishedAt),
      };
      if (form.id) {
        await api(`/admin/shows/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setToast('Video updated.');
      } else {
        await api('/admin/shows', { method: 'POST', body: JSON.stringify(body) });
        setToast('Video created.');
      }
      setForm(null);
      await load();
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ShowItem) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await api(`/admin/shows/${item.id}`, { method: 'DELETE' });
      setToast('Video deleted.');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  return (
    <>
      <PageHeader
        title="Videos & Shows"
        subtitle="Events, podcast, films and education. YouTube references stay separate from uploaded files."
        actions={
          <button type="button" className="btn" onClick={() => setForm(emptyForm())}>
            Add video
          </button>
        }
      />
      <div className="toolbar">
        <input
          style={{ maxWidth: 260 }}
          placeholder="Search title..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="EVENTS">Events</option>
          <option value="PODCAST">Podcast</option>
          <option value="FILMS">Films</option>
          <option value="EDUCATION">Education</option>
        </select>
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
        <EmptyState message="No videos yet. Add one for Explore." />
      ) : null}
      {result && result.data.length > 0 ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Source</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.duration || 'No duration'}</div>
                  </td>
                  <td>{item.category}</td>
                  <td className="muted">
                    {item.videoSource === 'UPLOAD' ? 'Uploaded file' : 'YouTube'}
                  </td>
                  <td>
                    <StatusBadge status={item.published ? 'published' : 'unpublished'} />
                    {item.featured ? (
                      <>
                        {' '}
                        <StatusBadge status="featured" />
                      </>
                    ) : null}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn secondary" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className="btn danger" onClick={() => void remove(item)}>
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
        <Modal title={form.id ? 'Edit video' : 'Add video'} onClose={() => setForm(null)}>
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
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as FormState['category'] })
                  }
                >
                  <option value="EVENTS">Events</option>
                  <option value="PODCAST">Podcast</option>
                  <option value="FILMS">Films</option>
                  <option value="EDUCATION">Education</option>
                </select>
              </label>
              <label>
                Video source
                <select
                  value={form.videoSource}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      videoSource: e.target.value as FormState['videoSource'],
                    })
                  }
                >
                  <option value="YOUTUBE">YouTube ID or URL</option>
                  <option value="UPLOAD">Upload video file</option>
                </select>
              </label>
              {form.videoSource === 'YOUTUBE' ? (
                <label className="full">
                  YouTube Video ID or URL
                  <input
                    placeholder="https://youtu.be/... or 11-character ID"
                    value={form.youtubeVideoId}
                    onChange={(e) => setForm({ ...form, youtubeVideoId: e.target.value })}
                  />
                </label>
              ) : (
                <label className="full">
                  Video file (MP4, WebM, MOV)
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => void uploadVideo(e.target.files?.[0] ?? null)}
                  />
                  <span className="muted">
                    {uploading
                      ? 'Uploading...'
                      : form.videoFileUrl || 'No file uploaded yet.'}
                  </span>
                </label>
              )}
              <ImageField
                label="Thumbnail"
                value={form.thumbnail}
                onChange={(thumbnail) => setForm({ ...form, thumbnail })}
              />
              <label>
                Duration
                <input
                  placeholder="12:45"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </label>
              <label>
                Views
                <input
                  type="number"
                  min={0}
                  value={form.views}
                  onChange={(e) => setForm({ ...form, views: e.target.value })}
                />
              </label>
              <label>
                Publish date
                <input
                  type="datetime-local"
                  required
                  value={form.publishedAt}
                  onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'Saving...' : form.published ? 'Publish' : 'Save draft'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <Toast message={toast} />
    </>
  );
}
