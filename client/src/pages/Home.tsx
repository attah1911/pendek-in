import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Navbar } from '../components/shared/Navbar';
import { ShortenForm } from '../components/shared/ShortenForm';
import { ShortCodeDisplay } from '../components/ui/ShortCodeDisplay';

export function Home() {
  const { user, isLoading } = useAuthStore();
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Navbar />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center gap-5 px-4 pb-24">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Shorten anything.</h1>
          <p className="mt-1 text-secondary">One clean link. Real analytics.</p>
        </div>

        <ShortenForm onCreated={(r) => setShortUrl(r.shortUrl)} />

        {shortUrl && <ShortCodeDisplay url={shortUrl} />}

        <p className="text-xs text-muted">5 free shortens per day · Sign up for more</p>
      </main>
    </div>
  );
}
