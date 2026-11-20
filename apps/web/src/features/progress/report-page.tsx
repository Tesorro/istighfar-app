import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/screen-loader';
import { reportSchema } from '@/features/auth/schemas';
import { api, ApiError } from '@/lib/api';
import { formatDay } from '@/lib/format';
import type { TodayProgress } from '@/types/api';

export function ReportPage() {
  const today = useQuery({
    queryKey: ['progress-today'],
    queryFn: () => api<TodayProgress>('/progress/today'),
  });

  if (today.isPending) {
    return (
      <div className="space-y-4 px-5 pt-8" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (today.isError) {
    return (
      <div className="px-5 pt-8">
        <p role="alert" className="text-danger">
          {today.error instanceof Error ? today.error.message : 'Не удалось открыть отчёт'}
        </p>
      </div>
    );
  }

  return <ReportForm today={today.data} />;
}

function ReportForm({ today }: { today: TodayProgress }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: { count: today.count === null ? '' : String(today.count) },
  });

  return (
    <div className="px-5 pt-8">
      <p className="eyebrow">Сегодня</p>
      <h1 className="mt-2 font-serif text-4xl text-primary-deep">{formatDay(today.date)}</h1>
      <p className="mt-3 text-muted">Сколько раз вы произнесли «Астагфируллах»? Число увидите только вы.</p>
      <Card className="mt-6 p-5">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            setSaved(false);
            const count = Number(values.count);
            try {
              if (today.progressId) {
                await api(`/progress/${today.progressId}`, { method: 'PATCH', body: JSON.stringify({ count }) });
              } else {
                await api('/progress', { method: 'POST', body: JSON.stringify({ count }) });
              }
              await queryClient.invalidateQueries({ queryKey: ['family-progress'] });
              await queryClient.invalidateQueries({ queryKey: ['progress-today'] });
              await queryClient.invalidateQueries({ queryKey: ['history'] });
              setSaved(true);
            } catch (caught) {
              setError(caught instanceof ApiError ? caught.message : 'Не удалось сохранить');
            }
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="report-count">Количество</Label>
            <Input id="report-count" inputMode="numeric" autoComplete="off" {...form.register('count')} />
            {form.formState.errors.count ? <p className="text-sm text-danger">{form.formState.errors.count.message}</p> : null}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="text-sm text-primary">
              Результат сохранён. Он уже учтён в общем прогрессе.
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Сохраняем…' : today.isSubmitted ? 'Обновить результат' : 'Сохранить'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
