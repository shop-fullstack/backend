import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let recommendationService: RecommendationService;

  const mockRecommendationService = {
    getRecommendations: jest.fn(),
    getReorderSuggestions: jest.fn(),
  };

  const mockJwtPayload = { id: 'user-1', email: 'test@bizmart.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationService,
          useValue: mockRecommendationService,
        },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
    recommendationService = module.get<RecommendationService>(
      RecommendationService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('getRecommendations', () => {
    it('userId와 limit를 서비스에 전달해야 한다', async () => {
      const expected = {
        business_type: '카페/베이커리',
        items: [{ product_id: 'prod-1', score: 0.9 }],
      };
      mockRecommendationService.getRecommendations.mockResolvedValue(expected);

      const result = await controller.getRecommendations(mockJwtPayload, {
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        'user-1',
        10,
      );
    });
  });

  describe('getReorderSuggestions', () => {
    it('userId와 limit를 서비스에 전달해야 한다', async () => {
      const expected = [{ product_id: 'prod-1', urgency: 'high' }];
      mockRecommendationService.getReorderSuggestions.mockResolvedValue(
        expected,
      );

      const result = await controller.getReorderSuggestions(mockJwtPayload, {
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(recommendationService.getReorderSuggestions).toHaveBeenCalledWith(
        'user-1',
        10,
      );
    });
  });
});
