# PLANNING.md — bizmart-backend
> 버전 관리 문서 | 변경 이력은 CHANGELOG.md 참조

---

## 현재 버전: v1.2.0

---

## 서비스 개요

**비즈마트 (BizMart)** — 소상공인을 위한 AI 트렌드 인사이트 B2B 종합 도매 플랫폼

| 항목 | 내용 |
|------|------|
| 타겟 | 소상공인 (카페, 식당, 미용실, 편의점 등) |
| 핵심 차별점 | 업종별 트렌드 분석 + B2B 대량구매 |
| 로그인 | 이메일 + 비밀번호 (JWT) |
| 결제 | Mock 처리 (즉시 완료) |
| DB | Supabase (PostgreSQL) |
| 배포 | Render (Free tier) |

---

## DB 테이블 구조

### shop_users
> 모든 테이블에 `shop_` 접두사 적용 (포트폴리오 멀티 프로젝트 구분용)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| email | varchar(255) | 이메일 (유니크) |
| password | varchar(255) | 해시된 비밀번호 (bcrypt) |
| business_number | varchar(20) | 사업자등록번호 |
| business_type | varchar(50) | 업종 |
| company_name | varchar(100) | 상호명 |
| owner_name | varchar(50) | 대표자명 |
| grade | varchar(20) | 일반/프리미엄/VIP (기본: 일반) |
| created_at | timestamptz | 가입일 |

### shop_products
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| name | varchar(255) | 상품명 |
| category | varchar(50) | 카테고리 (식자재/소모품/포장재/뷰티용품/인테리어/기타) |
| price_per_unit | integer | 개당 단가 |
| price_per_box | integer | 박스 단가 |
| moq | integer | 최소 주문 수량 (기본: 1) |
| origin | varchar(100) | 원산지 |
| expiry_info | varchar(255) | 유통기한 |
| image_url | varchar(500) | 이미지 URL |
| created_at | timestamptz | 등록일 |

### shop_orders
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK (내부용) |
| order_number | varchar(20) | 주문번호 (BM-YYYYMMDD-NNNN, 유니크) |
| user_id | uuid | FK -> shop_users.id |
| status | varchar(20) | 주문완료/배송준비/배송중/배송완료 |
| total_amount | integer | 총 결제금액 |
| delivery_address | varchar(500) | 배송지 |
| delivery_date | date | 희망 배송일 |
| is_cold | boolean | 냉장/냉동 여부 |
| created_at | timestamptz | 주문일 |

### shop_order_items
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| order_id | uuid | FK -> shop_orders.id (CASCADE) |
| product_id | uuid | FK -> shop_products.id |
| quantity | integer | 수량 |
| unit_price | integer | 주문 당시 박스 단가 |

---

## PostgreSQL 함수 (rpc)

| 함수명 | 용도 |
|--------|------|
| `create_order` | 주문 생성 (트랜잭션 보장, 주문번호 자동 생성) |
| `get_popular_products` | 인기순 상품 정렬 (주문 수량 기반) |
| `get_trend_report` | 주간/월간 TOP 상품 랭킹 + 이전 기간 대비 변동 |
| `get_trend_best` | 업종별 베스트셀러 집계 |

---

## 모듈 구조

| 모듈 | 역할 |
|------|------|
| auth | 회원가입, 로그인, JWT 발급/검증, 로그아웃 |
| users | 내 정보 조회/수정 |
| products | 상품 목록 (필터/정렬/검색/페이지네이션), 상세 |
| orders | 주문 생성 (Mock 결제 + rpc 트랜잭션), 목록/상세 조회 |
| trend | 트렌드 랭킹 (rpc), 업종별 베스트셀러 (rpc) |
| prediction | 수요 예측 (선형 회귀 + 이동평균), 재입고 추천 |
| recommendation | 업종 기반 상품 추천, 재주문 추천 (구매 간격 분석) |
| common | SupabaseModule(글로벌), JWT 가드/전략, 응답 인터셉터, 에러 필터, CurrentUser 데코레이터 |

---

## Render 배포 설정

| 항목 | 내용 |
|------|------|
| 서비스 타입 | Web Service |
| 빌드 명령어 | `npm run build` |
| 시작 명령어 | `node dist/main.js` |
| 자동 배포 | GitHub main 브랜치 push 시 |
| 주의 | 무료 플랜 — 15분 비활성 시 슬립 (첫 요청 약 30초 지연) |

---

## 로드맵

### Phase 1 — MVP (v1.0.0 ~ v1.2.0)
- [x] NestJS 프로젝트 초기 세팅
- [x] Supabase 연동 (테이블 + rpc 함수 생성)
- [x] Auth 모듈 (회원가입, 로그인, JWT, 로그아웃)
- [x] Users 모듈 (내 정보 조회/수정)
- [x] Products 모듈 (목록/상세, 필터/정렬/검색/페이지네이션)
- [x] Orders 모듈 (Mock 결제 + rpc 트랜잭션)
- [x] Common 모듈 (가드, 인터셉터, 필터, 데코레이터)
- [x] Trend 모듈 — 주간/월간 랭킹 (rpc, 이전 기간 대비 변동 표시)
- [x] 업종별 베스트셀러 (rpc)

### Phase 2 — AI 기능 (v1.3.0)
- [x] Prediction 모듈 — 수요 예측 (선형 회귀 + 가중 이동평균, rpc)
- [x] Recommendation 모듈 — 업종 기반 추천, 재주문 추천 (구매 간격 분석, rpc)
- [x] AI용 PostgreSQL rpc 함수 4개 추가
- [x] 시드 주문 데이터 보강 (100건+, 90일 분산)
