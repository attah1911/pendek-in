import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function AdminRoute() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
