import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('AuthService.register를 호출하고 결과를 반환해야 한다', async () => {
      const dto = {
        email: 'test@bizmart.com',
        password: 'password123',
        business_number: '220-81-62517',
        business_type: '카페/베이커리',
        company_name: '하늘빛 카페',
        owner_name: '김민준',
      };
      const expected = {
        message: '회원가입이 완료되었습니다',
        data: { access_token: 'token', user: { id: 'uuid-1' } },
      };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(result).toEqual(expected);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('AuthService.login을 호출하고 결과를 반환해야 한다', async () => {
      const dto = { email: 'test@bizmart.com', password: 'password123' };
      const expected = {
        message: '로그인 되었습니다',
        data: { access_token: 'token', user: { id: 'uuid-1' } },
      };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(result).toEqual(expected);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('로그아웃 메시지를 반환해야 한다', () => {
      const result = controller.logout();

      expect(result).toEqual({
        message: '로그아웃 되었습니다',
        data: null,
      });
    });

    it('서비스를 호출하지 않아야 한다 (stateless)', () => {
      controller.logout();

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });
});
