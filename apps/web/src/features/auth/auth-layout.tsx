import { cloneElement, type ReactElement, type ReactNode } from 'react';
import { Mark } from '@/components/mark';
import { Label } from '@/components/ui/label';

export function AuthLayout({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Mark className="mb-6 h-14 w-14" />
      <p className="eyebrow">Istighfar</p>
      <h1 className="mt-2 font-serif text-4xl text-primary-deep">{title}</h1>
      <p className="mt-3 mb-8 text-muted">{text}</p>
      {children}
    </main>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = children.props.id ?? label;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
