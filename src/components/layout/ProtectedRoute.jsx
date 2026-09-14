import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, can } from '../../store/authStore';
import Spinner from '../ui/Spinner';

// `roles` gates on role keys; `permission` (string or array, any-of) on the role's permissions.
export default function ProtectedRoute({ roles, permission }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (status === 'checking') return <Spinner label="Checking your session…" />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  if (permission && !can(user, ...[].concat(permission))) return <Navigate to="/" replace />;

  return <Outlet />;
}
