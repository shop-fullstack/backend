import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRow } from '../common/types/database.types';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findMe(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('shop_users')
      .select(
        'id, email, business_number, business_type, company_name, owner_name, grade, created_at',
      )
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    return data as Omit<UserRow, 'password'>;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('shop_users')
      .update(dto)
      .eq('id', userId)
      .select(
        'id, email, business_number, business_type, company_name, owner_name, grade, created_at',
      )
      .single();

    if (error || !data) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    return data as Omit<UserRow, 'password'>;
  }
}
