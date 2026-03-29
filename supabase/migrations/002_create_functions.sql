-- ============================================
-- BizMart PostgreSQL 함수 생성
-- 실행 순서: 2번째 (테이블 생성 후)
-- 테이블 접두사: shop_
-- ============================================

-- ────────────────────────────────────────────
-- 1. 주문 생성 (트랜잭션 보장)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_order(
  p_user_id          UUID,
  p_items            JSONB,
  p_delivery_address VARCHAR,
  p_delivery_date    DATE DEFAULT NULL,
  p_is_cold          BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id     UUID;
  v_order_number VARCHAR;
  v_total_amount INTEGER := 0;
  v_item         JSONB;
  v_product      RECORD;
  v_today_count  INTEGER;
BEGIN
  -- 주문번호 생성: BM-YYYYMMDD-NNNN
  SELECT COUNT(*) + 1 INTO v_today_count
  FROM shop_orders
  WHERE created_at::date = CURRENT_DATE;

  v_order_number := 'BM-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_today_count::TEXT, 4, '0');

  -- 총 금액 계산 + 상품 존재 여부 확인
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, price_per_box INTO v_product
    FROM shop_products
    WHERE id = (v_item->>'product_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION '상품을 찾을 수 없습니다: %', v_item->>'product_id';
    END IF;

    v_total_amount := v_total_amount + (v_product.price_per_box * (v_item->>'quantity')::INTEGER);
  END LOOP;

  -- 주문 생성
  INSERT INTO shop_orders (order_number, user_id, status, total_amount, delivery_address, delivery_date, is_cold)
  VALUES (v_order_number, p_user_id, '주문완료', v_total_amount, p_delivery_address, p_delivery_date, p_is_cold)
  RETURNING id INTO v_order_id;

  -- 주문 항목 생성
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT price_per_box INTO v_product
    FROM shop_products
    WHERE id = (v_item->>'product_id')::UUID;

    INSERT INTO shop_order_items (order_id, product_id, quantity, unit_price)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      v_product.price_per_box
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_number,
    'total_amount', v_total_amount,
    'status', '주문완료'
  );
END;
$$;

-- ────────────────────────────────────────────
-- 2. 인기순 상품 조회
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_popular_products(
  p_category VARCHAR DEFAULT NULL,
  p_search   VARCHAR DEFAULT NULL,
  p_offset   INTEGER DEFAULT 0,
  p_limit    INTEGER DEFAULT 20
)
RETURNS TABLE (
  id             UUID,
  name           VARCHAR,
  category       VARCHAR,
  price_per_unit INTEGER,
  price_per_box  INTEGER,
  moq            INTEGER,
  image_url      VARCHAR,
  total          BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT p.*
    FROM shop_products p
    WHERE
      (p_category IS NULL OR p.category = p_category)
      AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%')
  ),
  counted AS (
    SELECT
      f.id, f.name, f.category,
      f.price_per_unit, f.price_per_box, f.moq, f.image_url,
      COALESCE(SUM(oi.quantity), 0)::BIGINT AS order_count
    FROM filtered f
    LEFT JOIN shop_order_items oi ON oi.product_id = f.id
    GROUP BY f.id, f.name, f.category, f.price_per_unit, f.price_per_box, f.moq, f.image_url
  )
  SELECT
    c.id, c.name, c.category,
    c.price_per_unit, c.price_per_box, c.moq, c.image_url,
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total
  FROM counted c
  ORDER BY c.order_count DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

-- ────────────────────────────────────────────
-- 3. 트렌드 리포트 (주간/월간 TOP 상품)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_trend_report(
  p_period VARCHAR DEFAULT 'weekly',
  p_limit  INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank        BIGINT,
  product_id  UUID,
  name        VARCHAR,
  category    VARCHAR,
  order_count BIGINT,
  change      VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_start  TIMESTAMPTZ;
  v_previous_start TIMESTAMPTZ;
  v_previous_end   TIMESTAMPTZ;
BEGIN
  IF p_period = 'monthly' THEN
    v_current_start  := NOW() - INTERVAL '30 days';
    v_previous_start := NOW() - INTERVAL '60 days';
    v_previous_end   := NOW() - INTERVAL '30 days';
  ELSE
    v_current_start  := NOW() - INTERVAL '7 days';
    v_previous_start := NOW() - INTERVAL '14 days';
    v_previous_end   := NOW() - INTERVAL '7 days';
  END IF;

  RETURN QUERY
  WITH current_ranking AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY COUNT(oi.id) DESC) AS rank,
      p.id AS product_id,
      p.name,
      p.category,
      COUNT(oi.id)::BIGINT AS order_count
    FROM shop_order_items oi
    JOIN shop_orders o ON o.id = oi.order_id
    JOIN shop_products p ON p.id = oi.product_id
    WHERE o.created_at >= v_current_start
    GROUP BY p.id, p.name, p.category
  ),
  previous_ranking AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY COUNT(oi.id) DESC) AS rank,
      p.id AS product_id
    FROM shop_order_items oi
    JOIN shop_orders o ON o.id = oi.order_id
    JOIN shop_products p ON p.id = oi.product_id
    WHERE o.created_at >= v_previous_start
      AND o.created_at < v_previous_end
    GROUP BY p.id
  )
  SELECT
    cr.rank,
    cr.product_id,
    cr.name,
    cr.category,
    cr.order_count,
    CASE
      WHEN pr.rank IS NULL THEN 'new'
      WHEN cr.rank < pr.rank THEN 'up'
      WHEN cr.rank > pr.rank THEN 'down'
      ELSE 'same'
    END::VARCHAR AS change
  FROM current_ranking cr
  LEFT JOIN previous_ranking pr ON cr.product_id = pr.product_id
  ORDER BY cr.rank
  LIMIT p_limit;
END;
$$;

-- ────────────────────────────────────────────
-- 4. 업종별 베스트셀러
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_trend_best(
  p_business_type VARCHAR,
  p_limit         INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank        BIGINT,
  product_id  UUID,
  name        VARCHAR,
  category    VARCHAR,
  order_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(oi.id) DESC) AS rank,
    p.id AS product_id,
    p.name,
    p.category,
    COUNT(oi.id)::BIGINT AS order_count
  FROM shop_order_items oi
  JOIN shop_orders o ON o.id = oi.order_id
  JOIN shop_users u ON u.id = o.user_id
  JOIN shop_products p ON p.id = oi.product_id
  WHERE u.business_type = p_business_type
  GROUP BY p.id, p.name, p.category
  ORDER BY order_count DESC
  LIMIT p_limit;
END;
$$;
