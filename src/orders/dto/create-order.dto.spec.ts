import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto, OrderItemDto } from './create-order.dto';

describe('OrderItemDto', () => {
  it('올바른 UUID와 수량은 통과', async () => {
    const dto = plainToInstance(OrderItemDto, {
      product_id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 3,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('UUID 형식이 아니면 에러', async () => {
    const dto = plainToInstance(OrderItemDto, {
      product_id: 'not-a-uuid',
      quantity: 1,
    });
    const errors = await validate(dto);
    const idError = errors.find((e) => e.property === 'product_id');
    expect(idError).toBeDefined();
  });

  it('수량이 0이면 에러', async () => {
    const dto = plainToInstance(OrderItemDto, {
      product_id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 0,
    });
    const errors = await validate(dto);
    const qtyError = errors.find((e) => e.property === 'quantity');
    expect(qtyError).toBeDefined();
  });

  it('수량이 음수면 에러', async () => {
    const dto = plainToInstance(OrderItemDto, {
      product_id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: -1,
    });
    const errors = await validate(dto);
    const qtyError = errors.find((e) => e.property === 'quantity');
    expect(qtyError).toBeDefined();
  });
});

describe('CreateOrderDto', () => {
  const validItem = {
    product_id: '550e8400-e29b-41d4-a716-446655440000',
    quantity: 2,
  };

  const validData = {
    items: [validItem],
    delivery_address: '서울특별시 마포구 합정동 123-45',
    delivery_date: '2025-04-03',
    is_cold: false,
  };

  it('올바른 데이터는 통과', async () => {
    const dto = plainToInstance(CreateOrderDto, validData);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('여러 상품도 통과', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      ...validData,
      items: [
        validItem,
        {
          product_id: '660e8400-e29b-41d4-a716-446655440000',
          quantity: 5,
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('items', () => {
    it('빈 배열이면 에러', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        ...validData,
        items: [],
      });
      const errors = await validate(dto);
      const itemsError = errors.find((e) => e.property === 'items');
      expect(itemsError).toBeDefined();
    });

    it('items가 없으면 에러', async () => {
      const { items: _unusedItems, ...rest } = validData;
      void _unusedItems;
      const dto = plainToInstance(CreateOrderDto, rest);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('delivery_address', () => {
    it('빈 문자열이면 에러', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        ...validData,
        delivery_address: '',
      });
      const errors = await validate(dto);
      const addrError = errors.find((e) => e.property === 'delivery_address');
      expect(addrError).toBeDefined();
    });
  });

  describe('delivery_date', () => {
    it('Optional이므로 없어도 통과', async () => {
      const { delivery_date: _unusedDate, ...rest } = validData;
      void _unusedDate;
      const dto = plainToInstance(CreateOrderDto, rest);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('잘못된 날짜 형식이면 에러', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        ...validData,
        delivery_date: '2025/04/03',
      });
      const errors = await validate(dto);
      const dateError = errors.find((e) => e.property === 'delivery_date');
      expect(dateError).toBeDefined();
    });
  });

  describe('is_cold', () => {
    it('Optional이므로 없어도 통과', async () => {
      const { is_cold: _unusedCold, ...rest } = validData;
      void _unusedCold;
      const dto = plainToInstance(CreateOrderDto, rest);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('문자열이면 에러', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        ...validData,
        is_cold: 'yes',
      });
      const errors = await validate(dto);
      const coldError = errors.find((e) => e.property === 'is_cold');
      expect(coldError).toBeDefined();
    });
  });
});
