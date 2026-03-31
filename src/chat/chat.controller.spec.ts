import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: ChatService;

  const mockChatService = {
    chat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get<ChatService>(ChatService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('chat', () => {
    it('message와 context를 서비스에 전달해야 한다', async () => {
      const dto = {
        message: '추천해줘',
        context: { business_type: '카페/베이커리', cart_count: 3 },
      };
      const expected = {
        id: 'chat-uuid',
        role: 'assistant',
        content: '추천 드립니다!',
        timestamp: '2026-03-31T00:00:00Z',
      };
      mockChatService.chat.mockResolvedValue(expected);

      const result = await controller.chat(dto);

      expect(result).toEqual(expected);
      expect(chatService.chat).toHaveBeenCalledWith('추천해줘', {
        business_type: '카페/베이커리',
        cart_count: 3,
      });
    });
  });
});
