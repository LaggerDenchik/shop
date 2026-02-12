import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { YandexCloudController } from './yandex_cloud.controller';
import { YandexCloudService } from './yandex_cloud.service';

@Module({
  imports: [HttpModule],    
  controllers: [YandexCloudController],
  providers: [YandexCloudService],
  exports: [YandexCloudService],
  
})
export class YandexCloudModule {}
