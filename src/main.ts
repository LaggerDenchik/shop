import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  
  
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'http://194.62.19.106:3000'
    ],
    credentials: true
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
