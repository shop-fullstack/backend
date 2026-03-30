import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types/database.types';

@Controller('recommendations')
@UseGuards(JwtGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  getRecommendations(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getRecommendations(user.id, query.limit);
  }

  @Get('reorder')
  getReorderSuggestions(
    @CurrentUser() user: JwtPayload,
    @Query() query: RecommendationQueryDto,
  ) {
    return this.recommendationService.getReorderSuggestions(
      user.id,
      query.limit,
    );
  }
}
