import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldOff } from 'lucide-react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiError';
import { queryKeys } from '../../lib/queryKeys';
import { formatDate } from '../../lib/format';
import type { AdminUser } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, Td, Tr } from '../../components/ui/Table';

export function Users() {
  const queryClient = useQueryClient();

  const { data, isError, error } = useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: async () => (await api.get<{ users: AdminUser[] }>('/admin/users')).data.users,
  });

  const ban = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/ban`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
  });

  const confirmBan = (u: AdminUser) => {
    if (window.confirm(`Ban ${u.email}? They will be logged out and blocked from signing in.`)) ban.mutate(u.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-primary">Users</h1>

      {isError && <p className="text-sm text-danger">{apiErrorMessage(error)}</p>}
      {ban.isError && <p className="text-sm text-danger">{apiErrorMessage(ban.error)}</p>}

      {data && (
        <Table columns={['ID', 'Email', 'Role', 'Status', 'Created', 'URLs', '']}>
          {data.map((u) => (
            <Tr key={u.id}>
              <Td className="font-mono text-xs text-muted" title={u.id}>
                {u.id.slice(0, 8)}…
              </Td>
              <Td className="text-primary">{u.email}</Td>
              <Td className="font-mono text-xs uppercase text-secondary">{u.role}</Td>
              <Td>{u.banned ? <Badge variant="banned">banned</Badge> : <Badge variant="active">active</Badge>}</Td>
              <Td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</Td>
              <Td>{u.urlCount}</Td>
              <Td>
                {u.role !== 'ADMIN' && !u.banned && (
                  <Button variant="danger" onClick={() => confirmBan(u)} disabled={ban.isPending}>
                    <ShieldOff className="h-4 w-4" />
                    Ban
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
