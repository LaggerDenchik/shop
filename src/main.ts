import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: 
    [
      'http://localhost:4200', // локальный front
      'http://shop.montegroup.by', // front
      'https://shop.montegroup.by', // HTTPS версия
      'http://45.87.219.107:8080', // backend
    ]
    ,methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH']
    ,allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
    ,credentials: true
    ,preflightContinue: false
    ,optionsSuccessStatus: 204
  });

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();