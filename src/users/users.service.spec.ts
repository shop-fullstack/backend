import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
} from '../common/test/supabase-mock.helper';

describe('UsersService', () => {
  let service: UsersService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  const mockUser = {
    id: 'uuid-1',
    email: 'test@bizmart.com',
    business_number: '220-81-62517',
    business_type: '카페/베이커리',
    company_name: '하늘빛 카페',
    owner_name: '김민준',
    grade: '일반',
    created_at: '2025-03-27T00:00:00Z',
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findMe', () => {
    it('유저 정보를 반환해야 한다 (password 제외)', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockUser,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.findMe('uuid-1');

      expect(result).toEqual(mockUser);
      expect(mockClient.from).toHaveBeenCalledWith('shop_users');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'uuid-1');
    });

    it('유저가 없으면 NotFoundException을 던져야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await expect(service.findMe('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findMe('nonexistent-id')).rejects.toThrow(
        '사용자를 찾을 수 없습니다',
      );
    });

    it('select에 password를 포함하지 않아야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockUser,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await service.findMe('uuid-1');

      const selectArg = queryBuilder.select.mock.calls[0][0] as string;
      expect(selectArg).not.toContain('password');
      expect(selectArg).toContain('email');
      expect(selectArg).toContain('grade');
    });
  });

  describe('updateMe', () => {
    it('유저 정보를 수정하고 수정된 정보를 반환해야 한다', async () => {
      const updatedUser = { ...mockUser, company_name: '새로운 카페' };
      const queryBuilder = createMockQueryBuilder({
        data: updatedUser,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const dto = { company_name: '새로운 카페' };
      const result = await service.updateMe('uuid-1', dto);

      expect(result).toEqual(updatedUser);
      expect(queryBuilder.update).toHaveBeenCalledWith(dto);
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'uuid-1');
    });

    it('여러 필드를 동시에 수정할 수 있어야 한다', async () => {
      const dto = {
        company_name: '새 카페',
        business_type: '식당/외식업',
        owner_name: '홍길동',
      };
      const queryBuilder = createMockQueryBuilder({
        data: { ...mockUser, ...dto },
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.updateMe('uuid-1', dto);

      expect(result.company_name).toBe('새 카페');
      expect(queryBuilder.update).toHaveBeenCalledWith(dto);
    });

    it('유저가 없으면 NotFoundException을 던져야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'not found' },
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      await expect(
        service.updateMe('nonexistent-id', { company_name: '카페' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('빈 dto로 호출해도 동작해야 한다', async () => {
      const queryBuilder = createMockQueryBuilder({
        data: mockUser,
        error: null,
      });
      mockClient.from = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.updateMe('uuid-1', {});

      expect(result).toEqual(mockUser);
      expect(queryBuilder.update).toHaveBeenCalledWith({});
    });
  });
});
