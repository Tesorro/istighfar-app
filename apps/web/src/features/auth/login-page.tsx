import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { AuthLayout, Field } from './auth-layout';
import { useAuth } from './auth-context';
import { loginSchema } from './schemas';

type LoginValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      const user = await login({ email: values.email.trim().toLowerCase(), password: values.password });
      if (user.familyId) {
        navigate('/');
        return;
      }
      navigate('/setup');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Не удалось войти');
    }
  }

  return (
    <AuthLayout title="С возвращением" text="Общий путь продолжается со входа в вашу учётную запись.">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input id="login-email" type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Пароль" error={form.formState.errors.password?.message}>
          <Input id="login-password" type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Входим…' : 'Войти'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Нет учётной записи?{' '}
        <Link className="font-medium text-primary" to="/register">
          Создать
        </Link>
      </p>
    </AuthLayout>
  );
}
