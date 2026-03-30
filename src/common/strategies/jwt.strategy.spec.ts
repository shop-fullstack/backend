import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(mockConfigService);
  });

  describe('validate', () => {
    it('payload의 sub을 id로, email을 그대로 변환해야 한다', () => {
      const payload = { sub: 'user-uuid-123', email: 'test@bizmart.com' };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-uuid-123',
        email: 'test@bizmart.com',
      });
    });

    it('다른 payload에 대해서도 정확히 변환해야 한다', () => {
      const payload = { sub: 'another-uuid', email: 'admin@bizmart.com' };

      const result = strategy.validate(payload);

      expect(result.id).toBe('another-uuid');
      expect(result.email).toBe('admin@bizmart.com');
    });

    it('JwtPayload 타입의 객체를 반환해야 한다', () => {
      const result = strategy.validate({
        sub: 'uuid',
        email: 'user@test.com',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).not.toHaveProperty('sub');
    });
  });
});
