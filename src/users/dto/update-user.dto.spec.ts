import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('모든 필드가 Optional이므로 빈 객체도 통과', async () => {
    const dto = plainToInstance(UpdateUserDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('올바른 문자열 필드는 통과', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      company_name: '새 카페',
      business_type: '식당/외식업',
      owner_name: '홍길동',
      business_number: '123-45-67890',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('company_name이 숫자이면 에러', async () => {
    const dto = plainToInstance(UpdateUserDto, { company_name: 12345 });
    const errors = await validate(dto);
    const cnError = errors.find((e) => e.property === 'company_name');
    expect(cnError).toBeDefined();
  });

  it('일부 필드만 보내도 통과', async () => {
    const dto = plainToInstance(UpdateUserDto, { owner_name: '김철수' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
