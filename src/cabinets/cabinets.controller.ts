import { Controller, Get, Param } from '@nestjs/common';
import { CabinetsService } from './cabinets.service';

@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinetsService: CabinetsService) { }

  @Get(':id')
  getUserById(@Param('id') id: number) {
    return this.cabinetsService.findUserById(id);
  }

  // @Get()
  @Get()
  getAllUsers() {
    return this.cabinetsService.findAll();
  }
}
