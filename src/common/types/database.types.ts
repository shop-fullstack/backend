export interface UserRow {
  id: string;
  email: string;
  password: string;
  business_number: string;
  business_type: string;
  company_name: string;
  owner_name: string;
  grade: string;
  created_at: string;
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  price_per_unit: number;
  price_per_box: number;
  moq: number;
  origin: string;
  expiry_info: string;
  image_url: string;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  delivery_date: string;
  is_cold: boolean;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface TrendReportItem {
  rank: number;
  product_id: string;
  name: string;
  category: string;
  order_count: number;
  change: string;
}

export interface TrendBestItem {
  rank: number;
  product_id: string;
  name: string;
  category: string;
  order_count: number;
}

export interface CreateOrderResult {
  order_id: string;
  total_amount: number;
  status: string;
}

export interface PopularProductItem {
  id: string;
  name: string;
  category: string;
  price_per_unit: number;
  price_per_box: number;
  moq: number;
  image_url: string;
  total: number;
}

export interface JwtPayload {
  id: string;
  email: string;
}
