import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { Contract } from './entities/contract.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderFilesModule } from '../order_files/order-files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, Order]),
    OrderFilesModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule { }