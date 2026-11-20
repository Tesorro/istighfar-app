import type { CookieOptions, Response } from 'express';
import { COOKIE_NAME, env } from '../config/env';

export function refreshCookieOptions(): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/auth',
    maxAge: env.refreshTtlDays * 24 * 60 * 60 * 1000,
  };
  if (env.cookieDomain) {
    options.domain = env.cookieDomain;
  }
  return options;
}

export function setRefreshCookie(response: Response, token: string) {
  response.cookie(COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshCookie(response: Response) {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  response.clearCookie(COOKIE_NAME, options);
}
