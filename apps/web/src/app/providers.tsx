import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CSSProperties, ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/auth-context';
import { router } from './router';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 15_000,
        refetchOnWindowFocus: true,
      },
    },
  });
}

const queryClient = createQueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

const toasterStyle = {
  '--success-bg': '#e7f3ee',
  '--success-border': '#b7d9cb',
  '--success-text': '#0c3f34',
  '--error-bg': '#f8ecec',
  '--error-border': '#e4c4c4',
  '--error-text': '#8d3b3b',
} as CSSProperties;

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <Toaster theme="light" position="top-right" richColors offset={16} style={toasterStyle} />
    </AppProviders>
  );
}
