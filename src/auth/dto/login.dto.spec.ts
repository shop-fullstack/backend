import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('올바른 데이터는 검증을 통과해야 한다', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'test@bizmart.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('이메일 형식이 아니면 에러', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'invalid',
      password: 'password123',
    });
    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError?.constraints).toHaveProperty('isEmail');
  });

  it('비밀번호 8자 미만이면 에러', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'test@bizmart.com',
      password: 'short',
    });
    const errors = await validate(dto);
    const pwError = errors.find((e) => e.property === 'password');
    expect(pwError?.constraints).toHaveProperty('minLength');
  });

  it('모든 필드가 누락되면 에러', async () => {
    const dto = plainToInstance(LoginDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
