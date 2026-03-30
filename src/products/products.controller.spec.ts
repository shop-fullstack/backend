import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: ProductsService;

  const mockProductsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('쿼리 파라미터를 서비스에 전달해야 한다', async () => {
      const query = {
        category: '식자재',
        sort: 'price_asc',
        page: 2,
        limit: 10,
      };
      const expected = { items: [], total: 0, page: 2, limit: 10 };
      mockProductsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);

      expect(result).toEqual(expected);
      expect(productsService.findAll).toHaveBeenCalledWith(query);
    });

    it('빈 쿼리로도 호출 가능해야 한다', async () => {
      const expected = { items: [], total: 0, page: 1, limit: 20 };
      mockProductsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({});

      expect(result).toEqual(expected);
    });
  });

  describe('findById', () => {
    it('상품 ID로 서비스를 호출해야 한다', async () => {
      const expected = { id: 'prod-1', name: '커피' };
      mockProductsService.findById.mockResolvedValue(expected);

      const result = await controller.findById('prod-1');

      expect(result).toEqual(expected);
      expect(productsService.findById).toHaveBeenCalledWith('prod-1');
    });
  });
});
