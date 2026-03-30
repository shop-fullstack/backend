import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductRow, PopularProductItem } from '../common/types/database.types';

@Injectable()
export class ProductsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(query: ProductQueryDto) {
    const { category, sort = 'latest', search, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    if (sort === 'popular') {
      return this.findByPopularity(category, search, offset, limit, page);
    }

    const supabase = this.supabaseService.getClient();

    let queryBuilder = supabase
      .from('shop_products')
      .select(
        'id, name, category, price_per_unit, price_per_box, moq, image_url',
        { count: 'exact' },
      );

    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }
    if (search) {
      queryBuilder = queryBuilder.ilike('name', `%${search}%`);
    }

    switch (sort) {
      case 'price_asc':
        queryBuilder = queryBuilder.order('price_per_box', {
          ascending: true,
        });
        break;
      case 'price_desc':
        queryBuilder = queryBuilder.order('price_per_box', {
          ascending: false,
        });
        break;
      default:
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
        break;
    }

    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new NotFoundException(error.message);
    }

    return {
      items:
        (data as Pick<
          ProductRow,
          | 'id'
          | 'name'
          | 'category'
          | 'price_per_unit'
          | 'price_per_box'
          | 'moq'
          | 'image_url'
        >[]) || [],
      total: count || 0,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('shop_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('상품을 찾을 수 없습니다');
    }

    return data as ProductRow;
  }

  private async findByPopularity(
    category: string | undefined,
    search: string | undefined,
    offset: number,
    limit: number,
    page: number,
  ) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_popular_products', {
      p_category: category || null,
      p_search: search || null,
      p_offset: offset,
      p_limit: limit,
    });

    if (error) {
      throw new NotFoundException(error.message);
    }

    const items = (data as PopularProductItem[]) || [];
    const total = items.length > 0 ? Number(items[0].total) : 0;

    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      items: items.map(({ total: _total, ...rest }) => rest),
      total,
      page,
      limit,
    };
  }
}
