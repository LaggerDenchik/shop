import { Module } from '@nestjs/common';
import { CabinetsService } from './cabinets.service';
import { CabinetsController } from './cabinets.controller';

@Module({
  controllers: [CabinetsController],
  providers: [CabinetsService],
})
export class CabinetsModule {}
