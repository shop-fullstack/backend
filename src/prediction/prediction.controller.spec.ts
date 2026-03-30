import { Test, TestingModule } from '@nestjs/testing';
import { PredictionController } from './prediction.controller';
import { PredictionService } from './prediction.service';

describe('PredictionController', () => {
  let controller: PredictionController;
  let predictionService: PredictionService;

  const mockPredictionService = {
    getForecast: jest.fn(),
    getRestockByUserId: jest.fn(),
  };

  const mockJwtPayload = { id: 'user-1', email: 'test@bizmart.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PredictionController],
      providers: [
        { provide: PredictionService, useValue: mockPredictionService },
      ],
    }).compile();

    controller = module.get<PredictionController>(PredictionController);
    predictionService = module.get<PredictionService>(PredictionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getForecast', () => {
    it('product_id와 days를 서비스에 전달해야 한다', async () => {
      const expected = {
        product_id: 'prod-1',
        forecast_days: 7,
        daily_predictions: [3, 4, 5],
        trend: 'increasing',
        confidence: 0.8,
        avg_daily_demand: 4,
      };
      mockPredictionService.getForecast.mockResolvedValue(expected);

      const result = await controller.getForecast({
        product_id: 'prod-1',
        days: 7,
      });

      expect(result).toEqual(expected);
      expect(predictionService.getForecast).toHaveBeenCalledWith('prod-1', 7);
    });
  });

  describe('getRestock', () => {
    it('userId와 limit를 서비스에 전달해야 한다', async () => {
      const expected = [{ product_id: 'prod-1', restock_score: 0.9 }];
      mockPredictionService.getRestockByUserId.mockResolvedValue(expected);

      const result = await controller.getRestock(mockJwtPayload, {
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(predictionService.getRestockByUserId).toHaveBeenCalledWith(
        'user-1',
        10,
      );
    });
  });
});
