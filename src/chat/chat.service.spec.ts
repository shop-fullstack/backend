import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SupabaseService } from '../common/supabase/supabase.service';
import { createMockSupabaseClient } from '../common/test/supabase-mock.helper';

// @google/genai 모킹
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: '안녕하세요! 카페 운영에 도움이 필요하시군요. 원두커피와 종이컵을 추천드립니다.',
      }),
    },
  })),
}));

describe('ChatService', () => {
  let service: ChatService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: SupabaseService,
          useValue: { getClient: () => mockClient },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-gemini-key'),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('chat', () => {
    it('Gemini 응답을 프론트 스펙 형식으로 반환해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [
          {
            product_id: 'prod-1',
            name: '원두커피',
            category: '식자재',
            order_count: 50,
            total_qty: 200,
            buyer_count: 15,
            price_per_box: 25000,
          },
        ],
        error: null,
      });

      const result = await service.chat('추천해줘', {
        business_type: '카페/베이커리',
        cart_count: 0,
      });

      expect(result).toHaveProperty('id');
      expect(result.role).toBe('assistant');
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.timestamp).toBeDefined();
    });

    it('상품 관련 질문 시 products 배열을 포함할 수 있어야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [
          {
            product_id: 'prod-1',
            name: '원두커피',
            category: '식자재',
            order_count: 50,
            total_qty: 200,
            buyer_count: 15,
            price_per_box: 25000,
          },
        ],
        error: null,
      });

      const result = await service.chat('인기 상품 뭐야?', {
        business_type: '카페/베이커리',
        cart_count: 0,
      });

      expect(result.role).toBe('assistant');
      // products는 optional이므로 있으면 배열
      if (result.products) {
        expect(Array.isArray(result.products)).toBe(true);
      }
    });

    it('빈 메시지를 보내면 BadRequestException을 던져야 한다', async () => {
      await expect(
        service.chat('', { business_type: '카페/베이커리', cart_count: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('context 없이도 동작해야 한다', async () => {
      mockClient.rpc = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.chat('안녕', {
        business_type: '',
        cart_count: 0,
      });

      expect(result.role).toBe('assistant');
      expect(result.content).toBeDefined();
    });
  });
});
