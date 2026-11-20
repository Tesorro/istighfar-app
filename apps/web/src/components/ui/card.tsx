import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[1.6rem] border border-line/80 bg-card shadow-[0_16px_40px_rgb(28_43_38/0.05)]', className)}
      {...props}
    />
  );
}
