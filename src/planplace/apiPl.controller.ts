import { Controller, Get, Query } from '@nestjs/common';
import { ApiPlService } from './apiPl.service';

@Controller('planplace')
export class ApiPlController {
    constructor(private readonly catalogService: ApiPlService) { }

    @Get('materials')
    getData() { //@Query('query') query: string 
      return this.catalogService.getData("api/get_items/materials");
    }

    @Get('facades')
    getDataFacade() { //@Query('query') query: string
      return this.catalogService.getData("api/get_items/facades");
    }



}
