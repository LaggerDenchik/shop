import { Controller, Get } from '@nestjs/common';
import { CabinetsService } from './cabinets.service';
@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinetsService: CabinetsService) {}

  @Get()
  findAll(){
    return this.cabinetsService.findAll();
  }
}
