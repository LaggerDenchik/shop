import { Controller, Get, Post, Patch, Body, Param, Req, Request, Query, UseGuards, ParseUUIDPipe, ForbiddenException } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRequestDto } from './dto/create-requests.dto';


@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) { }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createRequest(@Request() req, @Body() body: CreateRequestDto) {
    return this.requestsService.createRequest(req.user.id, body);
  }

  /* @UseGuards(JwtAuthGuard)
  @Get('order')
  async viewRequests(@Query('orderId') orderId: number) { //@Body() body: CreateRequestDto
    return this.requestsService.viewRequests(orderId);
  } */

  @UseGuards(JwtAuthGuard)
  @Get('order')
 async viewRequests(
  @Query('orderId') orderId: number,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @Query('status') status: string = 'all', 
  @Query('sort') sort: 'ASC' | 'DESC' = 'DESC' 
) {
  console.log('Backend received:', { orderId, status, sort });
  return this.requestsService.viewRequests(orderId, page, limit, status, sort);
}

  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req) {
    return this.requestsService.approve(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  reject(@Param('id') id: string, @Request() req) {
    return this.requestsService.reject(id, req.user);
  }
}
