import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const validData = {
    email: 'test@bizmart.com',
    password: 'password123',
    business_number: '220-81-62517',
    business_type: '카페/베이커리',
    company_name: '하늘빛 카페',
    owner_name: '김민준',
  };

  it('올바른 데이터는 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(RegisterDto, validData);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  describe('email', () => {
    it('이메일 형식이 아니면 에러', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        email: 'not-email',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError?.constraints).toHaveProperty('isEmail');
    });

    it('빈 문자열이면 에러', async () => {
      const dto = plainToInstance(RegisterDto, { ...validData, email: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('password', () => {
    it('8자 미만이면 에러', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: '1234567',
      });
      const errors = await validate(dto);
      const pwError = errors.find((e) => e.property === 'password');
      expect(pwError?.constraints).toHaveProperty('minLength');
    });

    it('정확히 8자는 통과', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: '12345678',
      });
      const errors = await validate(dto);
      const pwError = errors.find((e) => e.property === 'password');
      expect(pwError).toBeUndefined();
    });
  });

  describe('business_number', () => {
    it('빈 문자열이면 에러', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        business_number: '',
      });
      const errors = await validate(dto);
      const bnError = errors.find((e) => e.property === 'business_number');
      expect(bnError).toBeDefined();
    });
  });

  describe('business_type', () => {
    it('빈 문자열이면 에러', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        business_type: '',
      });
      const errors = await validate(dto);
      const btError = errors.find((e) => e.property === 'business_type');
      expect(btError).toBeDefined();
    });
  });

  describe('company_name', () => {
    it('빈 문자열이면 에러', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        company_name: '',
      });
      const errors = await validate(dto);
      const cnError = errors.find((e) => e.property === 'company_name');
      expect(cnError).toBeDefined();
    });
  });

  describe('owner_name', () => {
    it('빈 문자열이면 에러', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        owner_name: '',
      });
      const errors = await validate(dto);
      const onError = errors.find((e) => e.property === 'owner_name');
      expect(onError).toBeDefined();
    });
  });

  it('필수 필드가 누락되면 에러', async () => {
    const dto = plainToInstance(RegisterDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(6);
  });
});
