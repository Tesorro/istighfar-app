import { Outlet } from 'react-router';
import { BottomNav } from '@/components/bottom-nav';

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md pb-28">
      <Outlet />
      <BottomNav />
    </div>
  );
}
