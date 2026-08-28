type BadgeVariant = 'active' | 'inactive' | 'expired' | 'banned';

const variantClasses: Record<BadgeVariant, string> = {
  active: 'text-success bg-success/[0.08] border-success/30',
  inactive: 'text-muted bg-surface-2 border-border',
  expired: 'text-warning bg-warning/[0.08] border-warning/40',
  banned: 'text-danger bg-danger-dim border-danger',
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.05em] ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
