import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { EnvConfig } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService<EnvConfig, true>);
  const port = config.get('API_PORT', { infer: true });
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.use(helmet());
  app.use(compression());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dev Market Shift Oracle API')
    .setDescription('Market shift analytics for developer vacancies')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
}

void bootstrap();
