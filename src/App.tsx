import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { LoadingState } from './components/ui';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { MatchesPage } from './pages/Matches';
import { NewsPage } from './pages/News';
import { PhotosPage } from './pages/Photos';
import { SettingsPage } from './pages/Settings';
import { TournamentsPage } from './pages/Tournaments';
import { UpdatesPage } from './pages/Updates';
import { UsersPage } from './pages/Users';
import { VideosPage } from './pages/Videos';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState message="Checking admin session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="photos" element={<PhotosPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="updates" element={<UpdatesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
