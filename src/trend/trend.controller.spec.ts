import { Test, TestingModule } from '@nestjs/testing';
import { TrendController } from './trend.controller';
import { TrendService } from './trend.service';

describe('TrendController', () => {
  let controller: TrendController;
  let trendService: TrendService;

  const mockTrendService = {
    getReport: jest.fn(),
    getBest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrendController],
      providers: [{ provide: TrendService, useValue: mockTrendService }],
    }).compile();

    controller = module.get<TrendController>(TrendController);
    trendService = module.get<TrendService>(TrendService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getReport', () => {
    it('period와 limit를 서비스에 전달해야 한다', async () => {
      const expected = {
        period: 'weekly',
        generated_at: '2025-03-27T00:00:00Z',
        ranking: [],
      };
      mockTrendService.getReport.mockResolvedValue(expected);

      const result = await controller.getReport({
        period: 'weekly',
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(trendService.getReport).toHaveBeenCalledWith('weekly', 10);
    });

    it('기본값으로 호출 가능해야 한다', async () => {
      mockTrendService.getReport.mockResolvedValue({
        period: 'weekly',
        ranking: [],
      });

      await controller.getReport({});

      expect(trendService.getReport).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('getBest', () => {
    it('type과 limit를 서비스에 전달해야 한다', async () => {
      const expected = { business_type: '카페/베이커리', ranking: [] };
      mockTrendService.getBest.mockResolvedValue(expected);

      const result = await controller.getBest({
        type: '카페/베이커리',
        limit: 5,
      });

      expect(result).toEqual(expected);
      expect(trendService.getBest).toHaveBeenCalledWith('카페/베이커리', 5);
    });
  });
});
