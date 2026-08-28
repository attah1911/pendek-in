import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart2, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { queryKeys } from '../lib/queryKeys';
import { formatDate } from '../lib/format';
import type { AggregateStats, ShortUrl } from '../types';
import { ShortenForm } from '../components/shared/ShortenForm';
import { ShortCodeDisplay } from '../components/ui/ShortCodeDisplay';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Table, Td, Tr } from '../components/ui/Table';

type UrlStatus = 'active' | 'inactive' | 'expired';

function urlStatus(u: ShortUrl): UrlStatus {
  if (!u.active) return 'inactive';
  if (u.expiresAt && new Date(u.expiresAt).getTime() < Date.now()) return 'expired';
  return 'active';
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const [lastShortUrl, setLastShortUrl] = useState<string | null>(null);

  const urls = useQuery({
    queryKey: queryKeys.urls,
    queryFn: async () => (await api.get<{ urls: ShortUrl[] }>('/urls')).data.urls,
  });

  const summary = useQuery({
    queryKey: queryKeys.analyticsSummary,
    queryFn: async () => (await api.get<AggregateStats>('/analytics/summary')).data,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.urls });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analyticsSummary });
  };

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/urls/${id}`),
    onSuccess: invalidate,
  });

  const confirmDelete = (u: ShortUrl) => {
    if (window.confirm(`Delete ${u.shortCode}? This cannot be undone.`)) del.mutate(u.id);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-primary">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total URLs" value={summary.data?.totalUrls ?? '—'} />
        <StatCard label="Total Clicks" value={summary.data?.totalClicks ?? '—'} />
        <StatCard label="Best Performing" value={summary.data?.bestUrl?.shortCode ?? '—'} />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <ShortenForm
          onCreated={(r) => {
            setLastShortUrl(r.shortUrl);
            invalidate();
          }}
        />
        {lastShortUrl && <ShortCodeDisplay url={lastShortUrl} />}
      </div>

      {urls.isError && <p className="text-sm text-danger">{apiErrorMessage(urls.error)}</p>}
      {del.isError && <p className="text-sm text-danger">{apiErrorMessage(del.error)}</p>}

      {urls.data?.length === 0 && (
        <p className="py-10 text-center text-sm text-secondary">No links yet. Shorten your first URL above.</p>
      )}

      {!!urls.data?.length && (
        <Table columns={['Short Code', 'Original URL', 'Clicks', 'Created', 'Status', '']}>
          {urls.data.map((u) => {
            const status = urlStatus(u);
            return (
              <Tr key={u.id}>
                <Td className="font-mono text-accent">{u.shortCode}</Td>
                <Td className="max-w-[280px] truncate text-secondary">{u.originalUrl}</Td>
                <Td>{u.clickCount}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</Td>
                <Td>
                  <Badge variant={status}>{status}</Badge>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <Link
                      to={`/analytics/${u.shortCode}`}
                      aria-label={`Analytics for ${u.shortCode}`}
                      className="rounded p-1.5 text-secondary transition-colors hover:bg-surface-2 hover:text-primary"
                    >
                      <BarChart2 className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => confirmDelete(u)}
                      aria-label={`Delete ${u.shortCode}`}
                      className="rounded p-1.5 text-secondary transition-colors hover:bg-danger-dim hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
