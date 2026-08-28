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

interface ShortenFormProps {
  onCreated?: (result: CreatedUrl) => void;
}

export function ShortenForm({ onCreated }: ShortenFormProps) {
  const [url, setUrl] = useState('');

  const mutation = useMutation({
    mutationFn: async (originalUrl: string) => {
      const { data } = await api.post<CreatedUrl>('/urls', { originalUrl });
      return data;
    },
    onSuccess: (data) => {
      setUrl('');
      onCreated?.(data);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) mutation.mutate(trimmed);
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
      {mutation.isError && <p className="text-xs text-danger">{apiErrorMessage(mutation.error)}</p>}
    </form>
  );
}
