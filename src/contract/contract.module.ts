import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';

@Module({
  imports: [HttpModule],    
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService],
  
})
export class ContractModule {}
