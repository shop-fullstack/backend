import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID('4', { message: '올바른 상품 ID가 아닙니다' })
  product_id: string;

  @IsInt()
  @Min(1, { message: '수량은 1개 이상이어야 합니다' })
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: '최소 1개 이상의 상품을 주문해야 합니다' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty({ message: '배송지를 입력해주세요' })
  delivery_address: string;

  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)' })
  delivery_date?: string;

  @IsOptional()
  @IsBoolean()
  is_cold?: boolean;
}
