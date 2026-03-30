import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TrendService } from './trend.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { createMockSupabaseClient } from '../common/test/supabase-mock.helper';

describe('TrendService', () => {
  let service: TrendService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  const mockTrendReport = [
    {
      rank: 1,
      product_id: 'prod-1',
      name: '일회용 종이컵',
      category: '소모품',
      order_count: 1240,
      change: 'up',
    },
    {
      rank: 2,
      product_id: 'prod-2',
      name: '프리미엄 원두커피',
      category: '식자재',
      order_count: 890,
      change: 'same',
    },
  ];

  const mockBestSellers = [
    {
      rank: 1,
      product_id: 'prod-1',
      name: '프리미엄 원두커피',
      category: '식자재',
      order_count: 890,
    },
    {
      rank: 2,
      product_id: 'prod-2',
      name: '설탕 5kg',
      category: '식자재',
      order_count: 650,
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
      ],
    }).compile();

    service = module.get<TrendService>(TrendService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getReport', () => {
    it('주간 트렌드 리포트를 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: mockTrendReport,
        error: null,
      });

      const result = await service.getReport('weekly', 10);

      expect(result.period).toBe('weekly');
      expect(result.ranking).toEqual(mockTrendReport);
      expect(result.generated_at).toBeDefined();
      expect(mockClient.rpc).toHaveBeenCalledWith('get_trend_report', {
        p_period: 'weekly',
        p_limit: 10,
      });
    });

    it('월간 트렌드 리포트를 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: mockTrendReport,
        error: null,
      });

      const result = await service.getReport('monthly', 5);

      expect(result.period).toBe('monthly');
      expect(mockClient.rpc).toHaveBeenCalledWith('get_trend_report', {
        p_period: 'monthly',
        p_limit: 5,
      });
    });

    it('기본값으로 weekly, limit 10을 사용해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      await service.getReport();

      expect(mockClient.rpc).toHaveBeenCalledWith('get_trend_report', {
        p_period: 'weekly',
        p_limit: 10,
      });
    });

    it('generated_at이 ISO 날짜 문자열이어야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getReport();

      expect(() => new Date(result.generated_at)).not.toThrow();
      expect(new Date(result.generated_at).toISOString()).toBe(
        result.generated_at,
      );
    });

    it('rpc 에러 시 BadRequestException을 던져야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'rpc 에러' },
      });

      await expect(service.getReport('weekly', 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('data가 null이면 빈 배열을 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.getReport();

      expect(result.ranking).toEqual([]);
    });
  });

  describe('getBest', () => {
    it('업종별 베스트셀러를 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: mockBestSellers,
        error: null,
      });

      const result = await service.getBest('카페/베이커리', 10);

      expect(result.business_type).toBe('카페/베이커리');
      expect(result.ranking).toEqual(mockBestSellers);
      expect(mockClient.rpc).toHaveBeenCalledWith('get_trend_best', {
        p_business_type: '카페/베이커리',
        p_limit: 10,
      });
    });

    it('limit 기본값이 10이어야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      await service.getBest('식당/외식업');

      expect(mockClient.rpc).toHaveBeenCalledWith('get_trend_best', {
        p_business_type: '식당/외식업',
        p_limit: 10,
      });
    });

    it('다양한 업종 타입으로 호출 가능해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const types = [
        '카페/베이커리',
        '식당/외식업',
        '미용실/뷰티',
        '편의점/소매업',
        '네일샵/피부샵',
      ];

      for (const type of types) {
        await service.getBest(type);
        expect(mockClient.rpc).toHaveBeenCalledWith('get_trend_best', {
          p_business_type: type,
          p_limit: 10,
        });
      }
    });

    it('rpc 에러 시 BadRequestException을 던져야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'rpc 에러' },
      });

      await expect(service.getBest('카페/베이커리')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('data가 null이면 빈 배열을 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.getBest('카페/베이커리');

      expect(result.ranking).toEqual([]);
    });
  });
});
