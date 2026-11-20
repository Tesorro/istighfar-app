import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

type ProgressProps = {
  value: number;
  label: string;
  className?: string;
};

export function Progress({ value, label, className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <ProgressPrimitive.Root
      value={clamped}
      aria-label={label}
      className={cn('relative h-2.5 overflow-hidden rounded-full bg-[#e7efe9]', className)}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
