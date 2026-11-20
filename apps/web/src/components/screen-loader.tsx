export function ScreenLoader({ label = 'Открываем Istighfar' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6" role="status">
      <p className="font-serif text-lg text-primary-deep">{label}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#e7e1d6] ${className ?? ''}`} />;
}
