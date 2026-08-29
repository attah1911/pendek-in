import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiError';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface CreatedUrl {
  shortUrl: string;
  shortCode: string;
}

interface CreateUrlBody {
  originalUrl: string;
  alias?: string;
  expiresAt?: string;
}

interface ShortenFormProps {
  onCreated?: (result: CreatedUrl) => void;
  // Dashboard exposes alias + expiry (a registered-user capability per the PRD); the guest
  // Home form stays a single input.
  withOptions?: boolean;
}

// tomorrow as yyyy-mm-dd — the earliest expiry the API accepts (it must be in the future).
function minExpiryDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function ShortenForm({ onCreated, withOptions = false }: ShortenFormProps) {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiry, setExpiry] = useState('');

  const mutation = useMutation({
    mutationFn: async (body: CreateUrlBody) => {
      const { data } = await api.post<CreatedUrl>('/urls', body);
      return data;
    },
    onSuccess: (data) => {
      setUrl('');
      setAlias('');
      setExpiry('');
      onCreated?.(data);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const originalUrl = url.trim();
    if (!originalUrl) return;

    const body: CreateUrlBody = { originalUrl };
    if (withOptions) {
      if (alias.trim()) body.alias = alias.trim();
      // <input type="date"> yields yyyy-mm-dd; the API wants an ISO datetime with offset.
      if (expiry) body.expiresAt = new Date(`${expiry}T23:59:59`).toISOString();
    }
    mutation.mutate(body);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="url"
          required
          placeholder="https://your-long-url.com/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          containerClassName="flex-1"
        />
        <Button type="submit" isLoading={mutation.isPending}>
          Shorten
        </Button>
      </div>

      {withOptions && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              label="Custom alias"
              placeholder="my-link"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              containerClassName="flex-1"
            />
            <Input
              label="Expiry date"
              type="date"
              min={minExpiryDate()}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              containerClassName="flex-1"
            />
          </div>
          <p className="text-xs text-muted">Both optional. After the expiry date the link stops working.</p>
        </>
      )}

      {mutation.isError && <p className="text-xs text-danger">{apiErrorMessage(mutation.error)}</p>}
    </form>
  );
}
