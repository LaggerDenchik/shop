import { Controller, Get, Post, UseGuards, Req, Query, Body, Param, Res, UseInterceptors, HttpStatus } from '@nestjs/common';
import { FileInterceptor, } from '@nestjs/platform-express';

import { ApiPlService } from './apiPl.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response, Request } from 'express';
import * as querystring from 'querystring';

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

  /* @Post('order')
  @UseInterceptors(FileInterceptor('file'))
  async getOrder(@Body() orderDto: any) {
    console.log(orderDto);

    return {
      status: 'success',
      data: orderDto
    };
  } */
  /*  @Post('order')
 async getOrder(@Req() req: Request, @Res() res: Response) {
   let totalLength = 0;

   // Включаем слушатель ошибок на потоке
   req.on('error', (err) => {
     console.error('Ошибка потока:', err);
   });

   // Пошагово читаем данные
   for await (const chunk of req) {
     totalLength += chunk.length;
     console.log(chunk)
     console.log(`Получен кусок: ${chunk.length} байт`);
   }

   console.log(`Обработка завершена. Всего байт: ${totalLength}`);
   return res.status(HttpStatus.OK).json({ status: 'success', totalLength });
 } */

  @Post('order')
  async getOrder(@Req() req: Request, @Res() res: Response) {
    const chunks: Buffer[] = [];

    // Настройки фильтрации ключей
    const whitelist: string[] = []; // Если не пустой, то берем только эти ключи
    const blacklist: string[] = ['save_data', 'modules_list'];

    req.on('error', (err) => {
      console.error('Ошибка потока:', err);
    });

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString('utf-8');
    const parsedData = querystring.parse(rawBody);

    // Фильтрация объекта
    const filteredData: Record<string, any> = {};
    const keys = Object.keys(parsedData);

    if (whitelist.length > 0) {
      // Логика Белого списка
      for (const key of keys) {
        if (whitelist.includes(key)) {
          filteredData[key] = parsedData[key];
        }
      }
    } else {
      // Логика Черного списка
      for (const key of keys) {
        if (!blacklist.includes(key)) {
          filteredData[key] = parsedData[key];
        }
      }
    }

    console.log('Отфильтрованные данные:');
    console.log(filteredData);

    return res.status(HttpStatus.OK).json({
      status: 'success',
      data: filteredData
    });
  }
}
