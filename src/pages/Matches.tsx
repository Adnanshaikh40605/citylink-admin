import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Match, type PageResult, type Tournament } from '../api';
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
  tournamentId: string;
  teamA: string;
  teamB: string;
  startAt: string;
  venue: string;
  thumbnail: string;
  description: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  youtubeVideoId: string;
  featured: boolean;
  published: boolean;
};

const emptyForm = (tournamentId = ''): FormState => ({
  tournamentId,
  teamA: '',
  teamB: '',
  startAt: '',
  venue: '',
  thumbnail: '',
  description: '',
  status: 'UPCOMING',
  youtubeVideoId: '',
  featured: false,
  published: true,
});

export function MatchesPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<Match> | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadTournaments() {
    const res = await api<PageResult<Tournament>>(
      '/admin/tournaments?limit=50',
    );
    setTournaments(res.data);
  }

  async function load() {
    setError(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (q.trim()) query.set('q', q.trim());
      if (status) query.set('status', status);
      const res = await api<PageResult<Match>>(`/admin/matches?${query}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches.');
    }
  }

  useEffect(() => {
    void loadTournaments().catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [page, status]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setForm(emptyForm(tournaments[0]?.id ?? ''));
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, tournaments]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openEdit(item: Match) {
    setForm({
      id: item.id,
      tournamentId: item.tournamentId,
      teamA: item.teamA,
      teamB: item.teamB,
      startAt: toLocalInput(item.startAt),
      venue: item.venue,
      thumbnail: item.thumbnail,
      description: item.description,
      status: item.status.toUpperCase() as FormState['status'],
      youtubeVideoId: item.youtubeVideoId ?? '',
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
        tournamentId: form.tournamentId,
        teamA: form.teamA.trim(),
        teamB: form.teamB.trim(),
        startAt: fromLocalInput(form.startAt),
        venue: form.venue,
        thumbnail: form.thumbnail,
        description: form.description,
        status: form.status,
        youtubeVideoId: form.youtubeVideoId.trim() || null,
        featured: form.featured,
        published: form.published,
      };
      if (form.id) {
        await api(`/admin/matches/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setToast('Match updated.');
      } else {
        await api('/admin/matches', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setToast('Match created.');
      }
      setForm(null);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function quickStatus(id: string, next: FormState['status']) {
    try {
      await api(`/admin/matches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setToast(`Status set to ${next}.`);
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this match and its photos?')) return;
    try {
      await api(`/admin/matches/${id}`, { method: 'DELETE' });
      setToast('Match deleted.');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle="Manage fixtures, YouTube IDs, publish state, and live status."
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => setForm(emptyForm(tournaments[0]?.id ?? ''))}
          >
            Add Match
          </button>
        }
      />

      <div className="toolbar">
        <input
          style={{ maxWidth: 240 }}
          type="text"
          placeholder="Search teams or venue..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          style={{ maxWidth: 180 }}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="LIVE">Live</option>
          <option value="COMPLETED">Completed</option>
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
        <EmptyState message="No matches found." />
      ) : null}

      {result && result.data.length > 0 ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Match</th>
                <th>Tournament</th>
                <th>When</th>
                <th>YouTube</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {item.teamA} vs {item.teamB}
                    </strong>
                    <div className="muted">{item.venue || '-'}</div>
                    <div className="row-actions" style={{ marginTop: 6 }}>
                      <StatusBadge
                        status={item.published ? 'published' : 'unpublished'}
                      />
                      {item.featured ? <StatusBadge status="featured" /> : null}
                    </div>
                  </td>
                  <td>{item.tournamentName || '-'}</td>
                  <td>{new Date(item.startAt).toLocaleString()}</td>
                  <td className="muted">{item.youtubeVideoId || '-'}</td>
                  <td>
                    <StatusBadge status={item.status} />
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
                        className="btn secondary"
                        onClick={() => void quickStatus(item.id, 'LIVE')}
                      >
                        Live
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => void quickStatus(item.id, 'COMPLETED')}
                      >
                        Done
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
          title={form.id ? 'Edit Match' : 'Add Match'}
          onClose={() => setForm(null)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="full">
                Tournament
                <select
                  required
                  value={form.tournamentId}
                  onChange={(e) =>
                    setForm({ ...form, tournamentId: e.target.value })
                  }
                >
                  <option value="">Select tournament</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Team A
                <input
                  required
                  value={form.teamA}
                  onChange={(e) => setForm({ ...form, teamA: e.target.value })}
                />
              </label>
              <label>
                Team B
                <input
                  required
                  value={form.teamB}
                  onChange={(e) => setForm({ ...form, teamB: e.target.value })}
                />
              </label>
              <label>
                Start
                <input
                  type="datetime-local"
                  required
                  value={form.startAt}
                  onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                />
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as FormState['status'],
                    })
                  }
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="LIVE">Live</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <label className="full">
                Venue
                <input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </label>
              <label className="full">
                YouTube Video ID
                <input
                  placeholder="e.g. xD_URGjp5KE"
                  value={form.youtubeVideoId}
                  onChange={(e) =>
                    setForm({ ...form, youtubeVideoId: e.target.value })
                  }
                />
              </label>
              <label className="full">
                Thumbnail URL
                <input
                  type="url"
                  value={form.thumbnail}
                  onChange={(e) =>
                    setForm({ ...form, thumbnail: e.target.value })
                  }
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
