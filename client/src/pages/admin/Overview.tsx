import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiError';
import { queryKeys } from '../../lib/queryKeys';
import type { GlobalStats } from '../../types';
import { StatCard } from '../../components/ui/StatCard';

export function Overview() {
  const { data, isError, error } = useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: async () => (await api.get<GlobalStats>('/admin/stats')).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-primary">Admin Overview</h1>

      {isError && <p className="text-sm text-danger">{apiErrorMessage(error)}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={data?.totalUsers ?? '—'} />
        <StatCard label="Total URLs" value={data?.totalUrls ?? '—'} />
        <StatCard label="Total Clicks" value={data?.totalClicks ?? '—'} />
        <StatCard label="New Users Today" value={data?.newUsersToday ?? '—'} />
      </div>
    </div>
  );
}
