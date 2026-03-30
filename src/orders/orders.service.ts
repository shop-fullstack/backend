import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderResult, OrderRow } from '../common/types/database.types';

@Injectable()
export class OrdersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(userId: string, dto: CreateOrderDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('create_order', {
      p_user_id: userId,
      p_items: dto.items,
      p_delivery_address: dto.delivery_address,
      p_delivery_date: dto.delivery_date || null,
      p_is_cold: dto.is_cold || false,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: '주문이 완료되었습니다',
      data: data as CreateOrderResult,
    };
  }

  async findAllByUser(userId: string, status?: string) {
    const supabase = this.supabaseService.getClient();

    let queryBuilder = supabase
      .from('shop_orders')
      .select(
        'id, order_number, status, total_amount, delivery_address, delivery_date, is_cold, created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new BadRequestException(error.message);
    }

    interface OrderListRow {
      id: string;
      order_number: string;
      status: string;
      total_amount: number;
      delivery_address: string;
      delivery_date: string;
      is_cold: boolean;
      created_at: string;
    }

    const orders = (data as OrderListRow[]) || [];

    // 각 주문의 items를 조회
    const result = await Promise.all(
      orders.map(async (order) => {
        const { data: items } = await supabase
          .from('shop_order_items')
          .select('product_id, quantity, unit_price, shop_products(name)')
          .eq('order_id', order.id);

        interface OrderItemWithProduct {
          product_id: string;
          quantity: number;
          unit_price: number;
          shop_products: { name: string } | null;
        }

        const typedItems = (items as unknown as OrderItemWithProduct[]) || [];

        return {
          id: order.order_number,
          status: order.status,
          total_amount: order.total_amount,
          delivery_address: order.delivery_address,
          delivery_date: order.delivery_date,
          is_cold: order.is_cold,
          items: typedItems.map((item) => ({
            product_id: item.product_id,
            name: item.shop_products?.name || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          created_at: order.created_at,
        };
      }),
    );

    return result;
  }

  async findOne(orderNumber: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: order, error } = await supabase
      .from('shop_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      throw new NotFoundException('주문을 찾을 수 없습니다');
    }

    const typedOrder = order as OrderRow;

    const { data: items, error: itemsError } = await supabase
      .from('shop_order_items')
      .select('product_id, quantity, unit_price, shop_products(name)')
      .eq('order_id', typedOrder.id);

    if (itemsError) {
      throw new BadRequestException(itemsError.message);
    }

    interface OrderItemWithProduct {
      product_id: string;
      quantity: number;
      unit_price: number;
      shop_products: { name: string } | null;
    }

    const typedItems = (items as unknown as OrderItemWithProduct[]) || [];

    return {
      id: typedOrder.order_number,
      status: typedOrder.status,
      total_amount: typedOrder.total_amount,
      delivery_address: typedOrder.delivery_address,
      delivery_date: typedOrder.delivery_date,
      is_cold: typedOrder.is_cold,
      items: typedItems.map((item) => ({
        product_id: item.product_id,
        name: item.shop_products?.name || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      created_at: typedOrder.created_at,
    };
  }
}
