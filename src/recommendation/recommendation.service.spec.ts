import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
} from '../common/test/supabase-mock.helper';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  const mockUser = {
    id: 'user-1',
    business_type: '카페/베이커리',
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getRecommendations', () => {
    it('업종 기반 추천 상품을 반환해야 한다', async () => {
      // 1. 유저 조회
      const userBuilder = createMockQueryBuilder({
        data: mockUser,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(userBuilder);

      // 2. 업종별 인기 상품 rpc
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [
          {
            product_id: 'prod-1',
            name: '원두커피',
            category: '식자재',
            order_count: 50,
            total_qty: 200,
            buyer_count: 15,
            price_per_box: 25000,
          },
          {
            product_id: 'prod-2',
            name: '종이컵',
            category: '소모품',
            order_count: 40,
            total_qty: 150,
            buyer_count: 12,
            price_per_box: 27500,
          },
        ],
        error: null,
      });

      const result = await service.getRecommendations('user-1', 10);

      expect(result.business_type).toBe('카페/베이커리');
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('product_id');
      expect(result.items[0]).toHaveProperty('name');
      expect(result.items[0]).toHaveProperty('reason');
      expect(result.items[0]).toHaveProperty('score');
    });

    it('score가 0~1 범위여야 한다', async () => {
      const userBuilder = createMockQueryBuilder({
        data: mockUser,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(userBuilder);
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [
          {
            product_id: 'prod-1',
            name: '커피',
            category: '식자재',
            order_count: 50,
            total_qty: 200,
            buyer_count: 15,
            price_per_box: 25000,
          },
        ],
        error: null,
      });

      const result = await service.getRecommendations('user-1', 10);

      result.items.forEach((item: { score: number }) => {
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(1);
      });
    });

    it('유저를 찾을 수 없으면 BadRequestException을 던져야 한다', async () => {
      const userBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      mockClient.from = jest.fn().mockReturnValue(userBuilder);

      await expect(
        service.getRecommendations('nonexistent', 10),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReorderSuggestions', () => {
    it('재주문 추천 상품을 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [
          {
            product_id: 'prod-1',
            name: '원두커피',
            category: '식자재',
            purchase_count: 10,
            total_qty: 30,
            last_purchased: '2025-03-15T00:00:00Z',
            avg_interval_days: 7,
            price_per_box: 25000,
          },
          {
            product_id: 'prod-2',
            name: '종이컵',
            category: '소모품',
            purchase_count: 5,
            total_qty: 20,
            last_purchased: '2025-03-20T00:00:00Z',
            avg_interval_days: 14,
            price_per_box: 27500,
          },
        ],
        error: null,
      });

      const result = await service.getReorderSuggestions('user-1', 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('product_id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('days_since_last_order');
      expect(result[0]).toHaveProperty('avg_interval_days');
      expect(result[0]).toHaveProperty('urgency');
      expect(['high', 'medium', 'low']).toContain(result[0].urgency);
    });

    it('rpc 에러 시 BadRequestException을 던져야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: '에러' },
      });

      await expect(service.getReorderSuggestions('user-1', 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('구매 이력이 없으면 빈 배열을 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getReorderSuggestions('user-1', 10);

      expect(result).toEqual([]);
    });
  });
});
