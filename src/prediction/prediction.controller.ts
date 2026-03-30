import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { ForecastQueryDto, RestockQueryDto } from './dto/forecast-query.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/database.types';

@Controller('predictions')
@UseGuards(JwtGuard)
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get('forecast')
  getForecast(@Query() query: ForecastQueryDto) {
    return this.predictionService.getForecast(query.product_id, query.days);
  }

  @Get('restock')
  getRestock(@CurrentUser() user: JwtPayload, @Query() query: RestockQueryDto) {
    return this.predictionService.getRestockByUserId(user.id, query.limit);
  }
}
