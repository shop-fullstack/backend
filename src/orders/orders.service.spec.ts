import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
} from '../common/test/supabase-mock.helper';

describe('OrdersService', () => {
  let service: OrdersService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  const mockCreateOrderDto = {
    items: [
      { product_id: 'prod-1', quantity: 2 },
      { product_id: 'prod-2', quantity: 3 },
    ],
    delivery_address: '서울특별시 마포구 합정동 123-45',
    delivery_date: '2025-04-03',
    is_cold: false,
  };

  const mockOrderRow = {
    id: 'order-uuid',
    order_number: 'BM-20250325-0063',
    user_id: 'user-1',
    status: '주문완료',
    total_amount: 130100,
    delivery_address: '서울특별시 마포구 합정동 123-45',
    delivery_date: '2025-04-03',
    is_cold: false,
    created_at: '2025-03-25T10:00:00Z',
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('rpc create_order를 호출하고 결과를 반환해야 한다', async () => {
      const rpcResult = {
        order_id: 'BM-20250325-0063',
        total_amount: 130100,
        status: '주문완료',
      };
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: rpcResult,
        error: null,
      });

      const result = await service.create('user-1', mockCreateOrderDto);

      expect(result.message).toBe('주문이 완료되었습니다');
      expect(result.data).toEqual(rpcResult);
      expect(mockClient.rpc).toHaveBeenCalledWith('create_order', {
        p_user_id: 'user-1',
        p_items: mockCreateOrderDto.items,
        p_delivery_address: mockCreateOrderDto.delivery_address,
        p_delivery_date: '2025-04-03',
        p_is_cold: false,
      });
    });

    it('delivery_date가 없으면 null로 전달해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: { order_id: 'BM-1', total_amount: 100, status: '주문완료' },
        error: null,
      });

      const dtoWithoutDate = {
        items: [{ product_id: 'prod-1', quantity: 1 }],
        delivery_address: '서울시',
      };

      await service.create('user-1', dtoWithoutDate);

      expect(mockClient.rpc).toHaveBeenCalledWith(
        'create_order',
        expect.objectContaining({
          p_delivery_date: null,
          p_is_cold: false,
        }),
      );
    });

    it('rpc 에러 시 BadRequestException을 던져야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: '상품을 찾을 수 없습니다: prod-999' },
      });

      await expect(
        service.create('user-1', mockCreateOrderDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('is_cold가 true일 때 올바르게 전달해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: { order_id: 'BM-1', total_amount: 100, status: '주문완료' },
        error: null,
      });

      const coldDto = { ...mockCreateOrderDto, is_cold: true };
      await service.create('user-1', coldDto);

      expect(mockClient.rpc).toHaveBeenCalledWith(
        'create_order',
        expect.objectContaining({ p_is_cold: true }),
      );
    });
  });

  describe('findAllByUser', () => {
    const mockOrders = [
      {
        order_number: 'BM-20250325-0063',
        status: '주문완료',
        total_amount: 130100,
        delivery_date: '2025-04-03',
        is_cold: false,
        created_at: '2025-03-25T10:00:00Z',
      },
      {
        order_number: 'BM-20250324-0062',
        status: '배송중',
        total_amount: 55000,
        delivery_date: '2025-04-02',
        is_cold: true,
        created_at: '2025-03-24T10:00:00Z',
      },
    ];

    it('order_number를 id로 변환하여 반환해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockOrders,
        error: null,
      });
      // findAllByUser는 single()이 아닌 일반 쿼리이므로
      // eq → order → eq(status) 체인 후 결과를 반환해야 함
      // queryBuilder의 마지막 eq 호출이 결과를 반환하도록 설정
      const mockEq = jest.fn().mockReturnValue(queryBuilder);
      queryBuilder.eq = mockEq;
      // order 후에도 체인이 계속되도록
      queryBuilder.order = jest.fn().mockReturnValue({
        ...queryBuilder,
        eq: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
        then: undefined, // 직접 await하지 않도록
      });
      // status가 없을 때는 order() 결과가 바로 resolve
      queryBuilder.order = jest.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
      });

      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.findAllByUser('user-1');

      expect(result[0].id).toBe('BM-20250325-0063');
      expect(result[0]).not.toHaveProperty('order_number');
      expect(result[1].id).toBe('BM-20250324-0062');
    });

    it('status 필터를 적용해야 한다', async () => {
      const filteredOrders = [mockOrders[1]];
      const orderMock = jest.fn();
      const eqStatusMock = jest.fn().mockResolvedValue({
        data: filteredOrders,
        error: null,
      });
      orderMock.mockReturnValue({ eq: eqStatusMock });

      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: null,
      });
      queryBuilder.order = orderMock;
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.findAllByUser('user-1', '배송중');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('BM-20250324-0062');
    });

    it('status가 "all"이면 필터를 적용하지 않아야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: null,
      });
      queryBuilder.order = jest.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.findAllByUser('user-1', 'all');

      expect(result).toHaveLength(2);
    });

    it('에러 시 BadRequestException을 던져야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: null,
      });
      queryBuilder.order = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB 오류' },
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await expect(service.findAllByUser('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('주문 상세와 주문 상품을 합쳐서 반환해야 한다', async () => {
      const mockItems = [
        {
          product_id: 'prod-1',
          quantity: 2,
          unit_price: 27500,
          shop_products: { name: '일회용 종이컵' },
        },
        {
          product_id: 'prod-2',
          quantity: 3,
          unit_price: 29000,
          shop_products: { name: '프리미엄 원두커피' },
        },
      ];

      // 첫 번째 from: shop_orders 조회
      const orderBuilder = createMockQueryBuilder({
        data: mockOrderRow,
        error: null,
      });
      // 두 번째 from: shop_order_items 조회 (single 아님)
      const itemsBuilder = createMockQueryBuilder({
        data: mockItems,
        error: null,
      });
      // eq 후 결과 반환 (single() 호출 없이)
      itemsBuilder.eq = jest.fn().mockResolvedValue({
        data: mockItems,
        error: null,
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(orderBuilder)
        .mockReturnValueOnce(itemsBuilder);

      const result = await service.findOne('BM-20250325-0063', 'user-1');

      expect(result.id).toBe('BM-20250325-0063');
      expect(result.status).toBe('주문완료');
      expect(result.total_amount).toBe(130100);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('일회용 종이컵');
      expect(result.items[0].product_id).toBe('prod-1');
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].unit_price).toBe(27500);
    });

    it('shop_products가 null인 아이템은 빈 문자열 name을 반환해야 한다', async () => {
      const orderBuilder = createMockQueryBuilder({
        data: mockOrderRow,
        error: null,
      });
      const itemsBuilder = createMockQueryBuilder({
        data: null,
        error: null,
      });
      itemsBuilder.eq = jest.fn().mockResolvedValue({
        data: [
          {
            product_id: 'prod-1',
            quantity: 1,
            unit_price: 1000,
            shop_products: null,
          },
        ],
        error: null,
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(orderBuilder)
        .mockReturnValueOnce(itemsBuilder);

      const result = await service.findOne('BM-20250325-0063', 'user-1');

      expect(result.items[0].name).toBe('');
    });

    it('items가 null이면 빈 배열로 처리해야 한다', async () => {
      const orderBuilder = createMockQueryBuilder({
        data: mockOrderRow,
        error: null,
      });
      const itemsBuilder = createMockQueryBuilder({
        data: null,
        error: null,
      });
      itemsBuilder.eq = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(orderBuilder)
        .mockReturnValueOnce(itemsBuilder);

      const result = await service.findOne('BM-20250325-0063', 'user-1');

      expect(result.items).toEqual([]);
    });

    it('주문이 없으면 NotFoundException을 던져야 한다', async () => {
      const orderBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      mockClient.from = jest.fn().mockReturnValue(orderBuilder);

      await expect(service.findOne('BM-9999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('BM-9999', 'user-1')).rejects.toThrow(
        '주문을 찾을 수 없습니다',
      );
    });

    it('주문 상품 조회 에러 시 BadRequestException을 던져야 한다', async () => {
      const orderBuilder = createMockQueryBuilder({
        data: mockOrderRow,
        error: null,
      });
      const itemsBuilder = createMockQueryBuilder({
        data: null,
        error: null,
      });
      itemsBuilder.eq = jest.fn().mockResolvedValue({
        data: null,
        error: { message: '아이템 조회 실패' },
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(orderBuilder)
        .mockReturnValueOnce(itemsBuilder);

      await expect(
        service.findOne('BM-20250325-0063', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
