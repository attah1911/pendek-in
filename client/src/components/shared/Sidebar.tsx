import { NavLink } from 'react-router-dom';
import { Database, LayoutDashboard, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-surface-2 text-primary' : 'text-secondary hover:text-primary'
  }`;

const iconClass = 'h-[18px] w-[18px] shrink-0';

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <aside className="flex gap-1 border-border bg-bg max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-10 max-md:justify-around max-md:border-t max-md:p-2 md:w-56 md:shrink-0 md:flex-col md:border-r md:p-4">
      <NavLink to="/dashboard" className={linkClass}>
        <LayoutDashboard className={iconClass} />
        <span className="max-md:hidden">Dashboard</span>
      </NavLink>

      {role === 'ADMIN' && (
        <>
          <div className="my-2 border-t border-border max-md:hidden" />
          <NavLink to="/admin" end className={linkClass}>
            <LayoutDashboard className={iconClass} />
            <span className="max-md:hidden">Overview</span>
          </NavLink>
          <NavLink to="/admin/users" className={linkClass}>
            <Users className={iconClass} />
            <span className="max-md:hidden">Users</span>
          </NavLink>
          <NavLink to="/admin/links" className={linkClass}>
            <Database className={iconClass} />
            <span className="max-md:hidden">Links</span>
          </NavLink>
        </>
      )}
    </aside>
  );
}
