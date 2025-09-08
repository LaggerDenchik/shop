import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  
  
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'https://shop.montegroup.by',
      'http://shop.montegroup.by'
    ],
    credentials: true
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
