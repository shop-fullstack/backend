-- ============================================
-- BizMart 시드 데이터
-- 실행 순서: 3번째 (테이블 + 함수 생성 후)
-- ============================================

-- 식자재
INSERT INTO shop_products (name, category, price_per_unit, price_per_box, moq, origin, expiry_info, image_url) VALUES
('프리미엄 원두커피 1kg', '식자재', 25000, 25000, 1, '콜롬비아', '제조일로부터 12개월', 'https://placehold.co/400x400?text=원두커피'),
('백설탕 3kg', '식자재', 4500, 4500, 1, '대한민국', '제조일로부터 3년', 'https://placehold.co/400x400?text=백설탕'),
('중력분 밀가루 20kg', '식자재', 18000, 18000, 1, '대한민국', '제조일로부터 12개월', 'https://placehold.co/400x400?text=밀가루'),
('카놀라유 18L', '식자재', 32000, 32000, 1, '호주', '제조일로부터 18개월', 'https://placehold.co/400x400?text=카놀라유'),
('진간장 1.8L', '식자재', 6500, 6500, 1, '대한민국', '제조일로부터 24개월', 'https://placehold.co/400x400?text=진간장'),
('천일염 5kg', '식자재', 12000, 12000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=천일염');

-- 소모품
INSERT INTO shop_products (name, category, price_per_unit, price_per_box, moq, origin, expiry_info, image_url) VALUES
('일회용 종이컵 6.5oz 1000개입', '소모품', 28, 27500, 1, '대한민국', '제조일로부터 3년', 'https://placehold.co/400x400?text=종이컵'),
('생분해 빨대 500개입', '소모품', 16, 8000, 1, '대한민국', '제조일로부터 2년', 'https://placehold.co/400x400?text=빨대'),
('업소용 물티슈 100매 30팩', '소모품', 500, 15000, 1, '대한민국', '제조일로부터 3년', 'https://placehold.co/400x400?text=물티슈'),
('키친타올 150매 12롤', '소모품', 1200, 14400, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=키친타올'),
('일회용 비닐장갑 500매', '소모품', 10, 5000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=비닐장갑');

-- 포장재
INSERT INTO shop_products (name, category, price_per_unit, price_per_box, moq, origin, expiry_info, image_url) VALUES
('택배박스 중형 50개', '포장재', 600, 30000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=택배박스'),
('에어캡 롤 50m', '포장재', 200, 10000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=에어캡'),
('비닐봉투 중 1000매', '포장재', 15, 15000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=비닐봉투'),
('OPP 테이프 48mm 50개', '포장재', 800, 40000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=OPP테이프'),
('크라프트 쇼핑백 중 200매', '포장재', 150, 30000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=쇼핑백');

-- 뷰티용품
INSERT INTO shop_products (name, category, price_per_unit, price_per_box, moq, origin, expiry_info, image_url) VALUES
('살롱 전용 샴푸 1L 6개입', '뷰티용품', 8000, 48000, 1, '대한민국', '제조일로부터 30개월', 'https://placehold.co/400x400?text=샴푸'),
('헤어 트리트먼트 500ml 12개입', '뷰티용품', 5000, 60000, 1, '대한민국', '제조일로부터 30개월', 'https://placehold.co/400x400?text=트리트먼트'),
('젤 네일 폴리시 세트 24색', '뷰티용품', 2500, 60000, 1, '대한민국', '제조일로부터 24개월', 'https://placehold.co/400x400?text=네일폴리시'),
('시트 마스크팩 100매입', '뷰티용품', 300, 30000, 1, '대한민국', '제조일로부터 24개월', 'https://placehold.co/400x400?text=마스크팩'),
('왁싱 스트립 500매', '뷰티용품', 40, 20000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=왁싱스트립');

-- 인테리어
INSERT INTO shop_products (name, category, price_per_unit, price_per_box, moq, origin, expiry_info, image_url) VALUES
('LED 전구 12W 20개입', '인테리어', 2500, 50000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=LED전구'),
('매장용 디퓨저 500ml', '인테리어', 18000, 18000, 1, '대한민국', '제조일로부터 24개월', 'https://placehold.co/400x400?text=디퓨저'),
('미니 인테리어 화분 세트 10개', '인테리어', 5000, 50000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=화분세트'),
('무드등 스트링 라이트 10m', '인테리어', 12000, 12000, 1, '중국', '유통기한 없음', 'https://placehold.co/400x400?text=무드등');

-- 기타
INSERT INTO shop_products (name, category, price_per_unit, price_per_box, moq, origin, expiry_info, image_url) VALUES
('POS 영수증 용지 80mm 100롤', '기타', 800, 80000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=영수증용지'),
('업소용 명함 1000매', '기타', 50, 50000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=명함'),
('전단지 A4 양면 컬러 5000매', '기타', 20, 100000, 1, '대한민국', '유통기한 없음', 'https://placehold.co/400x400?text=전단지');
