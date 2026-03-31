import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { GeminiService } from '../common/gemini/gemini.service';
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
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly geminiService: GeminiService,
  ) {}

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

  /**
   * 프론트엔드 스펙 맞춤: GET /forecast?business_type=X
   * 상품 6개 × 주간 4주 예측 + 신뢰구간
   */
  async getForecastForFrontend(businessType: string) {
    const supabase = this.supabaseService.getClient();

    // 1. 해당 업종에서 인기 상품 6개 조회
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_business_type_product_stats',
      { p_business_type: businessType, p_limit: 6 },
    );

    if (statsError) {
      throw new BadRequestException(statsError.message);
    }

    const products = (stats as BusinessTypeProductStat[]) || [];

    // 2. 각 상품별 수요 이력 + 예측
    const forecasts = await Promise.all(
      products.map(async (product) => {
        const { data: history } = await supabase.rpc('get_demand_history', {
          p_product_id: product.product_id,
          p_days: 56, // 8주 데이터
        });

        const rows = (history as DemandHistoryRow[]) || [];
        const quantities = rows.map((h) => Number(h.total_qty));

        // 주간 합산 (7일씩)
        const weeklyData: number[] = [];
        for (let i = 0; i < quantities.length; i += 7) {
          const week = quantities.slice(i, i + 7);
          weeklyData.push(week.reduce((s, v) => s + v, 0));
        }

        const recentWeeklyAvg =
          weeklyData.length > 0
            ? weeklyData.reduce((s, v) => s + v, 0) / weeklyData.length
            : 0;

        // 선형 회귀로 주간 예측
        const model = linearRegression(weeklyData);
        const rawPredictions = extrapolate(model, 4, weeklyData.length);

        // 신뢰구간: 표준편차 기반
        const variance =
          weeklyData.length > 0
            ? weeklyData.reduce(
                (sum, v) => sum + Math.pow(v - recentWeeklyAvg, 2),
                0,
              ) / weeklyData.length
            : 0;
        const stdDev = Math.sqrt(variance);

        // 4주 예측 + 날짜 라벨
        const today = new Date();
        const forecast = rawPredictions.map((predicted, i) => {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() + i * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          const predictedOrders = Math.round(Math.max(0, predicted));

          return {
            week_label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
            predicted_orders: predictedOrders,
            confidence_low: Math.round(Math.max(0, predicted - stdDev * 1.2)),
            confidence_high: Math.round(Math.max(0, predicted + stdDev * 1.2)),
          };
        });

        // 추세 판단
        const changePercent =
          recentWeeklyAvg > 0
            ? Math.round(
                ((rawPredictions[0] - recentWeeklyAvg) / recentWeeklyAvg) * 100,
              )
            : 0;

        let trend: 'rising' | 'stable' | 'declining';
        if (changePercent > 5) trend = 'rising';
        else if (changePercent < -5) trend = 'declining';
        else trend = 'stable';

        return {
          product_id: product.product_id,
          product_name: product.name,
          category: product.category,
          current_weekly_avg: Math.round(recentWeeklyAvg),
          forecast,
          trend,
          change_percent: changePercent,
        };
      }),
    );

    // Gemini AI 인사이트 생성
    const dataContext = forecasts
      .map(
        (f) =>
          `${f.product_name} (${f.category}): 주간평균 ${f.current_weekly_avg}건, 추세 ${f.trend}, 변화율 ${f.change_percent}%`,
      )
      .join('\n');

    const aiInsight = await this.geminiService.getInsight(
      `당신은 B2B 도매 플랫폼의 수요 예측 분석가입니다. ${businessType} 업종의 향후 4주 수요 예측 데이터를 분석해주세요.
규칙: 한국어, 4~5문장, 상승/하락 상품을 짚어주고 재고 관리 조언을 구체적으로 제공`,
      dataContext,
      `${businessType} 업종의 수요 예측 결과를 분석하고, 사장님에게 재고 관리 조언을 해주세요.`,
    );

    return {
      business_type: businessType,
      period: '4주',
      forecasts,
      ai_insight: aiInsight,
      generated_at: new Date().toISOString(),
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
