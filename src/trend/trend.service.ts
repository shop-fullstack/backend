import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { GeminiService } from '../common/gemini/gemini.service';
import { TrendReportItem, TrendBestItem } from '../common/types/database.types';

@Injectable()
export class TrendService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly geminiService: GeminiService,
  ) {}

  async getReport(period: string = 'weekly', limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_trend_report', {
      p_period: period,
      p_limit: limit,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const ranking = (data as TrendReportItem[]) || [];

    // Gemini AI 인사이트 생성
    const periodLabel = period === 'weekly' ? '주간' : '월간';
    const dataContext = ranking
      .map(
        (r) =>
          `${r.rank}위: ${r.name} (${r.category}) - 주문 ${r.order_count}건, 변동: ${r.change}`,
      )
      .join('\n');

    const aiInsight = await this.geminiService.getInsight(
      `당신은 B2B 도매 플랫폼의 트렌드 분석가입니다. ${periodLabel} 인기 상품 랭킹을 분석해주세요.
규칙: 한국어, 3~4문장, 순위 변동(up/down/new)을 짚어주고, 왜 이런 변동이 생겼는지 추론, 사장님들에게 실용적인 인사이트 제공`,
      dataContext,
      `이번 ${periodLabel} 트렌드를 분석하고, 주목할 변동 사항과 사장님들에게 도움될 인사이트를 제공해주세요.`,
    );

    return {
      period,
      generated_at: new Date().toISOString(),
      ranking,
      ai_insight: aiInsight,
    };
  }

  async getBest(businessType: string, limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_trend_best', {
      p_business_type: businessType,
      p_limit: limit,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const ranking = (data as TrendBestItem[]) || [];

    // Gemini AI 인사이트 생성
    const dataContext = ranking
      .map(
        (r) =>
          `${r.rank}위: ${r.name} (${r.category}) - 주문 ${r.order_count}건`,
      )
      .join('\n');

    const aiInsight = await this.geminiService.getInsight(
      `당신은 B2B 도매 플랫폼의 업종 분석가입니다. ${businessType} 업종의 베스트셀러를 분석해주세요.
규칙: 한국어, 3~4문장, 이 업종에서 왜 이 상품들이 인기인지 업종 특성과 연결해서 설명, 실용적인 구매 조언 제공`,
      dataContext,
      `${businessType} 업종 베스트셀러를 분석하고, 이 업종 사장님에게 도움될 구매 조언을 제공해주세요.`,
    );

    return {
      business_type: businessType,
      ranking,
      ai_insight: aiInsight,
    };
  }
}
