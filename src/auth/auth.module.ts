import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { PassportModule } from '@nestjs/passport';
// import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailVerification } from './entities/email-verification.entity';
import { Role } from './entities/role.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([User, Organization, EmailVerification, Role]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
        logging: true, 
        logger: 'advanced-console'
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    LocalStrategy, 
    JwtStrategy, 
    JwtAuthGuard,
    LocalAuthGuard,
    // GoogleStrategy,
    // {
    //   provide: 'GOOGLE_STRATEGY_CONFIG',
    //   useFactory: (configService: ConfigService) => ({
    //     clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
    //     clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
    //     callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
    //   }),
    //   inject: [ConfigService],
    // }
  ],
  exports: [AuthService],
})
export class AuthModule {}