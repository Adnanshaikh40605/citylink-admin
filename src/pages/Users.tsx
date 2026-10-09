import { useEffect, useState } from 'react';
import { api, type AdminUser, type PageResult } from '../api';
import { useAuth } from '../auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  StatusBadge,
  Toast,
} from '../components/ui';

export function UsersPage() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResult<AdminUser> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (q.trim()) query.set('q', q.trim());
      const res = await api<PageResult<AdminUser>>(`/admin/users?${query}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function setStatus(user: AdminUser, status: 'active' | 'disabled') {
    if (user.id === me?.id) {
      setToast('You cannot change your own account status here.');
      return;
    }
    try {
      await api(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setToast(status === 'disabled' ? 'Account disabled.' : 'Account re-enabled.');
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Search accounts and disable access when needed. Passwords and chat contents are never shown."
      />

      <div className="toolbar">
        <input
          style={{ maxWidth: 280 }}
          type="text"
          placeholder="Search name or email..."
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
        <EmptyState message="No users match this search." />
      ) : null}

      {result && result.data.length > 0 ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Followers</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.nickname || user.name}</strong>
                    <div className="muted">{user.email}</div>
                  </td>
                  <td className="muted">
                    {user.username ? `@${user.username}` : '—'}
                  </td>
                  <td className="muted">
                    {user.followers ?? 0} / {user.following ?? 0}
                  </td>
                  <td>
                    {user.role === 'ADMIN' ? (
                      <StatusBadge status="admin" />
                    ) : (
                      <span className="muted">User</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge
                      status={user.status === 'active' ? 'published' : 'disabled'}
                    />
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      {user.status === 'active' ? (
                        <button
                          type="button"
                          className="btn danger"
                          disabled={user.id === me?.id}
                          onClick={() => void setStatus(user, 'disabled')}
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => void setStatus(user, 'active')}
                        >
                          Enable
                        </button>
                      )}
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

      <Toast message={toast} />
    </>
  );
}
