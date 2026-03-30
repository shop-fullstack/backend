import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../common/supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRow } from '../common/types/database.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('shop_users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) {
      throw new BadRequestException('이미 등록된 이메일입니다');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { data: user, error } = await supabase
      .from('shop_users')
      .insert({
        email: dto.email,
        password: hashedPassword,
        business_number: dto.business_number,
        business_type: dto.business_type,
        company_name: dto.company_name,
        owner_name: dto.owner_name,
      })
      .select(
        'id, email, business_number, business_type, company_name, owner_name, grade, created_at',
      )
      .single();

    if (error || !user) {
      throw new BadRequestException(
        error?.message || '회원가입 처리 중 오류가 발생했습니다',
      );
    }

    const typedUser = user as Omit<UserRow, 'password'>;

    return {
      message: '회원가입이 완료되었습니다',
      data: {
        access_token: this.generateToken(typedUser.id, typedUser.email),
        user: {
          id: typedUser.id,
          email: typedUser.email,
          business_number: typedUser.business_number,
          business_type: typedUser.business_type,
          company_name: typedUser.company_name,
          owner_name: typedUser.owner_name,
          grade: typedUser.grade,
          created_at: typedUser.created_at,
        },
      },
    };
  }

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data: user, error } = await supabase
      .from('shop_users')
      .select('*')
      .eq('email', dto.email)
      .single();

    if (error || !user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    }

    const typedUser = user as UserRow;
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      typedUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    }

    return {
      message: '로그인 되었습니다',
      data: {
        access_token: this.generateToken(typedUser.id, typedUser.email),
        user: {
          id: typedUser.id,
          email: typedUser.email,
          business_number: typedUser.business_number,
          business_type: typedUser.business_type,
          company_name: typedUser.company_name,
          owner_name: typedUser.owner_name,
          grade: typedUser.grade,
          created_at: typedUser.created_at,
        },
      },
    };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
