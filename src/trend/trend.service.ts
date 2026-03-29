import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { TrendReportItem, TrendBestItem } from '../common/types/database.types';

@Injectable()
export class TrendService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getReport(period: string = 'weekly', limit: number = 10) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_trend_report', {
      p_period: period,
      p_limit: limit,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      period,
      generated_at: new Date().toISOString(),
      ranking: (data as TrendReportItem[]) || [],
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

    return {
      business_type: businessType,
      ranking: (data as TrendBestItem[]) || [],
    };
  }
}
