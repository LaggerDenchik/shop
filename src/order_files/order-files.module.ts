import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderFilesService } from './order-files.service';
import { OrderFilesController } from './order-files.controller';
import { OrderFiles } from './entities/order-files.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderFiles, Order, User]),
  ],
  providers: [OrderFilesService],
  controllers: [OrderFilesController],
  exports: [OrderFilesService],
})
export class OrderFilesModule {}
