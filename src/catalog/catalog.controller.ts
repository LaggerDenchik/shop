import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getFrameData(@Query('query') query: string){
    return this.catalogService.getData(query);
  }
}
