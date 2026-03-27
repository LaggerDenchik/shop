import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { Requests } from './entities/requests.entity';
import { Organization } from '../auth/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { ApiPlModule } from 'planplace/apiPl.module';
import { RequestsCronService } from './requests-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Requests, Organization, User]),
    ApiPlModule
  ],
  providers: [RequestsService, RequestsCronService],
  controllers: [RequestsController],
  exports: [RequestsService],
})
export class RequestsModule {}
