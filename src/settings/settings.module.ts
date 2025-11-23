import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { User } from '../auth/entities/user.entity';
import { Role } from '@auth/entities/role.entity';
import { Permission } from '@auth/entities/permission.entity';
import { AuthService } from '@auth/auth.service';
import { Organization } from '@auth/entities/organization.entity';
import { EmailVerification } from '@auth/entities/email-verification.entity';
import { JwtStrategy } from '@auth/strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, EmailVerification, Role, Permission]),
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
  controllers: [SettingsController],
  providers: [
    AuthService, 
    SettingsService, 
    JwtStrategy
  ],
  exports: [AuthService],
})
export class SettingsModule {}