import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/matches', label: 'Matches' },
  { to: '/photos', label: 'Photos' },
  { to: '/news', label: 'News' },
  { to: '/videos', label: 'Videos & Shows' },
  { to: '/updates', label: 'Update Message' },
  { to: '/users', label: 'Users' },
  { to: '/settings', label: 'Admin Settings' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className={`app-shell${open ? ' nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          City Link
          <span>Admin Panel</span>
        </div>
        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>{user?.name}</div>
          <div>{user?.email}</div>
          <button type="button" className="btn ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      {open ? (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <main className="main">
        <div className="mobile-bar">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
          <strong>City Link</strong>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
