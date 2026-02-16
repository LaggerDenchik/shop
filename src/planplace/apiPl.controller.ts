import { Controller, Get, UseGuards, Req, Query, Param, Res } from '@nestjs/common';
import { ApiPlService } from './apiPl.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

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
    const filtered = orders.filter(o => o.email.toLowerCase() === user.email.toLowerCase());

    return filtered;
  }

  @UseGuards(JwtAuthGuard)
  @Get('save-project')
  async getSaveProject(@Query('query') query: string) {
    const project = await this.apiPlService.saveProject(query);
    return { status: 'ok' };
  }


  @Get('project/:filename')
  async getProject(
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const buffer = await this.apiPlService.saveProject(filename);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(buffer);
  }

  /* @Get('project/:filename')
async getProject(@Param('filename') filename: string) {
  return this.apiPlService.saveProject(filename);
} */

  /* @Get('project/:filename')
  async getProject(@Param('filename') filename: string) {
    const buffer = await this.apiPlService.saveProject(filename);

    return {
      filename: filename.replace(/\.(dbs|dbx)$/i, '.zip'),
      file: buffer.toString('base64'),
    };
  } */

}
