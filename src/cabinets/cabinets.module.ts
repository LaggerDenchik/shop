import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CabinetsService } from './cabinets.service';
import { CabinetsController } from './cabinets.controller';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [CabinetsController],
  providers: [CabinetsService],
})
export class CabinetsModule { }
