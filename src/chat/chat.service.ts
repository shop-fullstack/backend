import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SupabaseService } from '../common/supabase/supabase.service';
import { randomUUID } from 'crypto';

interface ProductStat {
  product_id: string;
  name: string;
  category: string;
  order_count: number;
  total_qty: number;
  buyer_count: number;
  price_per_box: number;
}

interface ChatContext {
  business_type: string;
  cart_count: number;
}

export interface ChatProduct {
  id: string;
  name: string;
  category: string;
  price_per_box: number;
}

export interface ChatAction {
  type: 'view_product' | 'add_to_cart' | 'view_order' | 'view_trend';
  label: string;
  payload: string;
}

@Injectable()
export class ChatService {
  private readonly ai: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    });
  }

  async chat(
    message: string,
    context: ChatContext,
  ): Promise<{
    id: string;
    role: 'assistant';
    content: string;
    timestamp: string;
    products?: ChatProduct[];
    action?: ChatAction;
  }> {
    if (!message || message.trim() === '') {
      throw new BadRequestException('메시지를 입력해주세요');
    }

    // 업종 기반 인기 상품 조회 (챗봇 컨텍스트용)
    let productContext = '';
    let products: ChatProduct[] | undefined;

    if (context.business_type) {
      const supabase = this.supabaseService.getClient();
      const { data } = await supabase.rpc('get_business_type_product_stats', {
        p_business_type: context.business_type,
        p_limit: 5,
      });

      const stats = (data as ProductStat[]) || [];

      if (stats.length > 0) {
        productContext = `\n\n[${context.business_type} 업종 인기 상품]\n${stats
          .map(
            (p, i) =>
              `${i + 1}. ${p.name} (${p.category}) - ${p.price_per_box.toLocaleString()}원/박스, 주문 ${p.order_count}건`,
          )
          .join('\n')}`;

        products = stats.map((p) => ({
          id: p.product_id,
          name: p.name,
          category: p.category,
          price_per_box: p.price_per_box,
        }));
      }
    }

    const systemPrompt = `당신은 비즈마트(BizMart) B2B 도매 플랫폼의 AI 어시스턴트입니다.
소상공인 사장님들에게 상품 추천, 트렌드 분석, 주문 도움을 제공합니다.

규칙:
- 한국어로 친근하고 전문적으로 답변하세요
- 답변은 3~4문장으로 간결하게
- 상품 추천 시 구체적인 상품명과 가격을 언급하세요
- 업종 특성에 맞는 맞춤 조언을 제공하세요
${context.business_type ? `\n사용자 업종: ${context.business_type}` : ''}
${context.cart_count > 0 ? `장바구니 상품 수: ${context.cart_count}개` : ''}
${productContext}`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [
            { text: '네, 비즈마트 AI 어시스턴트로서 도움 드리겠습니다.' },
          ],
        },
        { role: 'user', parts: [{ text: message }] },
      ],
    });

    const content = response.text || '죄송합니다, 응답을 생성하지 못했습니다.';

    // 메시지 내용에 따라 action 결정
    const action = this.determineAction(message);

    return {
      id: randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      ...(products && products.length > 0 ? { products } : {}),
      ...(action ? { action } : {}),
    };
  }

  private determineAction(message: string): ChatAction | undefined {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('추천') || lowerMsg.includes('인기')) {
      return {
        type: 'view_trend',
        label: '트렌드 보기',
        payload: '/trend',
      };
    }

    if (lowerMsg.includes('주문') || lowerMsg.includes('배송')) {
      return {
        type: 'view_order',
        label: '주문 내역 보기',
        payload: '/orders',
      };
    }

    return undefined;
  }
}
