interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { value: string; positive?: boolean };
}

export function StatCard({ label, value, hint, trend }: StatCardProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.06em] text-secondary">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {trend && (
        <p className={`mt-1 text-xs ${trend.positive ? 'text-success' : 'text-danger'}`}>{trend.value}</p>
      )}
    </div>
  );
}
