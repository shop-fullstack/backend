# BizMart Backend API

**소상공인을 위한 AI 트렌드 인사이트 B2B 도매 플랫폼**

카페, 식당, 미용실 등 소상공인 사장님들이 업종에 맞는 상품을 AI 추천받고, 수요 예측을 통해 효율적으로 대량 구매할 수 있는 B2B 도매 플랫폼의 백엔드 API 서버입니다.

---

## Tech Stack

| 분류 | 기술 |
|------|------|
| **Runtime** | Node.js |
| **Framework** | NestJS 10 |
| **Language** | TypeScript 5 |
| **Database** | Supabase (PostgreSQL) |
| **AI** | Google Gemini API (gemini-2.0-flash) |
| **Auth** | JWT + bcrypt + Passport |
| **Test** | Jest + Supertest (199 tests, 100% coverage) |
| **Deploy** | Render |

---

## Architecture

```
Client Request
     |
     v
[ LoggerMiddleware ]  ──  모든 요청/응답 로깅
     |
     v
[ ValidationPipe ]    ──  DTO 기반 입력값 자동 검증
     |
     v
[ JwtGuard ]          ──  JWT 토큰 검증 (인증 필요 API)
     |
     v
[ Controller ]        ──  라우팅 + 요청 처리
     |
     v
[ Service ]           ──  비즈니스 로직 + DB 쿼리 + AI 분석
     |
     v
[ ResponseInterceptor ] ──  { statusCode, message, data } 통일
     |
     v
Client Response
```

---

## AI Features

DB 통계가 숫자를 계산하고, Gemini AI가 그 숫자를 해석해서 자연어로 설명하는 구조입니다.

### Gemini AI 연동

| 기능 | 엔드포인트 | 설명 |
|------|-----------|------|
| AI 챗봇 | `POST /chat` | 업종 맞춤 대화형 상담 |
| 추천 인사이트 | `GET /recommend` | 추천 이유를 AI가 자연어로 설명 |
| 예측 인사이트 | `GET /forecast` | 수요 변동 해석 + 재고 관리 조언 |
| 트렌드 인사이트 | `GET /trend/report` | 순위 변동 원인 분석 |
| 베스트셀러 인사이트 | `GET /trend/best` | 업종별 인기 상품 분석 |

### 자체 알고리즘 (외부 라이브러리 없이 직접 구현)

| 알고리즘 | 용도 | 구현 |
|---------|------|------|
| 선형 회귀 (최소제곱법) | 수요 추세 분석 + 미래 예측 | `src/prediction/algorithms/linear-regression.ts` |
| 가중 이동평균 (WMA) | 노이즈 제거, 최근 데이터 강조 | `src/prediction/algorithms/moving-average.ts` |
| 구매 간격 분석 | 재주문 시점 예측 + 긴급도 산출 | `src/recommendation/recommendation.service.ts` |

---

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | - | 회원가입 |
| POST | `/auth/login` | - | 로그인 |
| POST | `/auth/logout` | O | 로그아웃 |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | O | 내 정보 조회 |
| PATCH | `/users/me` | O | 내 정보 수정 |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | - | 상품 목록 (필터/정렬/검색/페이지네이션) |
| GET | `/products/:id` | - | 상품 상세 |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | O | 주문 생성 (PostgreSQL 트랜잭션) |
| GET | `/orders` | O | 내 주문 목록 |
| GET | `/orders/:id` | O | 주문 상세 |

### Trend

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/trend/report` | O | 주간/월간 트렌드 랭킹 + AI 인사이트 |
| GET | `/trend/best` | O | 업종별 베스트셀러 + AI 인사이트 |

### AI - Prediction

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/forecast` | O | 업종별 4주 수요 예측 + AI 인사이트 |
| GET | `/predictions/forecast` | O | 단일 상품 수요 예측 |
| GET | `/predictions/restock` | O | 재입고 추천 |

### AI - Recommendation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/recommend` | O | AI 맞춤 추천 + AI 인사이트 |
| GET | `/recommendations` | O | 업종 기반 추천 |
| GET | `/recommendations/reorder` | O | 재주문 추천 (구매 간격 분석) |

### AI - Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/chat` | O | AI 챗봇 (Gemini 연동) |

---

## Project Structure

```
src/
├── auth/                    # 회원가입, 로그인, JWT
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── dto/
│
├── users/                   # 유저 정보
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│
├── products/                # 상품 목록/상세
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── dto/
│
├── orders/                  # 주문 (rpc 트랜잭션)
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   └── dto/
│
├── trend/                   # 트렌드 랭킹 + AI 인사이트
│   ├── trend.controller.ts
│   ├── trend.service.ts
│   └── dto/
│
├── prediction/              # 수요 예측 + AI 인사이트
│   ├── prediction.controller.ts
│   ├── prediction.service.ts
│   ├── algorithms/
│   │   ├── linear-regression.ts
│   │   └── moving-average.ts
│   └── dto/
│
├── recommendation/          # 상품 추천 + AI 인사이트
│   ├── recommendation.controller.ts
│   ├── recommendation.service.ts
│   └── dto/
│
├── chat/                    # AI 챗봇 (Gemini)
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── dto/
│
└── common/
    ├── supabase/            # DB 클라이언트 (글로벌)
    ├── gemini/              # Gemini AI 서비스 (글로벌)
    ├── guards/              # JWT 가드
    ├── strategies/          # JWT 전략
    ├── interceptors/        # 응답 형식 통일
    ├── filters/             # 에러 형식 통일
    ├── decorators/          # @CurrentUser()
    ├── middleware/           # 로거
    └── types/               # TypeScript 타입
```

---

## Database

### Tables

| 테이블 | 설명 |
|--------|------|
| `shop_users` | 유저 (이메일, 비밀번호 해시, 사업자 정보) |
| `shop_products` | 상품 (6개 카테고리, 31개 상품) |
| `shop_orders` | 주문 (BM-YYYYMMDD-NNNN 주문번호) |
| `shop_order_items` | 주문 상품 (주문-상품 관계) |

### PostgreSQL Functions (RPC)

| 함수 | 용도 |
|------|------|
| `create_order` | 주문 + 상품 원자적 생성 (트랜잭션) |
| `get_popular_products` | 주문 수 기반 인기순 정렬 |
| `get_trend_report` | 주간/월간 트렌드 + 이전 기간 대비 변동 |
| `get_trend_best` | 업종별 베스트셀러 |
| `get_demand_history` | 상품별 일별 주문 이력 (예측용) |
| `get_business_type_product_stats` | 업종별 상품 통계 (추천용) |
| `get_user_purchase_history` | 유저 구매 이력 (재주문 추천용) |
| `get_category_recommendations` | 카테고리별 미구매 인기 상품 |

---

## Testing

```
Test Suites:  29 passed, 29 total
Tests:        199 passed, 199 total
Coverage:     100% Statements | 100% Branches | 100% Functions | 100% Lines
```

### 테스트 구성

| 구분 | 수량 | 범위 |
|------|------|------|
| **Service 단위 테스트** | 85+ | 모든 서비스 메서드, 정상/에러/엣지 케이스 |
| **Controller 단위 테스트** | 30+ | 라우팅, 파라미터 전달, JWT 추출 |
| **DTO 검증 테스트** | 40+ | 필수값, 형식, 범위, 타입 검증 |
| **알고리즘 테스트** | 15+ | 선형 회귀, 이동평균 정확도 |
| **Common 모듈 테스트** | 25+ | 인터셉터, 필터, 미들웨어, JWT 전략 |
| **E2E 통합 테스트** | 34 | 전체 파이프라인 (ValidationPipe → Guard → Service → Interceptor) |

```bash
npm test           # 전체 테스트
npm run test:cov   # 커버리지 포함
npm run test:e2e   # E2E 테스트
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase 프로젝트
- Google AI Studio API Key ([발급](https://aistudio.google.com/app/apikey))

### Installation

```bash
git clone https://github.com/shop-fullstack/backend.git
cd backend
npm install
```

### Environment Variables

```bash
cp .env.example .env
```

`.env` 파일을 열고 값을 채워주세요:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
PORT=4000
GEMINI_API_KEY=your-gemini-api-key
```

### Database Setup

Supabase SQL Editor에서 순서대로 실행:

```
1. supabase/migrations/001_create_tables.sql     (테이블 + RLS)
2. supabase/migrations/002_create_functions.sql   (기본 rpc 함수)
3. supabase/migrations/003_create_ai_functions.sql (AI용 rpc 함수)
4. supabase/seed.sql                              (상품 데이터)
5. supabase/seed_orders.sql                       (주문 시드 데이터)
```

### Run

```bash
npm run start:dev   # 개발 서버 (watch mode)
npm run build       # 프로덕션 빌드
npm run start:prod  # 프로덕션 실행
```

---

## Documentation

| 문서 | 설명 |
|------|------|
| [API_DOCS.md](docs/API_DOCS.md) | 전체 API 명세 |
| [API_HANDOVER.md](docs/API_HANDOVER.md) | 백엔드 인수인계 (내부 동작 흐름) |
| [AI_INSIGHT_GUIDE.md](docs/AI_INSIGHT_GUIDE.md) | AI 인사이트 프론트 연동 가이드 |
| [FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) | 프론트엔드 연동 가이드 |
| [PLANNING.md](docs/PLANNING.md) | 기획 + DB 스키마 + 로드맵 |
| [CHANGELOG.md](docs/CHANGELOG.md) | 변경 이력 |

---

## Deploy

Render (Free tier)로 배포되어 있습니다.

| 항목 | 내용 |
|------|------|
| URL | `https://bizmart-backend-hq56.onrender.com` |
| Build | `npm install && npm run build` |
| Start | `node dist/main.js` |
| Auto Deploy | GitHub main 브랜치 push 시 |

> 무료 플랜은 15분 비활성 시 슬립됩니다. 첫 요청에 약 30초 지연이 있을 수 있습니다.

---

## Test Accounts

| 이메일 | 비밀번호 | 업종 |
|--------|----------|------|
| `cafe@bizmart.com` | `password123` | 카페/베이커리 |
| `restaurant@bizmart.com` | `password123` | 식당/외식업 |
| `salon@bizmart.com` | `password123` | 미용실/뷰티 |
| `mart@bizmart.com` | `password123` | 편의점/소매업 |
| `nail@bizmart.com` | `password123` | 네일샵/피부샵 |
