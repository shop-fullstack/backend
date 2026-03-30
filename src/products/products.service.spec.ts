import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
} from '../common/test/supabase-mock.helper';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  const mockProducts = [
    {
      id: 'prod-1',
      name: '일회용 종이컵',
      category: '소모품',
      price_per_unit: 28,
      price_per_box: 27500,
      moq: 1,
      image_url: 'https://example.com/cup.jpg',
    },
    {
      id: 'prod-2',
      name: '프리미엄 원두커피',
      category: '식자재',
      price_per_unit: 30,
      price_per_box: 29000,
      moq: 1,
      image_url: 'https://example.com/coffee.jpg',
    },
  ];

  const mockProductDetail = {
    id: 'prod-1',
    name: '일회용 종이컵',
    category: '소모품',
    price_per_unit: 28,
    price_per_box: 27500,
    moq: 1,
    origin: '대한민국',
    expiry_info: '제조일로부터 3년',
    image_url: 'https://example.com/cup.jpg',
    created_at: '2025-03-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('기본 쿼리(latest 정렬)로 상품 목록을 반환해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockProducts,
        error: null,
        count: 2,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.findAll({});

      expect(result.items).toEqual(mockProducts);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockClient.from).toHaveBeenCalledWith('shop_products');
    });

    it('카테고리 필터를 적용해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: [mockProducts[0]],
        error: null,
        count: 1,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await service.findAll({ category: '소모품' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('category', '소모품');
    });

    it('검색어 필터를 적용해야 한다 (ILIKE)', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: [mockProducts[0]],
        error: null,
        count: 1,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await service.findAll({ search: '종이컵' });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('name', '%종이컵%');
    });

    it('가격 오름차순 정렬을 적용해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockProducts,
        error: null,
        count: 2,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await service.findAll({ sort: 'price_asc' });

      expect(queryBuilder.order).toHaveBeenCalledWith('price_per_box', {
        ascending: true,
      });
    });

    it('가격 내림차순 정렬을 적용해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockProducts,
        error: null,
        count: 2,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await service.findAll({ sort: 'price_desc' });

      expect(queryBuilder.order).toHaveBeenCalledWith('price_per_box', {
        ascending: false,
      });
    });

    it('최신순(기본값) 정렬을 적용해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockProducts,
        error: null,
        count: 2,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await service.findAll({ sort: 'latest' });

      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('페이지네이션 offset을 올바르게 계산해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: [],
        error: null,
        count: 0,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await service.findAll({ page: 3, limit: 10 });

      // offset = (3-1) * 10 = 20, range(20, 29)
      expect(queryBuilder.range).toHaveBeenCalledWith(20, 29);
    });

    it('인기순 정렬 시 rpc 함수를 호출해야 한다', async () => {
      const rpcResult = [
        { ...mockProducts[0], total: 50 },
        { ...mockProducts[1], total: 50 },
      ];
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      const result = await service.findAll({ sort: 'popular' });

      expect(mockClient.rpc).toHaveBeenCalledWith('get_popular_products', {
        p_category: null,
        p_search: null,
        p_offset: 0,
        p_limit: 20,
      });
      // total 필드가 제거되어야 함
      expect(result.items[0]).not.toHaveProperty('total');
      expect(result.total).toBe(50);
    });

    it('인기순 + 카테고리 필터를 함께 적용해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [{ ...mockProducts[0], total: 10 }],
        error: null,
      });

      await service.findAll({ sort: 'popular', category: '소모품' });

      expect(mockClient.rpc).toHaveBeenCalledWith('get_popular_products', {
        p_category: '소모품',
        p_search: null,
        p_offset: 0,
        p_limit: 20,
      });
    });

    it('인기순 결과가 빈 배열이면 total 0을 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.findAll({ sort: 'popular' });

      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('인기순 rpc data가 null이면 빈 배열로 처리해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.findAll({ sort: 'popular' });

      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('인기순 rpc 에러 시 NotFoundException을 던져야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'rpc 에러' },
      });

      await expect(service.findAll({ sort: 'popular' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('일반 쿼리 에러 시 NotFoundException을 던져야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: null,
        count: null,
      });
      // range()가 에러를 반환하도록 오버라이드
      queryBuilder.range = jest.fn().mockResolvedValue({
        data: null,
        error: { message: '쿼리 에러' },
        count: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await expect(service.findAll({})).rejects.toThrow(NotFoundException);
    });

    it('data가 null이면 빈 배열로 처리해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: null,
        count: 0,
      });
      queryBuilder.range = jest.fn().mockResolvedValue({
        data: null,
        error: null,
        count: 0,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.findAll({});

      expect(result.items).toEqual([]);
    });
  });

  describe('findById', () => {
    it('상품 상세 정보를 반환해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockProductDetail,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.findById('prod-1');

      expect(result).toEqual(mockProductDetail);
      expect(mockClient.from).toHaveBeenCalledWith('shop_products');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'prod-1');
    });

    it('상품이 없으면 NotFoundException을 던져야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('nonexistent')).rejects.toThrow(
        '상품을 찾을 수 없습니다',
      );
    });
  });
});
