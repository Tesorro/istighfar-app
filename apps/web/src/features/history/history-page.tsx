import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/screen-loader';
import { api } from '@/lib/api';
import { formatCount, formatDay, formatDayShort } from '@/lib/format';
import type { HistoryDay } from '@/types/api';

export function HistoryPage() {
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const history = useQuery({
    queryKey: ['history'],
    queryFn: () => api<HistoryDay[]>('/progress/history'),
  });

  if (history.isPending) {
    return (
      <div className="space-y-3 px-5 pt-8" aria-busy="true">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (history.isError) {
    return (
      <div className="px-5 pt-8">
        <p role="alert" className="text-danger">
          {history.error instanceof Error ? history.error.message : 'Не удалось загрузить историю'}
        </p>
      </div>
    );
  }

  const days = history.data;

  return (
    <div className="px-5 pt-8">
      <p className="eyebrow">Общая история</p>
      <h1 className="mt-2 font-serif text-4xl text-primary-deep">История</h1>
      <p className="mt-2 text-muted">Здесь только сумма семьи за день.</p>
      <div className="mt-5 grid grid-cols-2 rounded-full bg-white p-1">
        <button type="button" className={`h-10 rounded-full text-sm ${mode === 'list' ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setMode('list')}>
          Список
        </button>
        <button type="button" className={`h-10 rounded-full text-sm ${mode === 'calendar' ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setMode('calendar')}>
          Календарь
        </button>
      </div>
      {days.length === 0 ? (
        <Card className="mt-5 p-6 text-muted">История появится после первого общего отчёта.</Card>
      ) : mode === 'list' ? (
        <HistoryList days={days} />
      ) : (
        <HistoryCalendar days={days} />
      )}
      <ActivityChart days={days} />
    </div>
  );
}

function HistoryList({ days }: { days: HistoryDay[] }) {
  return (
    <ul className="mt-5 space-y-3" data-testid="history-list">
      {days.map((day) => (
        <li key={day.date}>
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{formatDay(day.date)}</p>
              <p className="text-sm text-muted">{day.allMembersSubmitted ? 'Все отчёты внесены' : 'Не все отчёты внесены'}</p>
            </div>
            <p className="font-serif text-2xl text-primary-deep">{formatCount(day.totalCount)}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function HistoryCalendar({ days }: { days: HistoryDay[] }) {
  const latest = days[0]?.date ?? new Date().toISOString().slice(0, 10);
  const [year, month] = latest.split('-').map(Number);
  const [cursor, setCursor] = useState({ year: year ?? 2026, month: (month ?? 1) - 1 });
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const cells = monthCells(cursor.year, cursor.month);
  const title = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(cursor.year, cursor.month, 1));

  return (
    <Card className="mt-5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="h-10 px-3 text-primary" onClick={() => setCursor(shiftMonth(cursor, -1))} aria-label="Предыдущий месяц">
          ←
        </button>
        <p className="font-medium capitalize">{title}</p>
        <button type="button" className="h-10 px-3 text-primary" onClick={() => setCursor(shiftMonth(cursor, 1))} aria-label="Следующий месяц">
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          const entry = cell ? byDate.get(cell) : undefined;
          return (
            <div key={cell ?? `empty-${index}`} className={`min-h-12 rounded-xl p-1 text-center ${entry ? 'bg-[#e7f3ee]' : ''}`}>
              <span className="text-xs">{cell ? Number(cell.slice(8)) : ''}</span>
              {entry ? <span className="block text-[10px] text-primary">{formatCount(entry.totalCount)}</span> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ActivityChart({ days }: { days: HistoryDay[] }) {
  const chartDays = [...days].slice(0, 30).reverse();
  if (chartDays.length === 0) {
    return null;
  }
  return (
    <Card className="mt-5 p-4">
      <p className="mb-3 text-sm text-muted">Общая активность</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartDays.map((day) => ({ label: formatDayShort(day.date), total: day.totalCount }))}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis hide />
            <Tooltip formatter={(value) => [formatCount(Number(value)), 'Вместе']} />
            <Bar dataKey="total" fill="#0f6a4e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return cells;
}

function shiftMonth(cursor: { year: number; month: number }, delta: number) {
  const date = new Date(cursor.year, cursor.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}
