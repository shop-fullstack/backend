-- ============================================
-- BizMart DB 스키마 생성
-- 실행 순서: 1번째
-- 테이블 접두사: shop_ (포트폴리오 멀티 프로젝트 구분용)
-- ============================================

-- 1. shop_users 테이블
CREATE TABLE IF NOT EXISTS shop_users (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  business_number VARCHAR(20),
  business_type   VARCHAR(50),
  company_name    VARCHAR(100),
  owner_name      VARCHAR(50),
  grade       VARCHAR(20) DEFAULT '일반',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. shop_products 테이블
CREATE TABLE IF NOT EXISTS shop_products (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  category       VARCHAR(50) NOT NULL,
  price_per_unit INTEGER NOT NULL,
  price_per_box  INTEGER NOT NULL,
  moq            INTEGER DEFAULT 1,
  origin         VARCHAR(100),
  expiry_info    VARCHAR(255),
  image_url      VARCHAR(500),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. shop_orders 테이블
CREATE TABLE IF NOT EXISTS shop_orders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number     VARCHAR(20) NOT NULL UNIQUE,
  user_id          UUID NOT NULL REFERENCES shop_users(id),
  status           VARCHAR(20) DEFAULT '주문완료',
  total_amount     INTEGER NOT NULL,
  delivery_address VARCHAR(500) NOT NULL,
  delivery_date    DATE,
  is_cold          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. shop_order_items 테이블
CREATE TABLE IF NOT EXISTS shop_order_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id   UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id),
  quantity   INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_product_id ON shop_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products(category);

-- RLS 활성화 (Supabase 보안)
ALTER TABLE shop_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

-- service_role은 모든 테이블 접근 허용 (백엔드 서버 전용)
CREATE POLICY "Service role full access on shop_users"
  ON shop_users FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on shop_products"
  ON shop_products FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on shop_orders"
  ON shop_orders FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on shop_order_items"
  ON shop_order_items FOR ALL
  USING (auth.role() = 'service_role');
