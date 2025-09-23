import { Module } from '@nestjs/common';
// import { AuthModule } from './auth/auth.module';
import { CabinetsModule } from './cabinets/cabinets.module';
import { TypeOrmModule } from '@nestjs/typeorm';
//import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CatalogModule } from 'catalog/catalog.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       envFilePath: 's-monte.env',
//     }),
//     PassportModule,
//     TypeOrmModule.forRoot({
//       type: 'mysql',
//       socketPath: '/tmp/mysql.sock',
//       username: 'fasadmg_sp1',
//       password: 'SqjVB,#$C[WR@UyA',
//       database: 'fasadmg_sp',
//       entities: [__dirname + '/**/*.entity{.ts,.js}'],
//       synchronize: true,
//       charset: 'utf8mb4',
//     }),
//     AuthModule,
//     CabinetsModule
//   ],
// })

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
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') !== 'production',
        extra: {
          ssl: configService.get('NODE_ENV') === 'production' 
            ? { rejectUnauthorized: false } 
            : false,
        },
      }),
      inject: [ConfigService],
    }),
    //AuthModule,
    CabinetsModule,
    CatalogModule
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
      return 's-monte.env'; 
  }
}

