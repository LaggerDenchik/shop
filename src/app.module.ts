import { Module } from '@nestjs/common';
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
        migrationsRun: false, 
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
    YandexCloudModule
  ],
})
export class AppModule {}

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

