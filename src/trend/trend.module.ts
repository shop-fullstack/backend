import { Module } from '@nestjs/common';
import { TrendController } from './trend.controller';
import { TrendService } from './trend.service';

@Module({
  controllers: [TrendController],
  providers: [TrendService],
})
export class TrendModule {}
