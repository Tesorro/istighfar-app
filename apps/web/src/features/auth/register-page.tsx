import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { clearInviteToken, readInviteToken } from '@/lib/invite';
import { AuthLayout, Field } from './auth-layout';
import { useAuth } from './auth-context';
import { registerSchema } from './schemas';

type RegisterValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterValues) {
    setError(null);
    try {
      await registerUser({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      const invite = readInviteToken();
      if (invite) {
        try {
          await api('/family/join', { method: 'POST', body: JSON.stringify({ token: invite }) });
          const me = await api<{ familyId: string | null }>('/auth/me');
          setUser((current) => (current ? { ...current, familyId: me.familyId } : current));
          clearInviteToken();
          navigate('/');
          return;
        } catch (caught) {
          navigate('/setup', { state: { joinError: caught instanceof ApiError ? caught.message : 'Не удалось присоединиться' } });
          return;
        }
      }
      navigate('/setup');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Не удалось создать учётную запись');
    }
  }

  return (
    <AuthLayout title="Создать учётную запись" text="Istighfar хранит ваш собственный отчёт и общий результат семьи.">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Field label="Имя" error={form.formState.errors.name?.message}>
          <Input id="register-name" autoComplete="name" {...form.register('name')} />
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input id="register-email" type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Пароль" error={form.formState.errors.password?.message}>
          <Input id="register-password" type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field label="Пароль ещё раз" error={form.formState.errors.confirmPassword?.message}>
          <Input id="register-confirm" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Создаём…' : 'Продолжить'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Уже есть учётная запись?{' '}
        <Link className="font-medium text-primary" to="/login">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}
