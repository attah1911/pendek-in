import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/shared/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { AdminRoute } from './components/shared/AdminRoute';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ColdStartNotice } from './components/shared/ColdStartNotice';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Overview } from './pages/admin/Overview';
import { Users } from './pages/admin/Users';
import { Links } from './pages/admin/Links';

// Analytics pulls in Recharts (~half the bundle) — load it only when someone opens a chart.
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  return (
    <ErrorBoundary>
      <ColdStartNotice />
      {isLoading ? (
        <div className="flex min-h-screen items-center justify-center bg-bg">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <Suspense fallback={<div className="p-6 text-sm text-secondary">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analytics/:shortCode" element={<Analytics />} />
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<Overview />} />
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/links" element={<Links />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
    </ErrorBoundary>
  );
}

export default App;
