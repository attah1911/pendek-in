import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { queryKeys } from '../lib/queryKeys';
import type { AnalyticsPayload, DeviceType, TrendRange } from '../types';
import { ShortCodeDisplay } from '../components/ui/ShortCodeDisplay';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';

// design.md palette — Recharts needs raw color props, no className path.
const CHART = { line: '#6E6BF0', grid: '#2A2A2F', axis: '#8A8A96', surface: '#141416', border: '#2A2A2F' };

const DEVICE_CARDS: Array<{ type: DeviceType; label: string }> = [
  { type: 'MOBILE', label: 'Mobile' },
  { type: 'DESKTOP', label: 'Desktop' },
  { type: 'BOT', label: 'Bot' },
];

const RANGES: Array<{ value: TrendRange; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export function Analytics() {
  const { shortCode = '' } = useParams();
  const [range, setRange] = useState<TrendRange>('month');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.analytics(shortCode, range),
    queryFn: async () =>
      (await api.get<AnalyticsPayload>(`/analytics/${shortCode}`, { params: { range } })).data,
    enabled: shortCode.length > 0,
    // Keep the current chart on screen while a new range loads instead of flashing back to the spinner.
    placeholderData: keepPreviousData,
  });

  const pct = (n: number): string => (data?.totalClicks ? `${Math.round((n / data.totalClicks) * 100)}%` : '0%');
  const deviceCount = (type: DeviceType): number => data?.devices.find((d) => d.deviceType === type)?.count ?? 0;
  const maxReferrer = Math.max(1, ...(data?.referrers.map((r) => r.count) ?? [1]));
  const trendTotal = data?.trend.reduce((sum, p) => sum + p.count, 0) ?? 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/dashboard" className="flex items-center gap-1 text-sm text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {isLoading && <p className="text-sm text-secondary">Loading analytics…</p>}
      {isError && <p className="text-sm text-danger">{apiErrorMessage(error)}</p>}

      {data && (
        <>
          <div className="flex flex-col gap-2">
            <ShortCodeDisplay url={data.shortUrl} />
            <p className="truncate text-sm text-secondary">→ {data.originalUrl}</p>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-medium text-primary">Click trend</h2>
                <p className="text-xs text-secondary">
                  {trendTotal} {trendTotal === 1 ? 'click' : 'clicks'} in the selected range
                </p>
              </div>
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRange(r.value)}
                    aria-pressed={range === r.value}
                    className={`rounded-sm px-2.5 py-1 text-xs transition-colors ${
                      range === r.value
                        ? 'bg-accent-dim text-accent'
                        : 'text-secondary hover:bg-surface-2 hover:text-primary'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={CHART.axis}
                    fontSize={11}
                    tickFormatter={(d: string) => d.slice(5)}
                    minTickGap={24}
                  />
                  <YAxis stroke={CHART.axis} fontSize={11} allowDecimals={false} width={32} />
                  <Tooltip
                    contentStyle={{ background: CHART.surface, border: `1px solid ${CHART.border}`, borderRadius: 6 }}
                    labelStyle={{ color: '#8A8A96' }}
                  />
                  <Line type="monotone" dataKey="count" stroke={CHART.line} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="text-lg font-medium text-primary">Top referrers</h2>
              <div className="mt-4 flex flex-col gap-3">
                {data.referrers.length === 0 && <p className="text-sm text-secondary">No referrer data yet.</p>}
                {data.referrers.map((r) => (
                  <div key={r.referrer} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate text-secondary" title={r.referrer}>
                      {r.referrer}
                    </span>
                    <div className="h-2 flex-1 rounded-sm bg-surface-2">
                      <div className="h-full rounded-sm bg-accent" style={{ width: `${(r.count / maxReferrer) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-muted">{r.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-medium text-primary">Device breakdown</h2>
              <div className="grid grid-cols-3 gap-3">
                {DEVICE_CARDS.map(({ type, label }) => (
                  <StatCard key={type} label={label} value={deviceCount(type)} hint={pct(deviceCount(type))} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
