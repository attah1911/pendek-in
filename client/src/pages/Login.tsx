import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { User } from '../types';

export function Login() {
  const { user, isLoading, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
      return data.user;
    },
    onSuccess: (u) => {
      setUser(u);
      navigate('/dashboard');
    },
  });

  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <Link to="/" className="mb-8 font-display text-lg font-bold text-primary">
        pendek<span className="text-accent">-in</span>
      </Link>
      <div className="w-full max-w-[400px] rounded-md border border-border bg-surface p-6">
        <h1 className="font-display text-xl font-semibold text-primary">Log in</h1>
        {justRegistered && (
          <p className="mt-3 text-sm text-success">Account created. Log in to continue.</p>
        )}
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mutation.isError && <p className="text-sm text-danger">{apiErrorMessage(mutation.error)}</p>}
          <Button type="submit" isLoading={mutation.isPending} className="w-full">
            Log in
          </Button>
        </form>
        <p className="mt-4 text-sm text-secondary">
          No account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
