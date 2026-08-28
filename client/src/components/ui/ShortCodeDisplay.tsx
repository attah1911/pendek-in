import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function ShortCodeDisplay({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (non-secure context) — no-op
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 border-l-2 border-accent bg-accent-dim px-4 py-3">
      <span className="truncate font-mono text-lg text-accent">{url}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy short URL'}
        className="shrink-0 text-accent transition-colors hover:text-accent-hover"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
