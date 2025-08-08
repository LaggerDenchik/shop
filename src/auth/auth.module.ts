import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PassportModule.register({ defaultStrategy: 'local' }),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtAuthGuard, {
      provide: 'GOOGLE_STRATEGY_CONFIG',
      useFactory: (configService: ConfigService) => ({
        clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
        clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
        callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
      }),
      inject: [ConfigService],
    },
    GoogleStrategy, LocalAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}