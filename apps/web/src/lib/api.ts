import type { AuthSession, User } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let accessToken: string | null = null;
let refreshInFlight: Promise<User | null> | null = null;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const user = await refreshSession();
    if (user) {
      return api<T>(path, options, false);
    }
  }

  return readBody<T>(response);
}

export function refreshSession(): Promise<User | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshOnce().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function refreshOnce(): Promise<User | null> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    setAccessToken(null);
    return null;
  }
  const data = (await response.json()) as AuthSession;
  setAccessToken(data.accessToken);
  return data.user;
}

async function readBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const data = (await response.json().catch(() => null)) as { message?: unknown } | null;
  if (!response.ok) {
    const message = data?.message;
    const text = Array.isArray(message)
      ? message.join('. ')
      : typeof message === 'string'
        ? message
        : 'Не удалось выполнить запрос';
    throw new ApiError(response.status, text);
  }
  return data as T;
}
