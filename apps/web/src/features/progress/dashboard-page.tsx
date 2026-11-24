import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/screen-loader';
import { api } from '@/lib/api';
import { formatCount, formatPercent } from '@/lib/format';
import type { FamilyProgress, TodayProgress } from '@/types/api';

export function DashboardPage() {
  const progress = useQuery({
    queryKey: ['family-progress'],
    queryFn: () => api<FamilyProgress>('/family/progress'),
  });
  const today = useQuery({
    queryKey: ['progress-today'],
    queryFn: () => api<TodayProgress>('/progress/today'),
  });

  if (progress.isPending || today.isPending) {
    return <DashboardSkeleton />;
  }

  if (progress.isError || today.isError) {
    return (
      <PageFrame>
        <p role="alert" className="text-danger">
          {errorText(progress.error ?? today.error)}
        </p>
        <Button className="mt-4" type="button" onClick={() => { void progress.refetch(); void today.refetch(); }}>
          Повторить
        </Button>
      </PageFrame>
    );
  }

  const data = progress.data;
  const own = today.data;
  const width = Math.min(data.progressPercentage, 100);

  return (
    <PageFrame>
      <p className="eyebrow">Вместе</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="font-serif text-4xl text-primary-deep">Istighfar</h1>
        <RefreshButton
          onRefresh={async () => {
            const [nextProgress, nextToday] = await Promise.all([progress.refetch(), today.refetch()]);
            if (nextProgress.isSuccess && nextToday.isSuccess) {
              toast.success('Счётчик обновлён');
            }
          }}
        />
      </div>
      <p className="mt-2 text-muted">Одна цель на двоих. Без сравнения и без спешки.</p>

      <Card className="mt-6 p-6">
        <p className="text-sm text-muted">Общий путь</p>
        <p data-testid="dashboard-total" className="mt-2 font-serif text-5xl tracking-tight text-primary-deep">
          {formatCount(data.totalCount)}
        </p>
        <p className="mt-1 text-muted">из {formatCount(data.targetCount)}</p>
        <Progress className="mt-5" value={width} label="Общий прогресс к цели" />
        <p data-testid="dashboard-percent" className="mt-3 text-sm text-gold">
          {formatPercent(data.progressPercentage)}%
        </p>
        {data.goalReached ? <p className="mt-2 text-sm text-primary">Общая цель достигнута.</p> : null}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-sm text-muted">Сегодня вместе</p>
          <p data-testid="dashboard-today" className="mt-2 font-serif text-2xl">
            {formatCount(data.todayCount)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Осталось</p>
          <p data-testid="dashboard-remaining" className="mt-2 font-serif text-2xl">
            {formatCount(data.remainingCount)}
          </p>
        </Card>
      </div>

      <p className="mt-5 text-sm text-muted" data-testid="dashboard-status">
        {statusText(data, own)}
      </p>
      <Button asChild className="mt-4 w-full">
        <Link to="/report">{own.isSubmitted ? 'Изменить сегодняшний результат' : 'Внести сегодняшний результат'}</Link>
      </Button>
    </PageFrame>
  );
}

function statusText(progress: FamilyProgress, today: TodayProgress) {
  if (progress.membersSubmittedToday === progress.totalMembers && progress.totalMembers > 0) {
    return 'Все участники внесли результаты.';
  }
  if (today.isSubmitted) {
    return 'Ваш отчёт внесён.';
  }
  return 'Сегодняшний отчёт ещё не внесён.';
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Не удалось загрузить прогресс';
}

function RefreshButton({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label="Обновить"
      title="Обновить"
      aria-busy={refreshing}
      className="size-11 shrink-0 border border-line/80 bg-card px-0 text-primary-deep shadow-[0_8px_24px_rgb(28_43_38/0.04)] hover:bg-card"
      disabled={refreshing}
      onClick={() => {
        setRefreshing(true);
        void onRefresh().finally(() => setRefreshing(false));
      }}
    >
      <RefreshCw aria-hidden="true" size={20} strokeWidth={1.8} className={refreshing ? 'animate-spin' : undefined} />
    </Button>
  );
}

function PageFrame({ children }: { children: ReactNode }) {
  return <div className="px-5 pt-8">{children}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 px-5 pt-8" data-testid="dashboard-skeleton" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-44 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
