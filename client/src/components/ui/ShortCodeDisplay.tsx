import { CopyButton } from './CopyButton';

export function ShortCodeDisplay({ url }: { url: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-l-2 border-accent bg-accent-dim px-4 py-3">
      <span className="truncate font-mono text-lg text-accent">{url}</span>
      <CopyButton value={url} label="Copy short URL" className="text-accent hover:text-accent-hover" />
    </div>
  );
}
