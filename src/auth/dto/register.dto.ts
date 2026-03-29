import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '사업자등록번호를 입력해주세요' })
  business_number: string;

  @IsString()
  @IsNotEmpty({ message: '업종을 선택해주세요' })
  business_type: string;

  @IsString()
  @IsNotEmpty({ message: '상호명을 입력해주세요' })
  company_name: string;

  @IsString()
  @IsNotEmpty({ message: '대표자명을 입력해주세요' })
  owner_name: string;
}
