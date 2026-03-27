import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository, Not, LessThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Requests, RequestStatus } from './entities/requests.entity';

@Injectable()
export class RequestsCronService {
    constructor(
        @InjectRepository(Requests)
        private readonly requestsRepo: Repository<Requests>,
    ) { }

    // @Cron('*/5 * * * *') в 5 мин
    // @Cron('*/30 * * * * *') 30 сек
    // @Cron('0 */30 * * * *') // 30 мин
    @Cron('0 */30 * * * *') 
    async handleExpiredRequests() {
        console.log('⏰ CRON RUNNING');
        const now = new Date();

        const excludedStatuses = [
            RequestStatus.EXPIRED,
            RequestStatus.COMPLETED,
            RequestStatus.CANCELLED,
        ];

        await this.requestsRepo
            .createQueryBuilder()
            .update(Requests)
            .set({
                status: RequestStatus.EXPIRED,
                updatedAt: now,
            } as any)
            // .where('status != :status', { status: RequestStatus.EXPIRED })
            .where('status NOT IN (:...excludedStatuses)', { excludedStatuses })
            .andWhere('expiresAt < :now', { now })
            .execute();
    }
}
