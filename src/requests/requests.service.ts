import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requests } from './entities/requests.entity';
import { Organization } from '../auth/entities/organization.entity';
import { ApiPlService } from 'planplace/apiPl.service';
import { User } from '../auth/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateRequestDto } from './dto/create-requests.dto';
import { ConfirmedStatus } from './entities/requests.entity';
import { RequestStatus } from './entities/requests.entity';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Requests)
    private readonly requestsRepo: Repository<Requests>,

    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Requests)
    private requestsRepository: Repository<Requests>,

    private apiPlService: ApiPlService
  ) { }



  async createRequest(userId: string, dto: CreateRequestDto) {
    const existing = await this.requestsRepository.findOne({
      where: {
        orderId: dto.orderId,
        status: RequestStatus.PENDING,
      },
    });

    if (existing) {
      // возврат на фронт
      throw new BadRequestException('Уже существует активный запрос для этого заказа');
    }

    console.log('orderId:', dto);

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    const newRequest = this.requestsRepository.create({
      orderId: dto.orderId,
      orgId: dto.orgId,
      user: { id: dto.userId, },
      cause: dto.cause,

      user_confirmed: dto.user_confirmed,
      userConfirmedAt: dto.user_confirmed ? now : null,
      org_confirmed: dto.org_confirmed,
      orgConfirmedAt: dto.org_confirmed ? now : null,
      createdBy: userId, // создатель

      expiresAt: expiresAt,
    });
    newRequest.status = this.getRequestStatus(newRequest.user_confirmed, newRequest.org_confirmed);
    console.log("dto.userConfirmed", dto.user_confirmed);
    console.log("dto.orgConfirmed", dto.org_confirmed);
    console.log('dto.userId', newRequest.userId);
    return await this.requestsRepository.save(newRequest);
  }



  /* async viewRequests(orderId: number) {
    const now = new Date();
    const excludedStatuses = [
      RequestStatus.EXPIRED,
      RequestStatus.COMPLETED,
      RequestStatus.CANCELLED,
    ];

    await this.requestsRepo
      .createQueryBuilder()
      .update(Requests)
      .set({ status: RequestStatus.EXPIRED, updatedAt: now })
      .where('orderId = :orderId', { orderId })
      .andWhere('status NOT IN (:...excludedStatuses)', { excludedStatuses })
      .andWhere('expiresAt < :now', { now })
      .execute();

    const requests = await this.requestsRepo.find({
      where: { orderId },
      relations: ['user', 'organization'],
      // Только нужные поля
      order: {
        createdAt: 'DESC',
      },
      select: {
        id: true,
        status: true,
        createdBy: true,
        cause: true,
        user_confirmed: true,
        org_confirmed: true,
        userConfirmedAt: true,
        orgConfirmedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          fullName: true,
          email: true,
        },
        organization: {
          id: true,
          name: true,
          shortname: true,
          email: true,
        }
      },
    });

    return requests;
  } */

  async viewRequests(orderId: number, page: number, limit: number, status: string, sort: any) {
    const now = new Date();

    const excludedStatuses = [
      RequestStatus.EXPIRED,
      RequestStatus.COMPLETED,
      RequestStatus.CANCELLED,
    ];

    // обновление статусов (оставляем как есть)
    await this.requestsRepo
      .createQueryBuilder()
      .update(Requests)
      .set({ status: RequestStatus.EXPIRED, updatedAt: now })
      .where('orderId = :orderId', { orderId })
      .andWhere('status NOT IN (:...excludedStatuses)', { excludedStatuses })
      .andWhere('expiresAt < :now', { now })
      .execute();

      const whereCondition: any = { orderId: orderId };

    if (status && status !== 'all') {
      whereCondition.status = status;
    }

    const [items, total] = await this.requestsRepo.findAndCount({
      where: whereCondition,
      relations: ['user', 'organization'],
      order: {
        createdAt: sort.toUpperCase(),
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        status: true,
        createdBy: true,
        cause: true,
        user_confirmed: true,
        org_confirmed: true,
        userConfirmedAt: true,
        orgConfirmedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          fullName: true,
          email: true,
        },
        organization: {
          id: true,
          name: true,
          shortname: true,
          email: true,
        }
      },
    });

    return {
      items,
      total,
    };
  }

  async findOne(id: string) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async approve(id: string, user: User) {
    let request = await this.findOne(id);

    await this.ensureNotExpired(request);

    switch (user.type) {
      case 'organization':
        request.org_confirmed = ConfirmedStatus.APPROVED;
        request.orgConfirmedAt = new Date();
        break;

      case 'customer':
        request.user_confirmed = ConfirmedStatus.APPROVED;
        request.userConfirmedAt = new Date();
        break;
    }

    request.status = this.getRequestStatus(
      request.user_confirmed,
      request.org_confirmed
    );

    return this.requestsRepo.save(request);
  }

  async reject(id: string, user: User) {
    let request = await this.findOne(id);

    await this.ensureNotExpired(request);

    switch (user.type) {
      case 'organization':
        request.org_confirmed = ConfirmedStatus.REJECTED;
        request.orgConfirmedAt = new Date();
        break;

      case 'customer':
        request.user_confirmed = ConfirmedStatus.REJECTED;
        request.userConfirmedAt = new Date();
        break;
    }

    request.status = this.getRequestStatus(
      request.user_confirmed,
      request.org_confirmed
    );

    return this.requestsRepo.save(request);
  }

  private async ensureNotExpired(request: Requests) {
    const now = new Date();

    if (
      [
        RequestStatus.EXPIRED,
        RequestStatus.COMPLETED,
        RequestStatus.CANCELLED,
      ].includes(request.status)
    ) {
      throw new BadRequestException('Request is already finished');
    }

    if (request.expiresAt && request.expiresAt < now) {
      request.status = RequestStatus.EXPIRED;
      request.updatedAt = now;

      await this.requestsRepo.save(request);

      throw new BadRequestException('Request has expired');
    }
  }

  getRequestStatus(
    userConfirmed: ConfirmedStatus,
    orgConfirmed: ConfirmedStatus
  ): RequestStatus {
    // если оба подтвердили
    if (
      userConfirmed === ConfirmedStatus.APPROVED &&
      orgConfirmed === ConfirmedStatus.APPROVED
    ) {
      return RequestStatus.COMPLETED;
    }

    // если кто-то отклонил
    if (
      userConfirmed === ConfirmedStatus.REJECTED ||
      orgConfirmed === ConfirmedStatus.REJECTED
    ) {
      return RequestStatus.CANCELLED;
    }

    // по умолчанию
    return RequestStatus.PENDING;
  }

}