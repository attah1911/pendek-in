import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6 max-md:pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
