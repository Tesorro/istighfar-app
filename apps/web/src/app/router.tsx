import { lazy, Suspense } from 'react';
import { Navigate, Outlet, createBrowserRouter, type RouteObject } from 'react-router';
import { ScreenLoader } from '@/components/screen-loader';
import { useAuth } from '@/features/auth/auth-context';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { InvitePage } from '@/features/family/invite-page';
import { SetupPage } from '@/features/family/setup-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { DashboardPage } from '@/features/progress/dashboard-page';
import { ReportPage } from '@/features/progress/report-page';
import { AppShell } from './shell';

const HistoryPage = lazy(() =>
  import('@/features/history/history-page').then((module) => ({ default: module.HistoryPage })),
);

export const routes: RouteObject[] = [
  { path: '/invite/:token', element: <InvitePage /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/setup', element: <SetupPage /> },
      {
        element: <RequireFamily />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: '/report', element: <ReportPage /> },
              { path: '/history', element: <Suspense fallback={<ScreenLoader label="Открываем историю" />}><HistoryPage /></Suspense> },
              { path: '/profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);

function GuestOnly() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <ScreenLoader />;
  }
  if (user?.familyId) {
    return <Navigate to="/" replace />;
  }
  if (user) {
    return <Navigate to="/setup" replace />;
  }
  return <Outlet />;
}

function RequireAuth() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <ScreenLoader />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function RequireFamily() {
  const { user } = useAuth();
  if (!user?.familyId) {
    return <Navigate to="/setup" replace />;
  }
  return <Outlet />;
}
