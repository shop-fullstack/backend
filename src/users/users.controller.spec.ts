import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    findMe: jest.fn(),
    updateMe: jest.fn(),
  };

  const mockJwtPayload = { id: 'uuid-1', email: 'test@bizmart.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findMe', () => {
    it('JWT 페이로드에서 userId를 추출하여 서비스를 호출해야 한다', async () => {
      const expected = { id: 'uuid-1', email: 'test@bizmart.com' };
      mockUsersService.findMe.mockResolvedValue(expected);

      const result = await controller.findMe(mockJwtPayload);

      expect(result).toEqual(expected);
      expect(usersService.findMe).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('updateMe', () => {
    it('JWT 페이로드의 userId와 DTO로 서비스를 호출해야 한다', async () => {
      const dto = { company_name: '새 카페' };
      const expected = { id: 'uuid-1', company_name: '새 카페' };
      mockUsersService.updateMe.mockResolvedValue(expected);

      const result = await controller.updateMe(mockJwtPayload, dto);

      expect(result).toEqual(expected);
      expect(usersService.updateMe).toHaveBeenCalledWith('uuid-1', dto);
    });
  });
});
