import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { ForecastQueryDto, RestockQueryDto } from './dto/forecast-query.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/database.types';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForecastFrontendQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'business_type을 입력해주세요' })
  business_type: string;
}

@Controller()
@UseGuards(JwtGuard)
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get('predictions/forecast')
  getForecast(@Query() query: ForecastQueryDto) {
    return this.predictionService.getForecast(query.product_id, query.days);
  }

  @Get('predictions/restock')
  getRestock(@CurrentUser() user: JwtPayload, @Query() query: RestockQueryDto) {
    return this.predictionService.getRestockByUserId(user.id, query.limit);
  }

  @Get('forecast')
  getForecastForFrontend(@Query() query: ForecastFrontendQueryDto) {
    return this.predictionService.getForecastForFrontend(query.business_type);
  }
}
