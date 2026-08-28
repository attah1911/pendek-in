import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
