# API 인수인계 문서 — bizmart-backend

> 백엔드 개발자 인수인계용
> 각 API가 내부에서 어떻게 동작하는지, 왜 이런 구조를 선택했는지 설명합니다.

---

## 목차

1. [전체 구조 한눈에 보기](#1-전체-구조-한눈에-보기)
2. [공통 구조 — 모든 API에 적용되는 것들](#2-공통-구조--모든-api에-적용되는-것들)
3. [인증 (Auth) — 회원가입 / 로그인 / 로그아웃](#3-인증-auth--회원가입--로그인--로그아웃)
4. [유저 (Users) — 내 정보 조회 / 수정](#4-유저-users--내-정보-조회--수정)
5. [상품 (Products) — 목록 / 상세](#5-상품-products--목록--상세)
6. [주문 (Orders) — 주문 생성 / 조회](#6-주문-orders--주문-생성--조회)
7. [트렌드 (Trend) — 랭킹 / 베스트셀러](#7-트렌드-trend--랭킹--베스트셀러)
8. [DB 함수(rpc) 정리](#8-db-함수rpc-정리)
9. [파일 구조 요약](#9-파일-구조-요약)

---

## 1. 전체 구조 한눈에 보기

이 백엔드는 NestJS 프레임워크를 사용합니다. NestJS는 코드를 **모듈 단위**로 나누어 관리하는 구조입니다. 각 모듈은 세 가지 역할로 나뉩니다:

| 역할 | 파일 | 하는 일 |
|------|------|---------|
| **Controller** | `*.controller.ts` | "어떤 URL로 요청이 들어오면 어떤 함수를 실행할지" 정의 (라우팅) |
| **Service** | `*.service.ts` | 실제 비즈니스 로직 처리 (DB 조회, 데이터 가공 등) |
| **DTO** | `dto/*.dto.ts` | 요청 데이터의 형식을 정의하고 자동 검증 |

**요청 처리 흐름 (모든 API 동일)**

```
클라이언트 요청
    |
    v
[LoggerMiddleware] --- 요청 로그 기록 (메서드, URL, 소요시간)
    |
    v
[ValidationPipe] --- DTO 기반 입력값 자동 검증 (잘못된 값이면 여기서 400 에러)
    |
    v
[JwtGuard] --- 인증이 필요한 API만 적용. JWT 토큰 검증
    |
    v
[Controller] --- URL에 맞는 함수 호출
    |
    v
[Service] --- Supabase(DB)에 쿼리 실행, 결과 가공
    |
    v
[ResponseInterceptor] --- 응답을 { statusCode, message, data } 형식으로 통일
    |
    v
클라이언트 응답
```

만약 중간에 에러가 발생하면:
```
에러 발생 → [HttpExceptionFilter] → { statusCode, message, error } 형식으로 통일
```

---

## 2. 공통 구조 — 모든 API에 적용되는 것들

### 2-1. Supabase 연결 (`src/common/supabase/`)

Supabase는 PostgreSQL 데이터베이스를 쉽게 쓸 수 있게 해주는 서비스입니다. 이 프로젝트에서는 Supabase JS SDK를 사용하여 DB에 접근합니다.

**왜 Prisma가 아니라 Supabase SDK를 쓰나요?**
- Supabase에서 제공하는 **rpc 함수 호출** 기능을 쓰기 위해서입니다
- 복잡한 쿼리(인기순 정렬, 트렌드 집계)는 PostgreSQL 함수로 처리하는데, 이걸 `supabase.rpc('함수명')`으로 간단하게 호출할 수 있습니다

**연결 방식:**
```
src/common/supabase/supabase.service.ts
```
- 서버 시작 시 Supabase 클라이언트를 **한 번만** 생성
- `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY` 환경변수 사용
- **Service Role Key**를 사용하는 이유: 백엔드 서버이므로 RLS(행 수준 보안)를 우회하고 모든 데이터에 접근해야 하기 때문
- `@Global()` 모듈이라 모든 모듈에서 별도 import 없이 사용 가능

### 2-2. 응답 형식 통일 (`src/common/interceptors/response.interceptor.ts`)

모든 API 응답이 같은 형식을 갖도록 **인터셉터(Interceptor)**가 자동으로 감싸줍니다.

인터셉터란, 컨트롤러가 결과를 반환한 **직후**에 실행되는 코드입니다. 아래처럼 동작합니다:

```
Service가 반환한 값          →  인터셉터가 감싸줌            →  클라이언트가 받는 값

{ id: 1, name: '커피' }     →  자동 감싸기                  →  { statusCode: 200,
                                                                  message: 'success',
                                                                  data: { id: 1, name: '커피' } }

{ message: '완료',           →  message/data가 이미 있으면   →  { statusCode: 201,
  data: { order_id: '...' }}     그대로 사용                     message: '완료',
                                                                  data: { order_id: '...' } }
```

**왜 이렇게 하나요?**
- 프론트엔드에서 항상 `response.data`, `response.message`로 접근할 수 있어서 코드가 일관됩니다
- 각 Service에서 매번 형식을 맞출 필요가 없습니다

### 2-3. 에러 형식 통일 (`src/common/filters/http-exception.filter.ts`)

에러도 마찬가지로 **필터(Filter)**가 잡아서 통일된 형식으로 변환합니다.

```
NestJS가 던지는 에러                               클라이언트가 받는 에러

throw new BadRequestException('이메일 중복')   →   { statusCode: 400,
                                                     message: '이메일 중복',
                                                     error: 'Bad Request' }

throw new UnauthorizedException('...')         →   { statusCode: 401,
                                                     message: '...',
                                                     error: 'Unauthorized' }
```

- DTO 검증 실패 시 NestJS가 자동으로 BadRequestException을 던지는데, 이때 에러 메시지가 배열로 올 수 있습니다
- 필터에서 배열인 경우 **첫 번째 메시지만** 꺼내서 반환합니다

### 2-4. 입력값 자동 검증 (ValidationPipe + DTO)

**DTO(Data Transfer Object)**란, "이 API에는 이런 형식의 데이터가 와야 한다"는 것을 정의한 클래스입니다.

`main.ts`에서 전역 설정:
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // DTO에 정의되지 않은 필드는 자동 제거
  forbidNonWhitelisted: true, // 정의되지 않은 필드가 오면 에러
  transform: true,           // 쿼리 파라미터 문자열 → 숫자 자동 변환
}));
```

예를 들어 회원가입 DTO:
```typescript
// src/auth/dto/register.dto.ts
export class RegisterDto {
  @IsEmail()          // 이메일 형식이 아니면 자동 에러
  email: string;

  @MinLength(8)       // 8자 미만이면 자동 에러
  password: string;
  // ...
}
```

**동작 방식:**
1. 클라이언트가 `POST /auth/register`에 데이터를 보냄
2. NestJS가 자동으로 RegisterDto 형식에 맞는지 검사
3. 맞지 않으면 Controller에 도달하기 **전에** 400 에러 반환
4. 맞으면 Controller로 전달

### 2-5. JWT 인증 구조

JWT(JSON Web Token)는 로그인 후 서버가 발급하는 "출입증" 같은 것입니다.

**토큰 발급 과정 (로그인 시):**
```
1. 사용자가 이메일/비밀번호로 로그인
2. 서버가 비밀번호 확인 후 JWT 토큰 생성
   - 토큰 안에 들어가는 정보: { sub: "유저ID", email: "유저이메일" }
   - JWT_SECRET 키로 서명 (위조 방지)
   - JWT_EXPIRES_IN 만큼 유효 (기본 7일)
3. 토큰을 클라이언트에 반환
```

**토큰 검증 과정 (인증 필요 API 호출 시):**
```
src/common/strategies/jwt.strategy.ts + src/common/guards/jwt.guard.ts

1. 클라이언트가 헤더에 토큰을 넣어 요청: Authorization: Bearer eyJhbGci...
2. JwtGuard가 요청을 가로챔
3. JwtStrategy가 토큰을 꺼내서 검증
   - JWT_SECRET으로 서명 확인 (위조 여부)
   - 만료일 확인
4. 검증 성공 시 토큰에서 { id, email }을 꺼내 request.user에 저장
5. 검증 실패 시 401 에러 자동 반환
```

**@CurrentUser() 데코레이터:**
```
src/common/decorators/current-user.decorator.ts
```
- `request.user`에서 사용자 정보를 꺼내주는 편의 도구
- Controller에서 `@CurrentUser() user: JwtPayload`로 쓰면 `{ id: "유저ID", email: "유저이메일" }`을 받을 수 있음

### 2-6. 로거 미들웨어 (`src/common/middleware/logger.middleware.ts`)

모든 HTTP 요청/응답을 콘솔에 기록합니다.

```
[HTTP] POST /auth/login | 200 | 45ms | Body: {"email":"cafe@bizmart.com","password":"..."}
[HTTP] GET /products?sort=popular | 200 | 120ms
[HTTP] GET /orders/BM-9999 | 404 | 12ms                     ← 에러는 warn 레벨
```

- 응답이 완료된 **후에** 로그를 찍습니다 (소요 시간 측정을 위해)
- GET 요청은 Body를 로그에 포함하지 않습니다
- 400 이상 상태 코드는 `warn` 레벨로 출력됩니다

---

## 3. 인증 (Auth) — 회원가입 / 로그인 / 로그아웃

**파일 위치:** `src/auth/`

### 3-1. 회원가입 `POST /auth/register`

```
클라이언트가 보내는 데이터:
{ email, password, business_number, business_type, company_name, owner_name }

                    ↓

[RegisterDto 검증] 이메일 형식? 비밀번호 8자 이상? 필수값 다 있나?
                    ↓ (검증 실패시 400 에러)

[AuthService.register()]
  1. Supabase에서 이메일 중복 확인
     → SELECT id FROM shop_users WHERE email = '입력한이메일'
     → 이미 있으면 "이미 등록된 이메일입니다" 에러 (400)

  2. 비밀번호 암호화
     → bcrypt.hash(비밀번호, 10)
     → "password123" → "$2b$10$xR3k..." 같은 해시값으로 변환
     → DB에는 이 해시값만 저장 (원래 비밀번호는 저장하지 않음)
     → 10은 "솔트 라운드" — 숫자가 클수록 보안은 높지만 느림

  3. DB에 유저 정보 저장
     → INSERT INTO shop_users (...) RETURNING id, email, business_type, grade
     → grade는 기본값 '일반'이 DB에서 자동 설정됨

  4. JWT 토큰 생성
     → { sub: "방금생성된유저ID", email: "입력한이메일" }을 JWT로 서명

  5. 응답 반환
     → { access_token: "토큰", user: { id, email, business_type, grade } }
```

### 3-2. 로그인 `POST /auth/login`

```
클라이언트가 보내는 데이터:
{ email, password }

                    ↓

[LoginDto 검증]
                    ↓

[AuthService.login()]
  1. 이메일로 유저 조회
     → SELECT * FROM shop_users WHERE email = '입력한이메일'
     → 없으면 "이메일 또는 비밀번호가 올바르지 않습니다" (401)
     → 주의: "이메일이 없다"고 알려주면 보안 취약점이므로 두루뭉술하게 답변

  2. 비밀번호 비교
     → bcrypt.compare("입력한비밀번호", "DB에저장된해시값")
     → bcrypt가 내부적으로 해시를 만들어서 비교함
     → 불일치 시 같은 에러 메시지 (401)

  3. JWT 토큰 생성 + 응답
     → 회원가입과 동일 방식
     → 추가로 company_name도 응답에 포함 (로그인 시 바로 화면에 표시하려고)
```

### 3-3. 로그아웃 `POST /auth/logout`

```
[JwtGuard] 토큰 검증 (로그인 상태 확인)
                    ↓
[AuthController.logout()]
  → 그냥 { message: "로그아웃 되었습니다", data: null } 반환
  → 서버에서는 아무 것도 하지 않음
```

**왜 서버에서 아무 것도 안 하나요?**
- JWT는 **Stateless(상태 없음)** 방식입니다
- 서버가 "이 토큰은 무효"라고 기억하려면 별도의 블랙리스트 저장소(Redis 등)가 필요합니다
- 포트폴리오 프로젝트이므로 복잡도를 줄이기 위해, 프론트엔드에서 토큰을 삭제하는 것으로 로그아웃 처리합니다
- 토큰은 `JWT_EXPIRES_IN`(기본 7일) 후에 자연 만료됩니다

---

## 4. 유저 (Users) — 내 정보 조회 / 수정

**파일 위치:** `src/users/`

이 모듈은 컨트롤러 전체에 `@UseGuards(JwtGuard)`가 걸려 있어서, 모든 엔드포인트가 로그인 필수입니다.

### 4-1. 내 정보 조회 `GET /users/me`

```
[JwtGuard] 토큰에서 유저 ID 추출
                    ↓
[UsersService.findMe(userId)]
  → SELECT id, email, business_number, business_type,
           company_name, owner_name, grade, created_at
    FROM shop_users WHERE id = '토큰에서꺼낸유저ID'
  → password 컬럼은 SELECT하지 않음 (보안)
  → 없으면 404 에러
```

**포인트:**
- URL에 유저 ID가 없고 `/me`만 있습니다
- 유저 ID는 JWT 토큰에서 자동으로 꺼냅니다
- 다른 사람의 정보는 절대 볼 수 없는 구조입니다

### 4-2. 내 정보 수정 `PATCH /users/me`

```
[JwtGuard] 토큰에서 유저 ID 추출
                    ↓
[UpdateUserDto 검증] 모든 필드가 선택적(Optional)
                    ↓
[UsersService.updateMe(userId, dto)]
  → UPDATE shop_users
    SET company_name = '새값', business_type = '새값'  (보낸 필드만)
    WHERE id = '토큰에서꺼낸유저ID'
    RETURNING id, email, business_number, ... (password 제외)
```

**포인트:**
- `PATCH`이므로 변경하고 싶은 필드만 보내면 됩니다
- email과 grade는 수정 불가능합니다 (DTO에 정의되지 않아서 whitelist에 의해 무시됨)
- 수정 후 변경된 전체 유저 정보를 반환합니다

---

## 5. 상품 (Products) — 목록 / 상세

**파일 위치:** `src/products/`

상품 조회는 **인증 없이** 누구나 접근 가능합니다 (JwtGuard 없음).

### 5-1. 상품 목록 `GET /products`

이 API는 정렬 방식에 따라 **두 가지 다른 경로**로 처리됩니다:

#### A. 일반 정렬 (latest, price_asc, price_desc)

```
GET /products?category=식자재&sort=price_asc&page=2&limit=10

[ProductQueryDto 검증 + 변환]
  → page, limit는 문자열로 들어오지만 transform: true 덕분에 자동으로 숫자로 변환
  → sort가 허용된 값(latest/popular/price_asc/price_desc)인지 확인
                    ↓
[ProductsService.findAll()]
  sort가 'popular'이 아니면 → Supabase 직접 쿼리:

  SELECT id, name, category, price_per_unit, price_per_box, moq, image_url
  FROM shop_products
  WHERE category = '식자재'           ← category 파라미터가 있을 때만
    AND name ILIKE '%검색어%'         ← search 파라미터가 있을 때만
  ORDER BY price_per_box ASC          ← sort에 따라 달라짐
  LIMIT 10 OFFSET 10                  ← (page-1) * limit = offset

  → ILIKE는 대소문자 구분 없는 검색 (LIKE의 대소문자 무시 버전)
  → { count: 'exact' } 옵션으로 전체 개수도 함께 가져옴
```

**정렬 옵션별 ORDER BY:**
| sort 값 | ORDER BY |
|---------|----------|
| latest (기본값) | created_at DESC (최신순) |
| price_asc | price_per_box ASC (가격 낮은순) |
| price_desc | price_per_box DESC (가격 높은순) |

#### B. 인기순 정렬 (popular)

```
GET /products?sort=popular

[ProductsService.findAll()]
  sort가 'popular'이면 → PostgreSQL rpc 함수 호출:

  supabase.rpc('get_popular_products', {
    p_category: '식자재' 또는 null,
    p_search: '검색어' 또는 null,
    p_offset: 0,
    p_limit: 20
  })
```

**왜 인기순만 rpc 함수를 쓰나요?**
- 인기순은 "이 상품이 총 몇 번 주문되었는가"를 계산해야 합니다
- 이를 위해 `shop_products`와 `shop_order_items` 테이블을 **조인(JOIN)**해서 주문 수를 세야 합니다
- Supabase SDK의 일반 쿼리로는 이런 복잡한 조인+집계가 어렵습니다
- 그래서 PostgreSQL 함수(`get_popular_products`)에 이 로직을 넣어두고 호출합니다

**rpc 응답 후처리:**
- rpc 함수는 각 행에 `total`(전체 개수) 필드를 포함해서 반환합니다
- Service에서 첫 번째 행의 `total`을 꺼내고, 각 행에서 `total`을 제거한 후 반환합니다

### 5-2. 상품 상세 `GET /products/:id`

```
GET /products/550e8400-e29b-41d4-a716-446655440000

[ProductsService.findById(id)]
  → SELECT * FROM shop_products WHERE id = '파라미터ID'
  → 없으면 "상품을 찾을 수 없습니다" (404)
  → 있으면 모든 필드 반환 (목록에서 생략된 origin, expiry_info 포함)
```

---

## 6. 주문 (Orders) — 주문 생성 / 조회

**파일 위치:** `src/orders/`

모든 엔드포인트가 로그인 필수입니다.

### 6-1. 주문 생성 `POST /orders`

이 API가 가장 복잡합니다. **핵심은 "주문 생성을 DB 함수(rpc)에 맡긴다"는 것입니다.**

```
클라이언트가 보내는 데이터:
{
  items: [{ product_id: "uuid", quantity: 2 }, ...],
  delivery_address: "서울시...",
  delivery_date: "2025-04-03",   // 선택
  is_cold: false                 // 선택
}

                    ↓

[CreateOrderDto 검증]
  → items 배열이 1개 이상인지?
  → 각 item의 product_id가 UUID 형식인지?
  → 각 item의 quantity가 1 이상인지?
  → delivery_address가 비어있지 않은지?
  → @ValidateNested — 배열 안의 각 객체도 개별 검증
                    ↓

[JwtGuard] 토큰에서 유저 ID 추출
                    ↓

[OrdersService.create(userId, dto)]
  → supabase.rpc('create_order', {
      p_user_id: '토큰에서꺼낸유저ID',
      p_items: [{ product_id, quantity }, ...],
      p_delivery_address: '서울시...',
      p_delivery_date: '2025-04-03',
      p_is_cold: false
    })
                    ↓

[PostgreSQL create_order 함수가 하는 일] (DB 안에서 실행)

  1단계: 주문번호 생성
    → 오늘 날짜의 마지막 주문 번호를 찾음
    → 예: 오늘이 2025-03-25이고 마지막이 BM-20250325-0062이면
    → 다음 번호: BM-20250325-0063

  2단계: 상품 유효성 확인 + 가격 조회
    → 주문에 포함된 모든 product_id가 실제로 존재하는지 확인
    → 각 상품의 price_per_box(박스 단가)를 가져옴

  3단계: 총 금액 계산
    → (상품1 박스단가 x 수량) + (상품2 박스단가 x 수량) + ...

  4단계: 주문 헤더 생성
    → INSERT INTO shop_orders (order_number, user_id, total_amount, ...)

  5단계: 주문 상품 생성
    → INSERT INTO shop_order_items (order_id, product_id, quantity, unit_price)
    → 상품마다 한 행씩

  6단계: 결과 반환
    → { order_id: "BM-20250325-0063", total_amount: 130100, status: "주문완료" }

  * 이 모든 과정이 하나의 트랜잭션으로 실행됩니다
```

**왜 트랜잭션이 필요한가요?**

트랜잭션이란 "여러 작업을 하나로 묶어서, 전부 성공하거나 전부 취소하는 것"입니다.

주문 생성에는 최소 2개의 INSERT가 필요합니다:
1. `shop_orders`에 주문 헤더 생성
2. `shop_order_items`에 주문 상품들 생성

만약 1번은 성공했는데 2번에서 에러가 나면?
- 트랜잭션 없음: 주문은 있는데 상품 목록이 없는 "유령 주문"이 생김
- 트랜잭션 있음: 1번도 자동으로 취소됨 → 깔끔

NestJS 코드에서 직접 트랜잭션을 관리하지 않고 PostgreSQL 함수에 넣은 이유:
- Supabase SDK는 기본적으로 각 쿼리가 **독립적**입니다
- 여러 쿼리를 하나의 트랜잭션으로 묶으려면 PostgreSQL 함수를 써야 합니다
- 이렇게 하면 `supabase.rpc('create_order', ...)` 한 번 호출로 끝납니다

**Mock 결제란?**
- 실제 결제 시스템(PG사)을 연동하지 않았다는 뜻입니다
- 주문을 생성하면 바로 `status: '주문완료'`로 처리됩니다
- 실제 서비스라면 여기에 토스페이먼츠 같은 PG 결제 승인 로직이 추가됩니다

### 6-2. 주문 목록 `GET /orders`

```
GET /orders?status=배송중

[OrdersService.findAllByUser(userId, status)]
  → SELECT order_number, status, total_amount, delivery_date, is_cold, created_at
    FROM shop_orders
    WHERE user_id = '토큰에서꺼낸유저ID'
      AND status = '배송중'              ← status 파라미터가 있고 'all'이 아닐 때만
    ORDER BY created_at DESC

  → 응답에서 order_number를 id로 변환하여 반환
    (DB 내부의 uuid가 아닌, 사람이 읽을 수 있는 주문번호를 id로 사용)
```

**왜 order_number를 id로 바꿔서 반환하나요?**
- DB에서 주문의 실제 PK는 UUID입니다 (예: `550e8400-...`)
- 하지만 사용자에게 보여주는 주문번호는 `BM-20250325-0063` 형식입니다
- API 응답에서 `id` 필드에 이 주문번호를 넣어서, 프론트엔드가 이 값으로 주문 상세를 조회할 수 있게 합니다

### 6-3. 주문 상세 `GET /orders/:id`

```
GET /orders/BM-20250325-0063

[OrdersService.findOne(orderNumber, userId)]

  1단계: 주문 헤더 조회
    → SELECT * FROM shop_orders
      WHERE order_number = 'BM-20250325-0063'
        AND user_id = '토큰에서꺼낸유저ID'      ← 본인 주문만 조회 가능!
    → 없으면 404 에러

  2단계: 주문 상품 목록 조회
    → SELECT product_id, quantity, unit_price, shop_products(name)
      FROM shop_order_items
      WHERE order_id = '1단계에서가져온내부UUID'
    → shop_products(name)은 Supabase의 관계 조회 기능
      (SQL의 JOIN과 같음 — product_id로 연결된 상품의 이름을 가져옴)

  3단계: 두 결과를 합쳐서 반환
    → 주문 정보 + 상품 목록을 하나의 객체로 조합
```

**보안 포인트:**
- `WHERE user_id = '토큰유저ID'` 조건이 있어서, 다른 사람의 주문을 조회하면 404가 됩니다
- 주문번호를 안다고 해서 볼 수 있는 게 아닙니다

---

## 7. 트렌드 (Trend) — 랭킹 / 베스트셀러

**파일 위치:** `src/trend/`

모든 엔드포인트가 로그인 필수입니다. 집계 로직이 복잡하므로 전부 PostgreSQL rpc 함수에서 처리합니다.

### 7-1. 트렌드 리포트 `GET /trend/report`

```
GET /trend/report?period=weekly&limit=10

[TrendReportQueryDto 검증]
  → period가 'weekly' 또는 'monthly'인지?
  → limit가 1~50 사이인지?
                    ↓

[TrendService.getReport(period, limit)]
  → supabase.rpc('get_trend_report', {
      p_period: 'weekly',
      p_limit: 10
    })
                    ↓

[PostgreSQL get_trend_report 함수가 하는 일]

  1단계: "이번 기간" 주문 집계
    → weekly: 최근 7일간 각 상품의 주문 수량 합계
    → monthly: 최근 30일간 각 상품의 주문 수량 합계
    → shop_orders + shop_order_items를 조인해서 계산

  2단계: "이전 기간" 주문 집계
    → weekly: 그 이전 7일간 (7~14일 전)
    → monthly: 그 이전 30일간 (30~60일 전)

  3단계: 순위 비교
    → 이번 기간 순위와 이전 기간 순위를 비교
    → change 값 결정:
       - 'new': 이전 기간에 없었던 상품
       - 'up': 이전보다 순위가 올라감
       - 'down': 이전보다 순위가 내려감
       - 'same': 순위가 같음

  4단계: 결과 반환
    → [{ rank, product_id, name, category, order_count, change }, ...]

                    ↓

[TrendService에서 후처리]
  → generated_at에 현재 시각 추가 (서버 시각 기준)
  → 응답: { period, generated_at, ranking: [...] }
```

**왜 이 로직을 DB에서 처리하나요?**
- "이번 기간"과 "이전 기간"의 주문을 각각 집계하고 비교하려면 복잡한 SQL이 필요합니다
- NestJS에서 여러 번 쿼리를 보내는 것보다, DB 안에서 한 번에 계산하는 게 훨씬 빠릅니다
- 특히 대량 데이터에서 성능 차이가 큽니다

### 7-2. 업종별 베스트셀러 `GET /trend/best`

```
GET /trend/best?type=카페/베이커리&limit=10

[TrendBestQueryDto 검증]
  → type이 비어있지 않은지? (필수값)
  → limit가 1~50 사이인지?
                    ↓

[TrendService.getBest(businessType, limit)]
  → supabase.rpc('get_trend_best', {
      p_business_type: '카페/베이커리',
      p_limit: 10
    })
                    ↓

[PostgreSQL get_trend_best 함수가 하는 일]

  1단계: 해당 업종 유저들의 주문 찾기
    → shop_users에서 business_type = '카페/베이커리'인 유저들의 ID 수집
    → 그 유저들이 한 주문(shop_orders) 찾기

  2단계: 상품별 주문 횟수 집계
    → shop_order_items에서 각 상품이 몇 번 주문되었는지 합산
    → shop_products와 조인해서 상품명, 카테고리 가져오기

  3단계: 순위 매기기
    → 주문 횟수 내림차순 정렬
    → ROW_NUMBER()로 순위 부여
    → 상위 N개만 반환

  결과: [{ rank, product_id, name, category, order_count }, ...]
```

**활용 시나리오:**
- "카페를 운영하는 사장님들이 가장 많이 주문하는 상품이 뭔가요?"에 대한 답을 제공합니다
- 같은 업종의 다른 사장님들이 어떤 상품을 많이 사는지 참고할 수 있습니다

---

## 8. DB 함수(rpc) 정리

모든 함수는 `supabase/migrations/002_create_functions.sql`에 정의되어 있습니다.

| 함수명 | 호출하는 곳 | 용도 | 입력값 |
|--------|------------|------|--------|
| `create_order` | OrdersService.create() | 주문+상품 한번에 생성 (트랜잭션) | user_id, items[], address, date, is_cold |
| `get_popular_products` | ProductsService.findByPopularity() | 주문수 기반 인기순 정렬 | category?, search?, offset, limit |
| `get_trend_report` | TrendService.getReport() | 주간/월간 트렌드 + 변동 | period, limit |
| `get_trend_best` | TrendService.getBest() | 업종별 베스트셀러 | business_type, limit |

**왜 이것들만 rpc인가요?**
- 일반 CRUD(생성, 조회, 수정, 삭제)는 Supabase SDK 쿼리로 충분합니다
- 하지만 아래 경우는 SQL을 직접 작성해야 해서 rpc 함수를 사용합니다:
  - **여러 테이블에 동시에 쓰기** (create_order: 트랜잭션 필요)
  - **복잡한 JOIN + 집계** (인기순, 트렌드: 여러 테이블 조인 후 COUNT, RANK 등)
  - **기간 비교 로직** (트렌드: 이번 기간 vs 이전 기간)

---

## 9. 파일 구조 요약

```
src/
├── main.ts                          # 앱 시작점 (CORS, ValidationPipe, 포트 설정)
├── app.module.ts                    # 모든 모듈 등록 + 전역 인터셉터/필터
│
├── auth/
│   ├── auth.module.ts               # JWT, Passport 설정
│   ├── auth.controller.ts           # POST /auth/register, login, logout
│   ├── auth.service.ts              # 이메일 중복확인, bcrypt, JWT 발급
│   └── dto/
│       ├── register.dto.ts          # 회원가입 입력 검증
│       └── login.dto.ts             # 로그인 입력 검증
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts          # GET/PATCH /users/me
│   ├── users.service.ts             # 유저 조회/수정
│   └── dto/
│       └── update-user.dto.ts       # 수정 입력 검증 (모든 필드 Optional)
│
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts       # GET /products, /products/:id
│   ├── products.service.ts          # 목록(필터/정렬/검색/페이징), 상세, 인기순(rpc)
│   └── dto/
│       └── product-query.dto.ts     # 쿼리 파라미터 검증 (sort, page, limit 등)
│
├── orders/
│   ├── orders.module.ts
│   ├── orders.controller.ts         # POST /orders, GET /orders, /orders/:id
│   ├── orders.service.ts            # 주문생성(rpc), 목록, 상세(상품 조인)
│   └── dto/
│       └── create-order.dto.ts      # 주문 입력 검증 (중첩 배열 검증 포함)
│
├── trend/
│   ├── trend.module.ts
│   ├── trend.controller.ts          # GET /trend/report, /trend/best
│   ├── trend.service.ts             # 트렌드 리포트(rpc), 베스트셀러(rpc)
│   └── dto/
│       └── trend-query.dto.ts       # period/type/limit 검증
│
└── common/
    ├── supabase/
    │   ├── supabase.module.ts       # @Global 모듈 — 모든 모듈에서 사용 가능
    │   └── supabase.service.ts      # Supabase 클라이언트 생성 및 제공
    ├── guards/
    │   └── jwt.guard.ts             # @UseGuards(JwtGuard) — 인증 필요 표시
    ├── strategies/
    │   └── jwt.strategy.ts          # JWT 토큰 파싱 → { id, email } 추출
    ├── interceptors/
    │   └── response.interceptor.ts  # 응답을 { statusCode, message, data }로 통일
    ├── filters/
    │   └── http-exception.filter.ts # 에러를 { statusCode, message, error }로 통일
    ├── decorators/
    │   └── current-user.decorator.ts # @CurrentUser() — request.user 추출 편의 도구
    ├── middleware/
    │   └── logger.middleware.ts      # 모든 요청/응답 로그 기록
    └── types/
        └── database.types.ts        # TypeScript 타입 정의 (DB 행 타입, JWT 페이로드 등)
```

---

## 전체 API 요약표

| 모듈 | 엔드포인트 | 메서드 | 인증 | DB 접근 방식 |
|------|-----------|--------|------|-------------|
| Auth | /auth/register | POST | - | INSERT shop_users |
| Auth | /auth/login | POST | - | SELECT shop_users + bcrypt 비교 |
| Auth | /auth/logout | POST | O | DB 접근 없음 |
| Users | /users/me | GET | O | SELECT shop_users |
| Users | /users/me | PATCH | O | UPDATE shop_users |
| Products | /products | GET | - | SELECT shop_products 또는 rpc get_popular_products |
| Products | /products/:id | GET | - | SELECT shop_products |
| Orders | /orders | POST | O | rpc create_order (트랜잭션) |
| Orders | /orders | GET | O | SELECT shop_orders |
| Orders | /orders/:id | GET | O | SELECT shop_orders + SELECT shop_order_items (조인) |
| Trend | /trend/report | GET | O | rpc get_trend_report |
| Trend | /trend/best | GET | O | rpc get_trend_best |
