import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CabinetsModule } from './cabinets/cabinets.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: 's-monte.env',
    }),
    PassportModule.register({ defaultStrategy: 'google' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'pgpwd4habr',
      database: 'postgres',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    CabinetsModule
  ],
})
export class AppModule {}


