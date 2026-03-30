-- ============================================
-- BizMart Phase 2: AI 기능용 PostgreSQL 함수
-- 실행 순서: 4번째 (기존 테이블 + 함수 생성 후)
-- ============================================

-- ────────────────────────────────────────────
-- 1. 상품별 일별 주문 이력 조회 (수요 예측용)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_demand_history(
  p_product_id UUID,
  p_days       INTEGER DEFAULT 90
)
RETURNS TABLE (
  order_date   DATE,
  total_qty    BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.created_at::date AS order_date,
    COALESCE(SUM(oi.quantity), 0)::BIGINT AS total_qty
  FROM generate_series(
    (CURRENT_DATE - p_days * INTERVAL '1 day')::date,
    CURRENT_DATE,
    '1 day'
  ) AS d(day)
  LEFT JOIN shop_orders o
    ON o.created_at::date = d.day
  LEFT JOIN shop_order_items oi
    ON oi.order_id = o.id
    AND oi.product_id = p_product_id
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;

-- ────────────────────────────────────────────
-- 2. 업종별 상품 주문 통계 (추천용)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_business_type_product_stats(
  p_business_type VARCHAR,
  p_limit         INTEGER DEFAULT 20
)
RETURNS TABLE (
  product_id   UUID,
  name         VARCHAR,
  category     VARCHAR,
  order_count  BIGINT,
  total_qty    BIGINT,
  buyer_count  BIGINT,
  price_per_box INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name,
    p.category,
    COUNT(DISTINCT oi.id)::BIGINT AS order_count,
    COALESCE(SUM(oi.quantity), 0)::BIGINT AS total_qty,
    COUNT(DISTINCT o.user_id)::BIGINT AS buyer_count,
    p.price_per_box
  FROM shop_products p
  JOIN shop_order_items oi ON oi.product_id = p.id
  JOIN shop_orders o ON o.id = oi.order_id
  JOIN shop_users u ON u.id = o.user_id
  WHERE u.business_type = p_business_type
  GROUP BY p.id, p.name, p.category, p.price_per_box
  ORDER BY order_count DESC
  LIMIT p_limit;
END;
$$;

-- ────────────────────────────────────────────
-- 3. 유저 구매 이력 조회 (재주문 추천용)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_purchase_history(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 50
)
RETURNS TABLE (
  product_id       UUID,
  name             VARCHAR,
  category         VARCHAR,
  purchase_count   BIGINT,
  total_qty        BIGINT,
  last_purchased   TIMESTAMPTZ,
  avg_interval_days FLOAT,
  price_per_box    INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH purchases AS (
    SELECT
      oi.product_id,
      o.created_at,
      oi.quantity
    FROM shop_order_items oi
    JOIN shop_orders o ON o.id = oi.order_id
    WHERE o.user_id = p_user_id
  ),
  intervals AS (
    SELECT
      p1.product_id,
      EXTRACT(EPOCH FROM (p1.created_at - LAG(p1.created_at) OVER (
        PARTITION BY p1.product_id ORDER BY p1.created_at
      ))) / 86400.0 AS days_between
    FROM purchases p1
  )
  SELECT
    p.id AS product_id,
    p.name,
    p.category,
    COUNT(DISTINCT pu.created_at)::BIGINT AS purchase_count,
    COALESCE(SUM(pu.quantity), 0)::BIGINT AS total_qty,
    MAX(pu.created_at) AS last_purchased,
    COALESCE(AVG(iv.days_between), 0)::FLOAT AS avg_interval_days,
    p.price_per_box
  FROM purchases pu
  JOIN shop_products p ON p.id = pu.product_id
  LEFT JOIN intervals iv ON iv.product_id = pu.product_id AND iv.days_between IS NOT NULL
  GROUP BY p.id, p.name, p.category, p.price_per_box
  ORDER BY purchase_count DESC
  LIMIT p_limit;
END;
$$;

-- ────────────────────────────────────────────
-- 4. 카테고리별 인기 상품 (유저가 안 산 것만)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_category_recommendations(
  p_user_id   UUID,
  p_category  VARCHAR,
  p_limit     INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id   UUID,
  name         VARCHAR,
  category     VARCHAR,
  order_count  BIGINT,
  price_per_box INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.name,
    p.category,
    COUNT(oi.id)::BIGINT AS order_count,
    p.price_per_box
  FROM shop_products p
  LEFT JOIN shop_order_items oi ON oi.product_id = p.id
  WHERE p.category = p_category
    AND p.id NOT IN (
      SELECT oi2.product_id
      FROM shop_order_items oi2
      JOIN shop_orders o2 ON o2.id = oi2.order_id
      WHERE o2.user_id = p_user_id
    )
  GROUP BY p.id, p.name, p.category, p.price_per_box
  ORDER BY order_count DESC
  LIMIT p_limit;
END;
$$;
