import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/database.types';
import { IsNotEmpty, IsString } from 'class-validator';

export class RecommendFrontendQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'business_type을 입력해주세요' })
  business_type: string;
}

@Controller()
@UseGuards(JwtGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('recommendations')
  getRecommendations(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getRecommendations(user.id, query.limit);
  }

  @Get('recommendations/reorder')
  getReorderSuggestions(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getReorderSuggestions(
      user.id,
      query.limit,
    );
  }

  @Get('recommend')
  getRecommendForFrontend(@Query() query: RecommendFrontendQueryDto) {
    return this.recommendationService.getRecommendForFrontend(
      query.business_type,
    );
  }
}
