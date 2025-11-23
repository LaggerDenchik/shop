import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CabinetsService } from './cabinets.service';
import { CabinetsController } from './cabinets.controller';
import { User } from '../auth/entities/user.entity';
import { Organization } from '@auth/entities/organization.entity';
import { EmailVerification } from '@auth/entities/email-verification.entity';
import { Role } from '@auth/entities/role.entity';
import { Permission } from '@auth/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, EmailVerification, Role, Permission])
  ],
  controllers: [CabinetsController],
  providers: [CabinetsService],
})
export class CabinetsModule { }
