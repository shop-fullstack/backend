import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
} from '../common/test/supabase-mock.helper';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;
  let jwtService: JwtService;

  const mockRegisterDto = {
    email: 'test@bizmart.com',
    password: 'password123',
    business_number: '220-81-62517',
    business_type: '카페/베이커리',
    company_name: '하늘빛 카페',
    owner_name: '김민준',
  };

  const mockLoginDto = {
    email: 'test@bizmart.com',
    password: 'password123',
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('신규 유저를 등록하고 JWT를 반환해야 한다', async () => {
      // 이메일 중복 확인 — 없음
      const emailCheckBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      // 유저 생성
      const insertBuilder = createMockQueryBuilder({
        data: {
          id: 'uuid-1',
          email: mockRegisterDto.email,
          business_number: '220-81-62517',
          business_type: '카페/베이커리',
          company_name: '하늘빛 카페',
          owner_name: '김민준',
          grade: '일반',
          created_at: '2025-03-27T00:00:00Z',
        },
        error: null,
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(emailCheckBuilder)
        .mockReturnValueOnce(insertBuilder);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(mockRegisterDto);

      expect(result.message).toBe('회원가입이 완료되었습니다');
      expect(result.data.access_token).toBe('mock-jwt-token');
      expect(result.data.user.email).toBe(mockRegisterDto.email);
      expect(result.data.user.grade).toBe('일반');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-1',
        email: mockRegisterDto.email,
      });
    });

    it('중복 이메일이면 BadRequestException을 던져야 한다', async () => {
      const emailCheckBuilder = createMockQueryBuilder({
        data: { id: 'existing-uuid' },
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(emailCheckBuilder);

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        '이미 등록된 이메일입니다',
      );
    });

    it('DB insert 에러 시 BadRequestException을 던져야 한다', async () => {
      const emailCheckBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      const insertBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'DB 오류' },
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(emailCheckBuilder)
        .mockReturnValueOnce(insertBuilder);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('error 없이 user가 null이면 기본 에러 메시지를 사용해야 한다', async () => {
      const emailCheckBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      const insertBuilder = createMockQueryBuilder({
        data: null,
        error: null,
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(emailCheckBuilder)
        .mockReturnValueOnce(insertBuilder);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        '회원가입 처리 중 오류가 발생했습니다',
      );
    });

    it('비밀번호를 bcrypt로 해싱해야 한다', async () => {
      const emailCheckBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      const insertBuilder = createMockQueryBuilder({
        data: {
          id: 'uuid-1',
          email: mockRegisterDto.email,
          business_number: '220-81-62517',
          business_type: '카페/베이커리',
          company_name: '하늘빛 카페',
          owner_name: '김민준',
          grade: '일반',
          created_at: '2025-03-27T00:00:00Z',
        },
        error: null,
      });

      mockClient.from = jest
        .fn()
        .mockReturnValueOnce(emailCheckBuilder)
        .mockReturnValueOnce(insertBuilder);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register(mockRegisterDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('login', () => {
    it('올바른 자격 증명으로 JWT를 반환해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: {
          id: 'uuid-1',
          email: mockLoginDto.email,
          password: 'hashed-password',
          business_number: '220-81-62517',
          business_type: '카페/베이커리',
          company_name: '하늘빛 카페',
          owner_name: '김민준',
          grade: '일반',
          created_at: '2025-03-27T00:00:00Z',
        },
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(mockLoginDto);

      expect(result.message).toBe('로그인 되었습니다');
      expect(result.data.access_token).toBe('mock-jwt-token');
      expect(result.data.user.email).toBe(mockLoginDto.email);
      expect(result.data.user.company_name).toBe('하늘빛 카페');
    });

    it('존재하지 않는 이메일이면 UnauthorizedException을 던져야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    });

    it('비밀번호 불일치 시 UnauthorizedException을 던져야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: {
          id: 'uuid-1',
          email: mockLoginDto.email,
          password: 'hashed-password',
          business_number: '220-81-62517',
          business_type: '카페/베이커리',
          company_name: '하늘빛 카페',
          owner_name: '김민준',
          grade: '일반',
          created_at: '2025-03-27T00:00:00Z',
        },
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('bcrypt.compare를 올바른 인자로 호출해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: {
          id: 'uuid-1',
          email: mockLoginDto.email,
          password: 'stored-hash',
          business_number: '220-81-62517',
          business_type: '카페/베이커리',
          company_name: '카페',
          owner_name: '김민준',
          grade: '일반',
          created_at: '2025-03-27T00:00:00Z',
        },
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(mockLoginDto);

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'stored-hash');
    });
  });
});
