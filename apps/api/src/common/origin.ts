import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { env } from '../config/env';

export function assertAllowedOrigin(request: Request) {
  const origin = request.header('origin');
  if (!origin) {
    if (env.nodeEnv === 'production') {
      throw new ForbiddenException('Запрос отклонён');
    }
    return;
  }
  if (!env.corsOrigins.includes(origin)) {
    throw new ForbiddenException('Запрос отклонён');
  }
}
