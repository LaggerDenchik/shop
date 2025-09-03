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
    PassportModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      socketPath: '/tmp/mysql.sock',
      username: 'fasadmg_sp1',
      password: 'SqjVB,#$C[WR@UyA',
      database: 'fasadmg_sp',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      charset: 'utf8mb4',
    }),
    AuthModule,
    CabinetsModule
  ],
})
export class AppModule {}