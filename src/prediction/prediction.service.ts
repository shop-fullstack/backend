import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { linearRegression, extrapolate } from './algorithms/linear-regression';
import { weightedMovingAverage } from './algorithms/moving-average';

interface DemandHistoryRow {
  order_date: string;
  total_qty: number;
}

interface BusinessTypeProductStat {
  product_id: string;
  name: string;
  category: string;
  order_count: number;
  total_qty: number;
  buyer_count: number;
  price_per_box: number;
}

@Injectable()
export class PredictionService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getForecast(productId: string, days: number = 30) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_demand_history', {
      p_product_id: productId,
      p_days: 90,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const history = (data as DemandHistoryRow[]) || [];

    if (history.length === 0) {
      return {
        product_id: productId,
        forecast_days: days,
        daily_predictions: Array(days).fill(0) as number[],
        trend: 'stable' as const,
        confidence: 0,
        avg_daily_demand: 0,
      };
    }

    const quantities = history.map((h) => Number(h.total_qty));
    const avg = quantities.reduce((sum, v) => sum + v, 0) / quantities.length;

    // 주 단위 이동평균으로 노이즈 제거
    const smoothed =
      quantities.length >= 7
        ? weightedMovingAverage(quantities, 7)
        : quantities;

    // 선형 회귀로 추세 분석
    const model = linearRegression(smoothed);

    // 미래 예측
    const rawPredictions = extrapolate(model, days, smoothed.length);
    const dailyPredictions = rawPredictions.map((v) =>
      Math.round(Math.max(0, v)),
    );

    // 추세 판단
    const slopeThreshold = 0.1;
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (model.slope > slopeThreshold) {
      trend = 'increasing';
    } else if (model.slope < -slopeThreshold) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // 신뢰도: 데이터 분산 기반 (0~1)
    const variance =
      quantities.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
      quantities.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
    const confidence = Math.round(Math.max(0, Math.min(1, 1 - cv)) * 100) / 100;

    return {
      product_id: productId,
      forecast_days: days,
      daily_predictions: dailyPredictions,
      trend,
      confidence,
      avg_daily_demand: Math.round(avg * 100) / 100,
    };
  }

  async getRestockByUserId(userId: string, limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    const { data: user } = await supabase
      .from('shop_users')
      .select('business_type')
      .eq('id', userId)
      .single();

    const businessType =
      (user as { business_type: string } | null)?.business_type ||
      '카페/베이커리';

    return this.getRestock(businessType, limit);
  }

  async getRestock(businessType: string, limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc(
      'get_business_type_product_stats',
      {
        p_business_type: businessType,
        p_limit: limit,
      },
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    const stats = (data as BusinessTypeProductStat[]) || [];

    return stats.map((stat) => {
      // 재입고 점수: 주문빈도 + 구매자수 기반
      const frequencyScore = Math.min(stat.order_count / 50, 1);
      const popularityScore = Math.min(stat.buyer_count / 10, 1);
      const restockScore =
        Math.round((frequencyScore * 0.6 + popularityScore * 0.4) * 100) / 100;

      return {
        product_id: stat.product_id,
        name: stat.name,
        category: stat.category,
        order_count: stat.order_count,
        total_qty: stat.total_qty,
        buyer_count: stat.buyer_count,
        price_per_box: stat.price_per_box,
        restock_score: restockScore,
      };
    });
  }
}
