import { getApiBase } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/ui';

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title="Admin Settings"
        subtitle="Session and environment details for this Admin Panel."
      />
      <div className="card card-pad">
        <p>
          <strong>Signed in as:</strong> {user?.name} ({user?.email})
        </p>
        <p>
          <strong>Role:</strong> {user?.role}
        </p>
        <p>
          <strong>API base:</strong> {getApiBase()}
        </p>
        <p className="muted">
          Content changes made here are stored in the City Link database and appear
          in the mobile app without an app update. YouTube remains the video
          delivery platform. Enter only the video ID on matches and news.
        </p>
      </div>
    </>
  );
}
