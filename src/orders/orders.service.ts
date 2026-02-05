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

  async getOrdersByDealer(dealerOrgId: string) {
    const organization = await this.orgRepo.findOne({
      where: { id: dealerOrgId },
      select: ['email'],
    });

    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    return this.ordersRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.dealerOrganization', 'dealerOrganization')
      .where(
        `
        order.dealer_org_id = :dealerOrgId
        OR (
          order.email = :orgEmail
          AND order.dealer_org_id IS NULL
        )
        `,
        {
          dealerOrgId,
          orgEmail: organization.email,
        }
      )
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async getOrdersByCustomer(customerId: string) {
    return this.ordersRepo.find({
      where: { customerId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async getByExternalId(externalId: string, user: any) {
    const order = await this.ordersRepo.findOne({
      where: { externalId },
      relations: ['dealerOrganization', 'customer'],
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    // ---------------------------
    // Клиент
    // ---------------------------
    if (!user.organizationId) {
      if (order.customerId !== user.id) {
        throw new ForbiddenException('Нет доступа');
      }
      return order;
    }

    // ---------------------------
    // Организация (владелец)
    // ---------------------------
    const isOrgOwner =
      user.role?.scope === 'organization' &&
      user.role?.name === 'org_admin'; // ← пример

    if (isOrgOwner) {
      return order;
    }

    // ---------------------------
    // Сотрудник организации
    // ---------------------------
    const hasPermission =
      user.permissions?.some(
        (p) => p.tag === 'view_orders' || p.tag === 'edit_orders'
      );

    if (!hasPermission) {
      throw new ForbiddenException('Недостаточно прав');
    }

    const belongsToOrganization =
      order.dealerOrgId === user.organizationId ||
      (
        !order.dealerOrgId &&
        order.email === user.organizationEmail
      );

    if (!belongsToOrganization) {
      throw new ForbiddenException('Заказ ещё не назначен, зайдите с администратора организации');
    }

    return order;
  }

  async assignDealer(externalId: string, dealerOrgId: string, userId: string) {
    const order = await this.ordersRepo.findOne({
      where: { externalId },
    });

    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.customerId !== userId) {
      throw new ForbiddenException('Нет доступа');
    }

    const dealer = await this.orgRepo.findOne({
      where: { id: dealerOrgId },
    });
    if (!dealer) throw new NotFoundException('Дилер не найден');

    order.dealerOrgId = dealerOrgId;

    return this.ordersRepo.save(order);
  }

  async syncAllOrdersFromPlanPlace() {
    const ordersFromPP = await this.apiPlService.getData('api/get_items/orders');

    const users = await this.userRepo.find({ select: ['id', 'email'] });
    const emailToUserId = new Map(users.filter(u => u.email).map(u => [u.email.toLowerCase(), u.id]));

    const existingOrders = await this.ordersRepo.find();
    const externalIdToOrder = new Map(existingOrders.map(o => [o.externalId, o]));

    const syncedOrders: Order[] = [];

    for (const o of ordersFromPP) {
      if (!o?.id || !o?.email) continue;

      const customerId = emailToUserId.get(o.email.toLowerCase());
      if (!customerId) {
        console.warn(`Пользователь не найден для email: ${o.email}`);
        continue;
      }

      let order = externalIdToOrder.get(o.id.toString());
      if (!order) {
        order = this.ordersRepo.create({
          externalId: o.id.toString(),
          customerId,
          status: 'new'
        });
      }

      order.customerId = customerId;
      order.name = o.name || order.name;
      order.email = o.email;
      order.phone = o.phone;
      order.comments = o.comments;
      order.projectFile = o.project_file;
      order.orderNumber = o.number;
      order.planplaceDate = this.parsePlanplaceDate(o.date) || new Date();
      order.totalPrice = this.normalizePrice(o.price);

      syncedOrders.push(order);
      console.log(order)
    }

    const savedOrders = await this.ordersRepo.save(syncedOrders);

    return {
      message: `Синхронизировано заказов: ${savedOrders.length}`,
      orders: savedOrders
    };
  }

  private parsePlanplaceDate(dateStr?: string): Date | null {
    if (!dateStr) return new Date(0);

    const [datePart, timePart] = dateStr.split(' - ');
    if (!datePart || !timePart) return new Date();

    const [day, month, year] = datePart.split('.').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    return new Date(year, month - 1, day, hours, minutes);
  }

  private normalizePrice(price?: string): number {
    if (!price) return 0;
    return Number(price
      .replace(/\s/g, '')
      .replace('€', '')
      .replace(',', '.')
    );
  }

  async markOrderAsViewedIfNew(
    externalId: string,
    user: any
  ): Promise<{ updated: boolean }> {

    const order = await this.ordersRepo.findOne({
      where: { externalId },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    order.status = 'viewed';
    await this.ordersRepo.save(order);

    return { updated: true };
  }

  async updateOrderStatus(
    externalId: string,
    status: string,
    user: any
  ): Promise<Order> {
    const order = await this.ordersRepo.findOne({
      where: { externalId },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!user.organizationId && order.customerId !== user.id) {
      throw new ForbiddenException('Нет доступа');
    }

    order.status = status;
    return this.ordersRepo.save(order);
  }
}