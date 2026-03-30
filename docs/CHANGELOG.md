# CHANGELOG.md — bizmart-backend

> 모든 변경 사항을 이 파일에 기록합니다.
> 형식: [버전] YYYY-MM-DD — 변경 내용

---

## [Unreleased]
> 아직 배포되지 않은 변경 사항

---

## [v1.2.0] — 2026-03-29

### 추가 (Added)
- NestJS 프로젝트 전체 구현
- `src/common/` — SupabaseModule(글로벌), JwtGuard, JwtStrategy, ResponseInterceptor, HttpExceptionFilter, CurrentUser 데코레이터, 타입 정의
- `src/auth/` — 회원가입(`POST /auth/register`), 로그인(`POST /auth/login`), 로그아웃(`POST /auth/logout`)
- `src/users/` — 내 정보 조회(`GET /users/me`), 수정(`PATCH /users/me`)
- `src/products/` — 상품 목록(`GET /products`, 필터/정렬/검색/페이지네이션), 상세(`GET /products/:id`)
- `src/orders/` — 주문 생성(`POST /orders`, rpc 트랜잭션), 목록(`GET /orders`), 상세(`GET /orders/:id`)
- `src/trend/` — 트렌드 리포트(`GET /trend/report`), 업종별 베스트셀러(`GET /trend/best`)
- `supabase/migrations/001_create_tables.sql` — DB 스키마 (users, products, orders, order_items) + RLS 정책
- `supabase/migrations/002_create_functions.sql` — PostgreSQL 함수 (create_order, get_popular_products, get_trend_report, get_trend_best)
- `supabase/seed.sql` — 테스트 상품 데이터 27개 (6개 카테고리)

### 변경 (Changed)
- orders 테이블에 `order_number` 컬럼 추가 (BM-YYYYMMDD-NNNN 형식, API 응답의 id로 사용)

---

## [v1.1.0] — 2025-03-29

### 변경
- 인증 방식: Supabase OAuth → 이메일 + 비밀번호 + JWT 직접 발급으로 변경
- 결제 처리: 토스페이먼츠 REST API → Mock 처리 (주문 생성 시 즉시 완료)로 변경

### 추가
- `POST /auth/register` 회원가입 엔드포인트
- `POST /auth/login` 로그인 엔드포인트

### 제거
- `/auth/kakao/callback` 카카오 OAuth 콜백
- `/auth/naver/callback` 네이버 OAuth 콜백
- `/payments/confirm` 토스페이먼츠 결제 승인 엔드포인트
- `payments` 모듈 전체

---

## [v1.0.0] — 2025-03-27

### 추가
- 프로젝트 초기 설정
- PLANNING.md 기획서 작성
- CLAUDE.md 작성
- API_DOCS.md 전체 API 명세 작성

---

## 변경 기록 작성 규칙

새로운 변경이 생기면 아래 형식으로 상단에 추가하세요:

```
## [v버전] — YYYY-MM-DD

### 추가 (Added)
- 새로 추가된 기능 또는 엔드포인트

### 변경 (Changed)
- 기존 API 변경 사항 (Breaking Change 명시)

### 제거 (Removed)
- 제거된 엔드포인트

### 수정 (Fixed)
- 버그 수정
```
