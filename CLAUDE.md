# CLAUDE.md — bizmart-backend

## 프로젝트 개요
비즈마트 B2B 쇼핑몰 백엔드 API 서버 (포트폴리오용)
소상공인 대상 AI 트렌드 인사이트 종합 도매 플랫폼

## 문서 참조
- 기획 및 기능 명세 → `docs/PLANNING.md`
- 변경 이력 → `docs/CHANGELOG.md`
- 전체 API 명세 → `docs/API_DOCS.md`
- API 인수인계 (내부 동작 설명) → `docs/API_HANDOVER.md`
- 프론트엔드 연동 가이드 → `docs/FRONTEND_GUIDE.md`
- DB 스키마 → `supabase/migrations/001_create_tables.sql`
- DB 함수 → `supabase/migrations/002_create_functions.sql`
- 시드 데이터 → `supabase/seed.sql`

## 기술 스택
- Runtime: Node.js
- Framework: NestJS 10
- Language: TypeScript 5
- DB: Supabase (PostgreSQL)
- DB Client: Supabase JS SDK (Prisma 사용 안 함)
- Auth: 이메일 + 비밀번호, JWT 발급/검증 (bcrypt + passport-jwt)
- 결제: Mock 처리 (실제 PG 연동 없음)
- Deploy: Render (Free tier)

## 코드 스타일
- ES modules 사용 (import/export)
- NestJS 모듈 구조 엄격히 준수 (Module / Controller / Service)
- DTO는 class-validator 데코레이터 필수
- 응답 형식 통일: `{ data, message, statusCode }` (ResponseInterceptor)
- 에러 형식 통일: `{ statusCode, message, error }` (HttpExceptionFilter)
- `any` 타입 사용 금지 — ESLint `no-explicit-any: error`
- 환경변수는 ConfigModule + `getOrThrow()`로만 관리

## 모듈 구조
```
src/
├── auth/       # 회원가입, 로그인, JWT 발급/검증
├── users/      # 유저 정보 조회/수정
├── products/   # 상품 목록, 상세 (인기순 rpc 함수 포함)
├── orders/     # 주문 생성(rpc 트랜잭션), 조회
├── trend/      # 트렌드 랭킹(rpc), 업종별 베스트셀러(rpc)
└── common/     # SupabaseModule, JWT 가드/전략, 인터셉터, 필터, 데코레이터
```

## DB 테이블 네이밍
- **모든 테이블에 `shop_` 접두사 필수** (포트폴리오 멀티 프로젝트 구분용)
- `shop_users`, `shop_products`, `shop_orders`, `shop_order_items`
- 소스코드 Supabase 쿼리에서도 반드시 `shop_` 접두사 사용: `.from('shop_users')`

## 주요 규칙
- 모든 보호 라우트에 `@UseGuards(JwtGuard)` 적용
- 환경변수는 절대 코드에 하드코딩 금지
- 주문 생성 시 결제는 Mock 처리 — PostgreSQL 함수(`create_order`)로 트랜잭션 보장
- Supabase service role 키는 서버에서만 사용
- DB 복잡 쿼리(인기순 정렬, 트렌드 집계)는 PostgreSQL rpc 함수 사용

## 워크플로우
- 개발 서버: `npm run start:dev`
- 빌드: `npm run build`
- 타입 체크: `npx tsc --noEmit`
- 린트: `npm run lint`
- 포맷팅: `npm run format`

## 환경변수 (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=7d
PORT=3001
```

## DB 설정
1. Supabase 프로젝트 생성
2. `supabase/migrations/001_create_tables.sql` 실행 (테이블 + RLS)
3. `supabase/migrations/002_create_functions.sql` 실행 (rpc 함수)
4. `supabase/seed.sql` 실행 (테스트 상품 데이터)
