import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearUser();
      // Drop cached authed queries so nothing refetches, 401s, and bounces to /login.
      queryClient.clear();
      navigate('/');
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
      <Link to="/" className="font-display text-lg font-bold text-primary">
        pendek<span className="text-accent">-in</span>
      </Link>
      <nav className="flex items-center gap-2">
        {user ? (
          <>
            <span className="hidden text-sm text-secondary sm:inline">{user.email}</span>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary">Register</Button>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
