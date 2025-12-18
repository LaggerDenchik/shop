import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Organization } from '../auth/entities/organization.entity';
import { ApiPlService } from 'planplace/apiPl.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    private apiPlService: ApiPlService
  ) {}

  async getOrdersByCustomer(customerId: string) {
    return this.ordersRepo.find({
      where: { customerId },
      relations: ['dealerOrganization'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrdersByDealer(dealerOrgId: string) {
    return this.ordersRepo.find({
      where: { dealerOrgId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async assignDealer(orderId: string, dealerOrgId: string, userId: string) {
    const order = await this.ordersRepo.findOne({ where: { id: Number(orderId) } });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.customerId !== userId) throw new ForbiddenException('Нет доступа');

    const dealer = await this.orgRepo.findOne({ where: { id: dealerOrgId } });
    if (!dealer) throw new NotFoundException('Дилер не найден');

    order.dealerOrgId = dealerOrgId;
    order.status = 'assigned';

    return this.ordersRepo.save(order);
  }

  async syncAllOrdersFromPlanPlace() {
    // получаем все заказы с PlanPlace
    const ordersFromPP = await this.apiPlService.getData('api/get_items/orders');

    // преобразуем в локальные сущности
    const localOrders = ordersFromPP.map(o => {
      const order = new Order();
      order.customerId = o.customerId || null; 
      order.name = o.name;
      order.status = o.status || 'new';
      return order;
    });

    // сохраняем все новые или обновленные заказы
    return this.ordersRepo.save(localOrders);
  }
}
