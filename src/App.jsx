import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Spinner from './components/ui/Spinner';
import { useSessionBootstrap } from './hooks/useSessionBootstrap';

// Everything past the dashboard loads on demand — the login screen and first
// paint stay small.
const ResourceListPage = lazy(() => import('./pages/ResourceListPage'));
const Enquiries = lazy(() => import('./pages/Enquiries'));
const EnquiryDetail = lazy(() => import('./pages/EnquiryDetail'));
const Sections = lazy(() => import('./pages/Sections'));
const Settings = lazy(() => import('./pages/Settings'));
const Media = lazy(() => import('./pages/Media'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => error?.status !== 401 && failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

function Routing() {
  useSessionBootstrap();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <Suspense fallback={<Spinner label="Loading…" />}>
              <AppLayout />
            </Suspense>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="content/:resource" element={<ResourceListPage />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="enquiries/:id" element={<EnquiryDetail />} />
          <Route path="sections" element={<Sections />} />
          <Route path="media" element={<Media />} />
          <Route path="profile" element={<Profile />} />

          {/* Settings and team management are role-gated. */}
          <Route element={<ProtectedRoute roles={['super_admin', 'admin']} />}>
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route element={<ProtectedRoute roles={['super_admin']} />}>
            <Route path="users" element={<Users />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routing />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
