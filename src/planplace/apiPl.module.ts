import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ApiPlController } from './apiPl.controller';
import { ApiPlService } from './apiPl.service';

@Module({
  imports: [HttpModule],    
  controllers: [ApiPlController],
  providers: [ApiPlService],
  exports: [ApiPlService],
  
})
export class ApiPlModule {}
