export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#0f6a4e" />
      <path d="M32 8 37.2 24.2 54 32 37.2 39.8 32 56 26.8 39.8 10 32 26.8 24.2Z" fill="#f4e7cb" />
      <circle cx="32" cy="32" r="4.5" fill="#0f6a4e" />
    </svg>
  );
}
