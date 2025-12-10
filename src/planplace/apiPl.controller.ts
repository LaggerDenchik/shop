import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiPlService } from './apiPl.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('planplace')
export class ApiPlController {
  constructor(private readonly apiPlService: ApiPlService) { }

  @Get('materials')
  getData() { //@Query('query') query: string 
    return this.apiPlService.getData("api/get_items/materials");
  }

  @Get('facades')
  getDataFacade() { //@Query('query') query: string
    return this.apiPlService.getData("api/get_items/facades");
  }
  @UseGuards(JwtAuthGuard)  
  @Get('orders')
  async getDataOrders(@Req() req) {
    const user = req.user;
    const orders = await this.apiPlService.getData("api/get_items/orders");

    if (!user.email) return console.log("none"); // none если пусто

    // Фильтруем по email 
    const filtered = orders.filter(o => o.email === user.email);

    return filtered;
  }
}
