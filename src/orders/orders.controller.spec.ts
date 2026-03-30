import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtPayload = { id: 'user-1', email: 'test@bizmart.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('JWT userId와 DTO로 서비스를 호출해야 한다', async () => {
      const dto = {
        items: [{ product_id: 'prod-1', quantity: 2 }],
        delivery_address: '서울시',
      };
      const expected = {
        message: '주문이 완료되었습니다',
        data: { order_id: 'BM-1', total_amount: 55000, status: '주문완료' },
      };
      mockOrdersService.create.mockResolvedValue(expected);

      const result = await controller.create(mockJwtPayload, dto);

      expect(result).toEqual(expected);
      expect(ordersService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('findAll', () => {
    it('userId와 status로 서비스를 호출해야 한다', async () => {
      const expected = [{ id: 'BM-1', status: '주문완료' }];
      mockOrdersService.findAllByUser.mockResolvedValue(expected);

      const result = await controller.findAll(mockJwtPayload, '주문완료');

      expect(result).toEqual(expected);
      expect(ordersService.findAllByUser).toHaveBeenCalledWith(
        'user-1',
        '주문완료',
      );
    });

    it('status 없이도 호출 가능해야 한다', async () => {
      mockOrdersService.findAllByUser.mockResolvedValue([]);

      await controller.findAll(mockJwtPayload);

      expect(ordersService.findAllByUser).toHaveBeenCalledWith(
        'user-1',
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('주문번호와 userId로 서비스를 호출해야 한다', async () => {
      const expected = { id: 'BM-20250325-0063', status: '배송중' };
      mockOrdersService.findOne.mockResolvedValue(expected);

      const result = await controller.findOne(
        mockJwtPayload,
        'BM-20250325-0063',
      );

      expect(result).toEqual(expected);
      expect(ordersService.findOne).toHaveBeenCalledWith(
        'BM-20250325-0063',
        'user-1',
      );
    });
  });
});
