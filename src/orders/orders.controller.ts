import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards, ParseUUIDPipe, ForbiddenException, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post('sync')
  async syncOrders() {
    return this.ordersService.syncAllOrdersFromPlanPlace();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyOrders(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.ordersService.getOrdersByCustomer(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dealer')
  async getDealerOrders(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    if (!req.user.organizationId) {
      throw new ForbiddenException('Нет организации');
    }

    return this.ordersService.getOrdersByDealer(
      req.user.organizationId,
      Number(page),
      Number(limit),
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get(':externalId')
  getOrderByExternalId(
    @Param('externalId') externalId: string,
    @Req() req
  ) {
    return this.ordersService.getByExternalId(externalId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':externalId/viewed')
  markAsViewed(
    @Param('externalId') externalId: string,
    @Req() req
  ) {
    return this.ordersService.markOrderAsViewedIfNew(
      externalId,
      req.user
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':externalId/status')
  updateStatus(
    @Param('externalId') externalId: string,
    @Body('status') status: string,
    @Req() req
  ) {
    return this.ordersService.updateOrderStatus(externalId, status, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/dealer')
  assignDealer(
    @Param('id') orderId: string,
    @Body('dealerOrgId', new ParseUUIDPipe()) dealerOrgId: string,
    @Req() req,
  ) {
    return this.ordersService.assignDealer(orderId, dealerOrgId, req.user.id);
  }
}
