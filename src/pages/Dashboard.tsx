import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type DashboardTotals } from '../api';
import { ErrorState, LoadingState, PageHeader } from '../components/ui';

export function DashboardPage() {
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ totals: DashboardTotals }>('/admin/dashboard')
      .then((res) => {
        if (alive) setTotals(res.totals);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!totals) return <LoadingState />;

  const cards = [
    { label: 'Tournaments', value: totals.tournaments },
    { label: 'Upcoming Matches', value: totals.upcomingMatches },
    { label: 'Live Matches', value: totals.liveMatches },
    { label: 'Completed Matches', value: totals.completedMatches },
    { label: 'Published News', value: totals.publishedNews },
    { label: 'Total Users', value: totals.users },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Quick overview of City Link content and users."
      />
      <div className="stats">
        {cards.map((card) => (
          <div className="card card-pad stat" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
      <div className="card card-pad">
        <h3 style={{ marginTop: 0 }}>Quick actions</h3>
        <div className="quick-actions">
          <Link className="btn" to="/tournaments?new=1">
            Add Tournament
          </Link>
          <Link className="btn" to="/matches?new=1">
            Add Match
          </Link>
          <Link className="btn" to="/news?new=1">
            Add News
          </Link>
          <Link className="btn secondary" to="/photos">
            Manage Photos
          </Link>
        </div>
      </div>
    </>
  );
}
