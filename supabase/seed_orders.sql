-- ============================================
-- BizMart 주문 시드 데이터 (Phase 2 AI 기능용)
-- 실행 순서: seed.sql 이후
-- 목적: 수요 예측/추천 분석에 충분한 주문 데이터 생성
-- ============================================

-- 임시 함수: 주문 + 주문항목 한번에 생성
CREATE OR REPLACE FUNCTION seed_order(
  p_user_email     VARCHAR,
  p_product_names  TEXT[],
  p_quantities     INTEGER[],
  p_days_ago       INTEGER,
  p_status         VARCHAR DEFAULT '배송완료'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id    UUID;
  v_order_id   UUID;
  v_total      INTEGER := 0;
  v_idx        INTEGER;
  v_product    RECORD;
  v_order_num  VARCHAR;
  v_count      INTEGER;
  v_date       TIMESTAMPTZ;
BEGIN
  v_date := NOW() - (p_days_ago || ' days')::INTERVAL;

  SELECT id INTO v_user_id FROM shop_users WHERE email = p_user_email;
  IF v_user_id IS NULL THEN RETURN; END IF;

  -- 주문번호
  SELECT COUNT(*) + 1 INTO v_count FROM shop_orders
  WHERE created_at::date = v_date::date;
  v_order_num := 'BM-' || TO_CHAR(v_date::date, 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');

  -- 총 금액 계산
  FOR v_idx IN 1..array_length(p_product_names, 1) LOOP
    SELECT price_per_box INTO v_product FROM shop_products WHERE name = p_product_names[v_idx];
    IF v_product IS NOT NULL THEN
      v_total := v_total + (v_product.price_per_box * p_quantities[v_idx]);
    END IF;
  END LOOP;

  -- 주문 생성
  INSERT INTO shop_orders (order_number, user_id, status, total_amount, delivery_address, delivery_date, is_cold, created_at)
  VALUES (v_order_num, v_user_id, p_status, v_total, '서울시 테스트 주소', (v_date + INTERVAL '3 days')::date, FALSE, v_date)
  RETURNING id INTO v_order_id;

  -- 주문항목 생성
  FOR v_idx IN 1..array_length(p_product_names, 1) LOOP
    SELECT id, price_per_box INTO v_product FROM shop_products WHERE name = p_product_names[v_idx];
    IF v_product.id IS NOT NULL THEN
      INSERT INTO shop_order_items (order_id, product_id, quantity, unit_price)
      VALUES (v_order_id, v_product.id, p_quantities[v_idx], v_product.price_per_box);
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 카페/베이커리 유저 (cafe@bizmart.com) — 주기적 원두+소모품 주문
-- ============================================
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입'], ARRAY[3,5], 85);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','백설탕 3kg'], ARRAY[2,1], 80);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','생분해 빨대 500개입','일회용 종이컵 6.5oz 1000개입'], ARRAY[3,2,4], 75);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg'], ARRAY[4], 70);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입','백설탕 3kg'], ARRAY[3,5,2], 65);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','생분해 빨대 500개입'], ARRAY[2,3], 60);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입'], ARRAY[4,6], 55);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','백설탕 3kg','매장용 디퓨저 500ml'], ARRAY[3,1,1], 50);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입'], ARRAY[5,7], 45);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','생분해 빨대 500개입','업소용 물티슈 100매 30팩'], ARRAY[3,2,1], 40);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입'], ARRAY[4,5], 35);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','백설탕 3kg'], ARRAY[5,2], 30);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입','생분해 빨대 500개입'], ARRAY[4,6,3], 25);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg'], ARRAY[6], 20);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입','백설탕 3kg'], ARRAY[5,8,2], 15);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입'], ARRAY[4,5], 10);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','생분해 빨대 500개입','업소용 물티슈 100매 30팩'], ARRAY[6,3,2], 5);
SELECT seed_order('cafe@bizmart.com', ARRAY['프리미엄 원두커피 1kg','일회용 종이컵 6.5oz 1000개입'], ARRAY[5,7], 2);

-- ============================================
-- 식당/외식업 유저 (restaurant@bizmart.com) — 식자재 중심
-- ============================================
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','중력분 밀가루 20kg','진간장 1.8L'], ARRAY[2,3,2], 83);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','천일염 5kg'], ARRAY[3,1], 76);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','중력분 밀가루 20kg','업소용 물티슈 100매 30팩'], ARRAY[2,2,3], 70);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','진간장 1.8L','키친타올 150매 12롤'], ARRAY[3,3,2], 63);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','중력분 밀가루 20kg'], ARRAY[4,3], 56);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','천일염 5kg','일회용 비닐장갑 500매'], ARRAY[2,2,5], 49);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','중력분 밀가루 20kg','진간장 1.8L'], ARRAY[3,4,2], 42);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','업소용 물티슈 100매 30팩'], ARRAY[4,3], 35);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','중력분 밀가루 20kg','천일염 5kg'], ARRAY[3,3,1], 28);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','진간장 1.8L'], ARRAY[5,3], 21);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','중력분 밀가루 20kg','키친타올 150매 12롤'], ARRAY[3,2,2], 14);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','일회용 비닐장갑 500매'], ARRAY[4,6], 7);
SELECT seed_order('restaurant@bizmart.com', ARRAY['카놀라유 18L','중력분 밀가루 20kg','진간장 1.8L'], ARRAY[5,4,3], 3);

-- ============================================
-- 미용실/뷰티 유저 (salon@bizmart.com) — 뷰티용품 중심
-- ============================================
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','헤어 트리트먼트 500ml 12개입'], ARRAY[2,2], 82);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','시트 마스크팩 100매입','업소용 물티슈 100매 30팩'], ARRAY[1,3,2], 74);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','헤어 트리트먼트 500ml 12개입','매장용 디퓨저 500ml'], ARRAY[2,3,1], 66);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','왁싱 스트립 500매'], ARRAY[3,2], 58);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','헤어 트리트먼트 500ml 12개입','시트 마스크팩 100매입'], ARRAY[2,2,4], 50);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','매장용 디퓨저 500ml'], ARRAY[3,1], 42);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','헤어 트리트먼트 500ml 12개입','왁싱 스트립 500매'], ARRAY[2,3,3], 34);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','시트 마스크팩 100매입'], ARRAY[4,5], 26);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','헤어 트리트먼트 500ml 12개입'], ARRAY[3,2], 18);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','왁싱 스트립 500매','매장용 디퓨저 500ml'], ARRAY[2,4,1], 10);
SELECT seed_order('salon@bizmart.com', ARRAY['살롱 전용 샴푸 1L 6개입','헤어 트리트먼트 500ml 12개입','시트 마스크팩 100매입'], ARRAY[4,3,3], 4);

-- ============================================
-- 편의점/소매업 유저 (mart@bizmart.com) — 포장재+소모품
-- ============================================
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','비닐봉투 중 1000매','OPP 테이프 48mm 50개'], ARRAY[3,2,1], 84);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','에어캡 롤 50m'], ARRAY[4,2], 77);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','비닐봉투 중 1000매','크라프트 쇼핑백 중 200매'], ARRAY[5,3,1], 70);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','OPP 테이프 48mm 50개','POS 영수증 용지 80mm 100롤'], ARRAY[3,2,1], 63);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','비닐봉투 중 1000매'], ARRAY[6,4], 56);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','에어캡 롤 50m','크라프트 쇼핑백 중 200매'], ARRAY[4,3,2], 49);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','비닐봉투 중 1000매','OPP 테이프 48mm 50개'], ARRAY[5,3,2], 42);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','POS 영수증 용지 80mm 100롤'], ARRAY[4,2], 35);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','비닐봉투 중 1000매','에어캡 롤 50m'], ARRAY[7,4,2], 28);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','OPP 테이프 48mm 50개'], ARRAY[5,3], 21);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','비닐봉투 중 1000매','크라프트 쇼핑백 중 200매'], ARRAY[6,5,2], 14);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','에어캡 롤 50m'], ARRAY[8,3], 7);
SELECT seed_order('mart@bizmart.com', ARRAY['택배박스 중형 50개','비닐봉투 중 1000매','OPP 테이프 48mm 50개'], ARRAY[5,4,2], 2);

-- ============================================
-- 네일샵/피부샵 유저 (nail@bizmart.com) — 뷰티+소모품
-- ============================================
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','시트 마스크팩 100매입'], ARRAY[1,3], 81);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','왁싱 스트립 500매','업소용 물티슈 100매 30팩'], ARRAY[1,2,2], 72);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','시트 마스크팩 100매입','매장용 디퓨저 500ml'], ARRAY[2,4,1], 63);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','왁싱 스트립 500매'], ARRAY[1,3], 54);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','시트 마스크팩 100매입','업소용 물티슈 100매 30팩'], ARRAY[2,5,2], 45);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','LED 전구 12W 20개입'], ARRAY[1,1], 36);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','시트 마스크팩 100매입','왁싱 스트립 500매'], ARRAY[2,3,4], 27);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','매장용 디퓨저 500ml'], ARRAY[1,2], 18);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','시트 마스크팩 100매입'], ARRAY[3,4], 9);
SELECT seed_order('nail@bizmart.com', ARRAY['젤 네일 폴리시 세트 24색','왁싱 스트립 500매','업소용 물티슈 100매 30팩'], ARRAY[2,3,3], 3);

-- 임시 함수 삭제
DROP FUNCTION IF EXISTS seed_order;
