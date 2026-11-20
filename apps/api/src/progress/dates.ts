export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('ru-RU', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function todayIso(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function dateOnlyUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const date = dateOnlyUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}
