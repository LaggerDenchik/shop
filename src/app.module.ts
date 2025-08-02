import { Module } from '@nestjs/common';
import { CabinetsModule } from './cabinets/cabinets.module';

@Module({
  imports: [CabinetsModule],
})
export class AppModule {}
