import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Register() {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/register', { email, password }),
    onSuccess: () => navigate('/login?registered=1'),
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
        <h1 className="font-display text-xl font-semibold text-primary">Create account</h1>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mutation.isError && <p className="text-sm text-danger">{apiErrorMessage(mutation.error)}</p>}
          <Button type="submit" isLoading={mutation.isPending} className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
