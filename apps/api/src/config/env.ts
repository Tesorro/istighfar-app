import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '../../.env') });

const ttlPattern = /^(\d+)([smhd])?$/;

function parseTtlSeconds(value: string): number {
  const match = ttlPattern.exec(value.trim());
  if (!match) {
    throw new Error('JWT_ACCESS_TTL должен быть числом секунд или значением вроде 15m, 1h');
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;
  return amount * factor;
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET должен быть не короче 32 символов'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().max(90).default(30),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional(),
    INVITE_TTL_HOURS: z.coerce.number().int().positive().max(24 * 30).default(168),
  })
  .superRefine((value, ctx) => {
    if (value.COOKIE_SAMESITE === 'none' && value.COOKIE_SECURE !== 'true') {
      ctx.addIssue({
        code: 'custom',
        message: 'COOKIE_SECURE должен быть true, если COOKIE_SAMESITE=none',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.message).join('; ');
  throw new Error(`Некорректные переменные окружения: ${details}`);
}

const data = parsed.data;

export const env = {
  nodeEnv: data.NODE_ENV,
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  jwtAccessSecret: data.JWT_ACCESS_SECRET,
  jwtAccessTtlSeconds: parseTtlSeconds(data.JWT_ACCESS_TTL),
  refreshTtlDays: data.REFRESH_TTL_DAYS,
  bcryptRounds: data.BCRYPT_ROUNDS,
  corsOrigins: data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  cookieSecure: data.COOKIE_SECURE === 'true',
  cookieSameSite: data.COOKIE_SAMESITE,
  cookieDomain: data.COOKIE_DOMAIN || undefined,
  inviteTtlHours: data.INVITE_TTL_HOURS,
};

export const COOKIE_NAME = 'istighfar_refresh';
export const FAMILY_TARGET = 1_000_000;
export const DAILY_COUNT_MAX = 100_000;
export const FAMILY_MEMBER_LIMIT = 2;
export const REFRESH_REUSE_GRACE_MS = 60_000;
export const HISTORY_DEFAULT_DAYS = 400;
