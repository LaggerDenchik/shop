import { Controller, Get } from '@nestjs/common';
import { CabinetsService } from './cabinets.service';

@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinetsService: CabinetsService) { }

  @Get()
  getUserById(id: number) {
    return this.cabinetsService.findUserById(1);
  }

  // @Get()
  getDataAll(){
    return this.cabinetsService.findAll();
  }
}
