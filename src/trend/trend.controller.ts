import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TrendService } from './trend.service';
import { TrendReportQueryDto, TrendBestQueryDto } from './dto/trend-query.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@Controller('trend')
@UseGuards(JwtGuard)
export class TrendController {
  constructor(private readonly trendService: TrendService) {}

  @Get('report')
  getReport(@Query() query: TrendReportQueryDto) {
    return this.trendService.getReport(query.period, query.limit);
  }

  @Get('best')
  getBest(@Query() query: TrendBestQueryDto) {
    return this.trendService.getBest(query.type, query.limit);
  }
}
