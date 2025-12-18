import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { Organization } from '../auth/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { ApiPlModule } from 'planplace/apiPl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Organization, User]),
    ApiPlModule
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
