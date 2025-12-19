import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) { }

  // http://localhost:3000/api/catalog?query=$filter=cast(kindId,%2527Edm.Guid%2527)%2520eq%25206deca9f4-6d02-ef11-aaf0-6045bd90b888%26$skip=0%26$top=30%26$orderby=subKindName%2520desc%26$count=true
  @Get()
  getData(@Query('query') query: string) {
    return this.catalogService.getData(`product/query?${query}`);
  }

  // http://localhost:3000/api/catalog/lookup?
  // В запрос == kind=&$skip=0&$top=20&$count=true
  // http://localhost:3000/api/catalog/lookup?query=subKind?$filter=cast(kindId,%27Edm.Guid%27)%20eq%20faeac0e6-0c6d-f011-8dca-7c1e524deb5b&$skip=0&$top=20&$count=true
  @Get('lookup')
  getDataKind(@Query('query') query: string) {
    // const decodedQuery = decodeURIComponent(query);
    console.log(query)
    return this.catalogService.getDataLookup(query);
  }


}
