import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Organization } from '../auth/entities/organization.entity';
import { ApiPlService } from 'planplace/apiPl.service';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

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

  async assignDealer(orderIdOrExternalId: string, dealerOrgId: string, userId: string) {
    const order = await this.ordersRepo.findOne({
        where: [
        { externalId: orderIdOrExternalId }
        ]
    });

    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.customerId !== userId) throw new ForbiddenException('Нет доступа');

    const dealer = await this.orgRepo.findOne({ where: { id: dealerOrgId } });
    if (!dealer) throw new NotFoundException('Дилер не найден');

    order.dealerOrgId = dealerOrgId;
    order.status = 'assigned';

    return this.ordersRepo.save(order);
  }

  async syncAllOrdersFromPlanPlace() {
    // Получаем все заказы из PlanPlace
    const ordersFromPP = await this.apiPlService.getData('api/get_items/orders');

    const users = await this.userRepo.find();
    const emailToUserId = new Map(users.map(u => [u.email.toLowerCase(), u.id]));

    for (const o of ordersFromPP) {
        const customerId = emailToUserId.get(o.email.toLowerCase());

        if (!customerId) {
            console.warn(`Не найден пользователь для email: ${o.email}`);
            continue;
        }

        let order = await this.ordersRepo.findOne({ where: { externalId: o.id } });

        if (!order) {
            order = new Order();
            order.externalId = o.id;
            order.customerId = customerId;
            order.name = o.name || `Заказ ${o.id}`;
            order.status = 'new';
            order.dealerOrgId = null;
            await this.ordersRepo.save(order);
        } else {
            order.status = 'new';
            order.name = o.name || order.name;
            await this.ordersRepo.save(order);
        }
    }
    return { message: 'Синхронизация завершена' };
  }
}
