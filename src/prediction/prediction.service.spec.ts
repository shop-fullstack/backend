import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { createMockSupabaseClient } from '../common/test/supabase-mock.helper';

describe('PredictionService', () => {
  let service: PredictionService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictionService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
      ],
    }).compile();

    service = module.get<PredictionService>(PredictionService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getForecast', () => {
    const mockDemandHistory = [
      { order_date: '2025-03-01', total_qty: 3 },
      { order_date: '2025-03-02', total_qty: 0 },
      { order_date: '2025-03-03', total_qty: 5 },
      { order_date: '2025-03-04', total_qty: 2 },
      { order_date: '2025-03-05', total_qty: 7 },
      { order_date: '2025-03-06', total_qty: 4 },
      { order_date: '2025-03-07', total_qty: 8 },
    ];

    it('상품의 수요 예측 결과를 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: mockDemandHistory,
        error: null,
      });

      const result = await service.getForecast('prod-1', 7);

      expect(result.product_id).toBe('prod-1');
      expect(result.forecast_days).toBe(7);
      expect(result.daily_predictions).toHaveLength(7);
      expect(result.trend).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.avg_daily_demand).toBeGreaterThan(0);
    });

    it('증가 추세 데이터에서 trend가 increasing이어야 한다', async () => {
      const increasingData = Array.from({ length: 30 }, (_, i) => ({
        order_date: `2025-03-${String(i + 1).padStart(2, '0')}`,
        total_qty: i * 2,
      }));
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: increasingData,
        error: null,
      });

      const result = await service.getForecast('prod-1', 7);

      expect(result.trend).toBe('increasing');
    });

    it('감소 추세 데이터에서 trend가 decreasing이어야 한다', async () => {
      const decreasingData = Array.from({ length: 30 }, (_, i) => ({
        order_date: `2025-03-${String(i + 1).padStart(2, '0')}`,
        total_qty: 30 - i,
      }));
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: decreasingData,
        error: null,
      });

      const result = await service.getForecast('prod-1', 7);

      expect(result.trend).toBe('decreasing');
    });

    it('일정한 데이터에서 trend가 stable이어야 한다', async () => {
      const stableData = Array.from({ length: 30 }, (_, i) => ({
        order_date: `2025-03-${String(i + 1).padStart(2, '0')}`,
        total_qty: 5,
      }));
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: stableData,
        error: null,
      });

      const result = await service.getForecast('prod-1', 7);

      expect(result.trend).toBe('stable');
    });

    it('daily_predictions의 값은 0 이상이어야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: mockDemandHistory,
        error: null,
      });

      const result = await service.getForecast('prod-1', 7);

      result.daily_predictions.forEach((v: number) => {
        expect(v).toBeGreaterThanOrEqual(0);
      });
    });

    it('rpc 에러 시 BadRequestException을 던져야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'rpc 에러' },
      });

      await expect(service.getForecast('prod-1', 7)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('데이터가 없으면 기본값을 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getForecast('prod-1', 7);

      expect(result.avg_daily_demand).toBe(0);
      expect(result.trend).toBe('stable');
    });
  });

  describe('getRestock', () => {
    it('업종별 재입고 추천 상품을 반환해야 한다', async () => {
      const mockStats = [
        {
          product_id: 'prod-1',
          name: '원두커피',
          category: '식자재',
          order_count: 50,
          total_qty: 200,
          buyer_count: 15,
          price_per_box: 25000,
        },
      ];
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await service.getRestock('카페/베이커리', 10);

      expect(result).toHaveLength(1);
      expect(result[0].product_id).toBe('prod-1');
      expect(result[0].name).toBe('원두커피');
      expect(result[0].restock_score).toBeGreaterThan(0);
    });

    it('rpc 에러 시 BadRequestException을 던져야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'rpc 에러' },
      });

      await expect(service.getRestock('카페/베이커리')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
