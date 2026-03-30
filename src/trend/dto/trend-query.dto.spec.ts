import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TrendReportQueryDto, TrendBestQueryDto } from './trend-query.dto';

describe('TrendReportQueryDto', () => {
  it('빈 쿼리는 기본값으로 통과', async () => {
    const dto = plainToInstance(TrendReportQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.period).toBe('weekly');
    expect(dto.limit).toBe(10);
  });

  describe('period', () => {
    it('"weekly"는 통과', async () => {
      const dto = plainToInstance(TrendReportQueryDto, { period: 'weekly' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('"monthly"는 통과', async () => {
      const dto = plainToInstance(TrendReportQueryDto, { period: 'monthly' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('허용되지 않은 값이면 에러', async () => {
      const dto = plainToInstance(TrendReportQueryDto, { period: 'daily' });
      const errors = await validate(dto);
      const periodError = errors.find((e) => e.property === 'period');
      expect(periodError).toBeDefined();
    });
  });

  describe('limit', () => {
    it('0이면 에러 (최소 1)', async () => {
      const dto = plainToInstance(TrendReportQueryDto, { limit: 0 });
      const errors = await validate(dto);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeDefined();
    });

    it('51이면 에러 (최대 50)', async () => {
      const dto = plainToInstance(TrendReportQueryDto, { limit: 51 });
      const errors = await validate(dto);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeDefined();
    });

    it('50은 통과', async () => {
      const dto = plainToInstance(TrendReportQueryDto, { limit: 50 });
      const errors = await validate(dto);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeUndefined();
    });
  });
});

describe('TrendBestQueryDto', () => {
  it('올바른 데이터는 통과', async () => {
    const dto = plainToInstance(TrendBestQueryDto, { type: '카페/베이커리' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('type', () => {
    it('비어있으면 에러 (필수)', async () => {
      const dto = plainToInstance(TrendBestQueryDto, { type: '' });
      const errors = await validate(dto);
      const typeError = errors.find((e) => e.property === 'type');
      expect(typeError).toBeDefined();
    });

    it('누락되면 에러', async () => {
      const dto = plainToInstance(TrendBestQueryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('limit', () => {
    it('Optional이므로 없어도 통과 (기본값 10)', async () => {
      const dto = plainToInstance(TrendBestQueryDto, {
        type: '카페/베이커리',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(10);
    });

    it('51이면 에러', async () => {
      const dto = plainToInstance(TrendBestQueryDto, {
        type: '카페/베이커리',
        limit: 51,
      });
      const errors = await validate(dto);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeDefined();
    });
  });
});
