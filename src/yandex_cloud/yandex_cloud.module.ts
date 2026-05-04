import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { YandexCloudController } from './yandex_cloud.controller';
import { YandexCloudService } from './yandex_cloud.service';
import { OrderFilesModule } from 'order_files/order-files.module';

@Module({
  imports: [HttpModule,
    OrderFilesModule
  ],    
  controllers: [YandexCloudController],
  providers: [YandexCloudService],
  exports: [YandexCloudService],
  
})
export class YandexCloudModule {}
