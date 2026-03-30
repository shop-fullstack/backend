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

  /**
   * 프론트엔드 스펙 맞춤: GET /recommend?business_type=X
   * full product 객체 + reason(한글) + score(0-100) + reason_type 반환
   */
  async getRecommendForFrontend(businessType: string) {
    const supabase = this.supabaseService.getClient();

    // 업종별 인기 상품 조회
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_business_type_product_stats',
      { p_business_type: businessType, p_limit: 8 },
    );

    if (statsError) {
      throw new BadRequestException(statsError.message);
    }

    const products = (stats as BusinessTypeProductStat[]) || [];

    // 트렌드 상품 조회
    const { data: trendData } = await supabase.rpc('get_trend_report', {
      p_period: 'weekly',
      p_limit: 8,
    });

    interface TrendItem {
      product_id: string;
      change: string;
    }
    const trendingIds = new Set(
      ((trendData as TrendItem[]) || [])
        .filter((t) => t.change === 'up' || t.change === 'new')
        .map((t) => t.product_id),
    );

    const maxOrderCount = Math.max(...products.map((p) => p.order_count), 1);
    const maxBuyerCount = Math.max(...products.map((p) => p.buyer_count), 1);

    const items = products.map((p) => {
      const isTrending = trendingIds.has(p.product_id);
      const orderScore = p.order_count / maxOrderCount;
      const buyerScore = p.buyer_count / maxBuyerCount;
      const baseScore = orderScore * 0.5 + buyerScore * 0.5;

      let reasonType:
        | 'business_type'
        | 'trending'
        | 'order_history'
        | 'similar';
      let reason: string;
      let score: number;

      if (isTrending) {
        reasonType = 'trending';
        reason = '최근 트렌드 상승 상품';
        score = Math.round(Math.min(60 + baseScore * 30, 90));
      } else {
        reasonType = 'business_type';
        reason = '업종 인기 상품';
        score = Math.round(Math.min(75 + baseScore * 25, 100));
      }

      return {
        product: {
          id: p.product_id,
          name: p.name,
          category: p.category,
          price_per_unit: 0,
          price_per_box: p.price_per_box,
          moq: 1,
          image_url: `https://placehold.co/400x400?text=${encodeURIComponent(p.name.slice(0, 6))}`,
        },
        reason,
        score,
        reason_type: reasonType,
      };
    });

    // score 내림차순, 최대 8개
    items.sort((a, b) => b.score - a.score);

    return {
      user_business_type: businessType,
      items: items.slice(0, 8),
      generated_at: new Date().toISOString(),
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
