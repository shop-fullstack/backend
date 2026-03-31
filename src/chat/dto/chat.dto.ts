import {
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatContextDto {
  @IsOptional()
  @IsString()
  business_type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cart_count?: number;
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty({ message: '메시지를 입력해주세요' })
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatContextDto)
  context?: ChatContextDto;
}
