import { Loader2 } from 'lucide-react';
import { useServerWake } from '../../store/serverWakeStore';

// Render's free tier sleeps after 15 min idle; the first request then waits ~30-60s while
// the container boots. This tells the user that's what's happening instead of leaving them
// on a dead-looking screen or spinner.
export function ColdStartNotice() {
  const waking = useServerWake((s) => s.waking);
  if (!waking) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2.5 border-t border-border bg-surface px-4 py-3 text-center text-sm text-secondary"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
      <span>Waking the server up — the first request after a while can take up to a minute.</span>
    </div>
  );
}
