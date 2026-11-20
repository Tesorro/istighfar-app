import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-2xl border border-line bg-white px-4 text-base text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.8)] outline-none placeholder:text-muted',
        className,
      )}
      {...props}
    />
  );
}
