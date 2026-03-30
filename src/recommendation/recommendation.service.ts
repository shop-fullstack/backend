import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

interface BusinessTypeProductStat {
  product_id: string;
  name: string;
  category: string;
  order_count: number;
  total_qty: number;
  buyer_count: number;
  price_per_box: number;
}

interface PurchaseHistoryRow {
  product_id: string;
  name: string;
  category: string;
  purchase_count: number;
  total_qty: number;
  last_purchased: string;
  avg_interval_days: number;
  price_per_box: number;
}

@Injectable()
export class RecommendationService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getRecommendations(userId: string, limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    // 1. 유저의 업종 조회
    const { data: user, error: userError } = await supabase
      .from('shop_users')
      .select('id, business_type')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다');
    }

    const typedUser = user as { id: string; business_type: string };

    // 2. 같은 업종 유저들이 많이 사는 상품 조회
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_business_type_product_stats',
      {
        p_business_type: typedUser.business_type,
        p_limit: limit,
      },
    );

    if (statsError) {
      throw new BadRequestException(statsError.message);
    }

    const products = (stats as BusinessTypeProductStat[]) || [];

    // 3. 추천 점수 계산
    const maxOrderCount = Math.max(...products.map((p) => p.order_count), 1);
    const maxBuyerCount = Math.max(...products.map((p) => p.buyer_count), 1);

    const items = products.map((p) => {
      const orderScore = p.order_count / maxOrderCount;
      const buyerScore = p.buyer_count / maxBuyerCount;
      const score =
        Math.round((orderScore * 0.5 + buyerScore * 0.5) * 100) / 100;

      return {
        product_id: p.product_id,
        name: p.name,
        category: p.category,
        price_per_box: p.price_per_box,
        reason: 'business_type_trend' as const,
        score,
      };
    });

    return {
      business_type: typedUser.business_type,
      items,
    };
  }

  async getReorderSuggestions(userId: string, limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_user_purchase_history', {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const purchases = (data as PurchaseHistoryRow[]) || [];

    if (purchases.length === 0) return [];

    const now = new Date();

    return purchases.map((p) => {
      const lastPurchased = new Date(p.last_purchased);
      const daysSince = Math.floor(
        (now.getTime() - lastPurchased.getTime()) / (1000 * 60 * 60 * 24),
      );
      const avgInterval = Math.max(p.avg_interval_days, 1);

      // 긴급도: 마지막 구매 후 경과일 / 평균 주문 간격
      const ratio = daysSince / avgInterval;
      let urgency: 'high' | 'medium' | 'low';
      if (ratio >= 1.2) {
        urgency = 'high';
      } else if (ratio >= 0.8) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }

      return {
        product_id: p.product_id,
        name: p.name,
        category: p.category,
        price_per_box: p.price_per_box,
        purchase_count: p.purchase_count,
        days_since_last_order: daysSince,
        avg_interval_days: Math.round(avgInterval),
        urgency,
      };
    });
  }
}
