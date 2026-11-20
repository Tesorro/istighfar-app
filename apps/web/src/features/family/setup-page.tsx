import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mark } from '@/components/mark';
import { familySchema, joinSchema } from '@/features/auth/schemas';
import { useAuth } from '@/features/auth/auth-context';
import { api, ApiError } from '@/lib/api';
import { clearInviteToken, readInviteToken } from '@/lib/invite';
import type { FamilySummary } from '@/types/api';
import { defaultTimeZone, TIMEZONES } from './timezones';

export function SetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const joinError = (location.state as { joinError?: string } | null)?.joinError;
  const [mode, setMode] = useState<'create' | 'join'>(readInviteToken() ? 'join' : 'create');
  const [error, setError] = useState<string | null>(joinError ?? null);

  async function attach(familyId: string) {
    setUser((current) => (current ? { ...current, familyId } : current));
    clearInviteToken();
    navigate('/');
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 py-10">
      <Mark className="mb-6 h-14 w-14" />
      <p className="eyebrow">Семейная группа</p>
      <h1 className="mt-2 font-serif text-4xl text-primary-deep">Два человека. Одна цель.</h1>
      <p className="mt-3 mb-6 text-muted">Создайте общую группу или присоединитесь по приглашению супруга.</p>
      <div className="mb-5 grid grid-cols-2 rounded-full bg-white p-1">
        <button
          type="button"
          className={`h-10 rounded-full text-sm ${mode === 'create' ? 'bg-primary text-white' : 'text-muted'}`}
          onClick={() => setMode('create')}
        >
          Создать
        </button>
        <button
          type="button"
          className={`h-10 rounded-full text-sm ${mode === 'join' ? 'bg-primary text-white' : 'text-muted'}`}
          onClick={() => setMode('join')}
        >
          Присоединиться
        </button>
      </div>
      <Card className="p-5">
        {mode === 'create' ? <CreateFamily onDone={attach} onError={setError} /> : <JoinFamily onDone={attach} onError={setError} />}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </Card>
    </main>
  );
}

function CreateFamily({ onDone, onError }: { onDone: (familyId: string) => Promise<void>; onError: (message: string | null) => void }) {
  const form = useForm({
    resolver: zodResolver(familySchema),
    defaultValues: { name: '', timezone: defaultTimeZone() },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        onError(null);
        try {
          const family = await api<FamilySummary>('/family', { method: 'POST', body: JSON.stringify(values) });
          await onDone(family.id);
        } catch (caught) {
          onError(caught instanceof ApiError ? caught.message : 'Не удалось создать семью');
        }
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="family-name">Название</Label>
        <Input id="family-name" placeholder="Наша семья" {...form.register('name')} />
        {form.formState.errors.name ? <p className="text-sm text-danger">{form.formState.errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="family-timezone">Часовой пояс</Label>
        <select
          id="family-timezone"
          className="h-12 w-full rounded-2xl border border-line bg-white px-4"
          {...form.register('timezone')}
        >
          {TIMEZONES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Создаём…' : 'Создать семью'}
      </Button>
    </form>
  );
}

function JoinFamily({ onDone, onError }: { onDone: (familyId: string) => Promise<void>; onError: (message: string | null) => void }) {
  const form = useForm({
    resolver: zodResolver(joinSchema),
    defaultValues: { token: readInviteToken() ?? '' },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        onError(null);
        try {
          const family = await api<FamilySummary>('/family/join', {
            method: 'POST',
            body: JSON.stringify({ token: values.token.trim() }),
          });
          await onDone(family.id);
        } catch (caught) {
          onError(caught instanceof ApiError ? caught.message : 'Не удалось присоединиться');
        }
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="invite-token">Код приглашения</Label>
        <Input id="invite-token" {...form.register('token')} />
        {form.formState.errors.token ? <p className="text-sm text-danger">{form.formState.errors.token.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Присоединяемся…' : 'Присоединиться'}
      </Button>
    </form>
  );
}
