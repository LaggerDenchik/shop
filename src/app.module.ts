import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CabinetsModule } from './cabinets/cabinets.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: 's-monte.env',
      isGlobal: true,
    }),
    PassportModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql', // Меняем на mysql
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306), 
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        // Дополнительные настройки для MySQL
        charset: 'utf8mb4',
        timezone: '+00:00',
        connectTimeout: 60000,
        acquireTimeout: 60000,
        timeout: 60000,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CabinetsModule
  ],
})
export class AppModule {}