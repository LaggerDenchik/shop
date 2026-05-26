import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CabinetsModule } from './cabinets/cabinets.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CatalogModule } from 'catalog/catalog.module';
import { SettingsModule } from './settings/settings.module';
import { EmailVerification } from './auth/entities/email-verification.entity';
import { PhoneVerificationModule } from './phone-verification/phone-verification.module';
import { ApiPlModule } from 'planplace/apiPl.module';
import { ContractsModule } from 'contracts/contracts.module';
import { OrdersModule } from 'orders/orders.module';
import { YandexCloudModule } from 'yandex_cloud/yandex_cloud.module';
import { RequestsModule } from 'requests/requests.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderFilesModule } from './order_files/order-files.module';
import { json, urlencoded } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePath(),
      isGlobal: true,
      cache: true,
    }),
    
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        migrationsRun: true, 
        autoLoadEntities: true, 
        logging: configService.get('NODE_ENV') !== 'production',
        extra: {
          ssl: configService.get('NODE_ENV') === 'production' 
            ? { rejectUnauthorized: false } 
            : false,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CabinetsModule,
    CatalogModule,
    ApiPlModule,
    ContractsModule,
    SettingsModule,
    EmailVerification,
    PhoneVerificationModule,
    OrdersModule,
    YandexCloudModule,
    RequestsModule,
    ScheduleModule.forRoot(),
    OrderFilesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        json({ limit: '10mb' }), // Парсер для обычных @Body() с JSON
        urlencoded({ extended: true, limit: '10mb' }) // Парсер для остальных форм
      )
      // роуты и метод, чтобы поток для него оставался чистым
      .exclude({ path: 'planplace/order', method: RequestMethod.POST }) 
      .forRoutes('*'); 
  }
}

// Функция для определения env файла
function getEnvFilePath(): string {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'production':
      return '.env.production';
    case 'test':
      return '.env.test';
    case 'development':
    default:
      return '.env'; 
  }
}

