import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Power } from 'lucide-react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiError';
import { queryKeys } from '../../lib/queryKeys';
import { formatDate, hostnameOf } from '../../lib/format';
import type { AdminLink } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, Td, Tr } from '../../components/ui/Table';

export function Links() {
  const queryClient = useQueryClient();

  const { data, isError, error } = useQuery({
    queryKey: queryKeys.adminLinks,
    queryFn: async () => (await api.get<{ links: AdminLink[] }>('/admin/links')).data.links,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.adminLinks });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.post(`/admin/links/${id}/${active ? 'deactivate' : 'reactivate'}`),
    onSuccess: invalidate,
  });

  const blacklist = useMutation({
    mutationFn: (domain: string) => api.post('/admin/blacklist', { domain }),
    onSuccess: invalidate,
  });

  const confirmBlacklist = (link: AdminLink) => {
    const domain = hostnameOf(link.originalUrl);
    if (window.confirm(`Blacklist ${domain}? New links to this domain will be rejected.`)) blacklist.mutate(domain);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-primary">Links</h1>

      {isError && <p className="text-sm text-danger">{apiErrorMessage(error)}</p>}
      {toggle.isError && <p className="text-sm text-danger">{apiErrorMessage(toggle.error)}</p>}
      {blacklist.isError && <p className="text-sm text-danger">{apiErrorMessage(blacklist.error)}</p>}
      {blacklist.isSuccess && <p className="text-sm text-success">Domain blacklisted.</p>}

      {data && (
        <Table columns={['Short Code', 'Original URL', 'Owner', 'Clicks', 'Status', 'Created', '']}>
          {data.map((link) => (
            <Tr key={link.id}>
              <Td className="font-mono text-accent">{link.shortCode}</Td>
              <Td className="max-w-[220px] truncate text-secondary" title={link.originalUrl}>
                {link.originalUrl}
              </Td>
              <Td className="text-muted">{link.ownerEmail ?? '—'}</Td>
              <Td>{link.clickCount}</Td>
              <Td>
                <Badge variant={link.active ? 'active' : 'inactive'}>{link.active ? 'active' : 'inactive'}</Badge>
              </Td>
              <Td className="whitespace-nowrap text-muted">{formatDate(link.createdAt)}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => toggle.mutate({ id: link.id, active: link.active })}
                    disabled={toggle.isPending}
                  >
                    <Power className="h-4 w-4" />
                    {link.active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                  <Button variant="danger" onClick={() => confirmBlacklist(link)} disabled={blacklist.isPending}>
                    <Ban className="h-4 w-4" />
                    Blacklist
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
