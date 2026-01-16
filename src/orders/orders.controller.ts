import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards, ParseUUIDPipe, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('sync')
  async syncOrders() {
    return this.ordersService.syncAllOrdersFromPlanPlace();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyOrders(@Req() req) {
    return this.ordersService.getOrdersByCustomer(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dealer')
  getDealerOrders(@Req() req) {
    if (!req.user.organizationId) throw new ForbiddenException('Нет организации');
    return this.ordersService.getOrdersByDealer(req.user.organizationId, req.user.email);
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
  @Patch(':id/dealer')
  assignDealer(
    @Param('id') orderId: string,
    @Body('dealerOrgId', new ParseUUIDPipe()) dealerOrgId: string,
    @Req() req,
  ) {
    return this.ordersService.assignDealer(orderId, dealerOrgId, req.user.id);
  }
}
