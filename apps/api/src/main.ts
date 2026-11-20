import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';
import { env } from './config/env';
import { AllExceptionsFilter } from './common/http-exception.filter';

export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: '16kb' }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin запрещён'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  if (env.nodeEnv === 'production') {
    const adapter = app.getHttpAdapter();
    adapter.getInstance().set('trust proxy', 1);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  await app.listen(env.port);
}

if (require.main === module) {
  void bootstrap();
}
