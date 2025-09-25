import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use((req, res, next) => {
  //   if (req.method === 'OPTIONS') {
  //     res.header('Access-Control-Allow-Origin', 'http://shop.montegroup.by');
  //     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  //     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  //     res.status(200).end();
  //   } else {
  //     next();
  //   }
  // });

  app.enableCors({
    origin: 
    [
      'http://localhost:4200', // локальный front
      'http://shop.montegroup.by', // front
      'https://shop.montegroup.by', // HTTPS версия
      'http://45.87.219.107:8080', // backend
    ]
    ,methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    ,allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
    ,credentials: true
    ,preflightContinue: false
    ,optionsSuccessStatus: 204
  });

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  
  await app.listen(3000);
}
bootstrap();