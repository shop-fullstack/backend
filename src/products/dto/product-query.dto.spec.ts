import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ProductQueryDto } from './product-query.dto';

describe('ProductQueryDto', () => {
  it('빈 쿼리는 기본값으로 통과', async () => {
    const dto = plainToInstance(ProductQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.sort).toBe('latest');
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('모든 파라미터가 올바르면 통과', async () => {
    const dto = plainToInstance(ProductQueryDto, {
      category: '식자재',
      sort: 'popular',
      search: '커피',
      page: 2,
      limit: 10,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('sort', () => {
    it.each(['latest', 'popular', 'price_asc', 'price_desc'])(
      '"%s"는 통과',
      async (sort) => {
        const dto = plainToInstance(ProductQueryDto, { sort });
        const errors = await validate(dto);
        const sortError = errors.find((e) => e.property === 'sort');
        expect(sortError).toBeUndefined();
      },
    );

    it('허용되지 않은 값이면 에러', async () => {
      const dto = plainToInstance(ProductQueryDto, { sort: 'invalid' });
      const errors = await validate(dto);
      const sortError = errors.find((e) => e.property === 'sort');
      expect(sortError).toBeDefined();
    });
  });

  describe('page', () => {
    it('0이면 에러 (최소 1)', async () => {
      const dto = plainToInstance(ProductQueryDto, { page: 0 });
      const errors = await validate(dto);
      const pageError = errors.find((e) => e.property === 'page');
      expect(pageError).toBeDefined();
    });

    it('음수면 에러', async () => {
      const dto = plainToInstance(ProductQueryDto, { page: -1 });
      const errors = await validate(dto);
      const pageError = errors.find((e) => e.property === 'page');
      expect(pageError).toBeDefined();
    });
  });

  describe('limit', () => {
    it('0이면 에러 (최소 1)', async () => {
      const dto = plainToInstance(ProductQueryDto, { limit: 0 });
      const errors = await validate(dto);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeDefined();
    });

    it('101이면 에러 (최대 100)', async () => {
      const dto = plainToInstance(ProductQueryDto, { limit: 101 });
      const errors = await validate(dto);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeDefined();
    });

    it('100은 통과', async () => {
      const dto = plainToInstance(ProductQueryDto, { limit: 100 });
      const errors = await validate(dto);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeUndefined();
    });
  });
});
