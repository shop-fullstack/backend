import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TrendReportQueryDto {
  @IsOptional()
  @IsIn(['weekly', 'monthly'])
  period?: string = 'weekly';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class TrendBestQueryDto {
  @IsString()
  @IsNotEmpty({ message: '업종(type)을 입력해주세요' })
  type: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
