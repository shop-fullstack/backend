# API_DOCS.md — bizmart-backend
> 전체 API 명세 | 프론트엔드 및 관리자 참조용

---

## 기본 정보

| 항목 | 내용 |
|------|------|
| 개발 Base URL | `http://localhost:3001` |
| 운영 Base URL | `https://bizmart-backend.onrender.com` |
| 응답 형식 | JSON |
| 인증 방식 | Bearer JWT |

**공통 요청 헤더**
```
Authorization: Bearer {jwt_token}   # 인증 필요 라우트
Content-Type: application/json
```

**공통 성공 응답 형식**
```json
{
  "statusCode": 200,
  "message": "success",
  "data": { }
}
```

**공통 에러 응답 형식**
```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request"
}
```

---

## 1. 인증 `/auth`

### POST `/auth/register`
회원가입

| 항목 | 내용 |
|------|------|
| 인증 필요 | ❌ |
| 상태 코드 | 201 |

**요청 Body**
```json
{
  "email": "test@bizmart.com",
  "password": "password123",
  "business_number": "220-81-62517",
  "business_type": "카페/베이커리",
  "company_name": "하늘빛 카페",
  "owner_name": "김민준"
}
```

| 필드 | 타입 | 필수 | 검증 |
|------|------|------|------|
| email | string | ✅ | 이메일 형식 |
| password | string | ✅ | 최소 8자 |
| business_number | string | ✅ | - |
| business_type | string | ✅ | - |
| company_name | string | ✅ | - |
| owner_name | string | ✅ | - |

**성공 응답** `201`
```json
{
  "statusCode": 201,
  "message": "회원가입이 완료되었습니다",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "test@bizmart.com",
      "business_type": "카페/베이커리",
      "grade": "일반"
    }
  }
}
```

**에러 응답**
| 상태 코드 | message |
|-----------|---------|
| 400 | 이미 등록된 이메일입니다 |
| 400 | 올바른 이메일 형식이 아닙니다 |
| 400 | 비밀번호는 8자 이상이어야 합니다 |

---

### POST `/auth/login`
로그인

| 항목 | 내용 |
|------|------|
| 인증 필요 | ❌ |
| 상태 코드 | 200 |

**요청 Body**
```json
{
  "email": "test@bizmart.com",
  "password": "password123"
}
```

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "로그인 되었습니다",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "test@bizmart.com",
      "company_name": "하늘빛 카페",
      "business_type": "카페/베이커리",
      "grade": "일반"
    }
  }
}
```

**에러 응답**
| 상태 코드 | message |
|-----------|---------|
| 401 | 이메일 또는 비밀번호가 올바르지 않습니다 |

---

### POST `/auth/logout`
로그아웃 (Stateless JWT — 서버 측 처리 없음)

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |
| 상태 코드 | 200 |

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "로그아웃 되었습니다",
  "data": null
}
```

---

## 2. 유저 `/users`

### GET `/users/me`
내 정보 조회

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "email": "test@bizmart.com",
    "business_number": "220-81-62517",
    "business_type": "카페/베이커리",
    "company_name": "하늘빛 카페",
    "owner_name": "김민준",
    "grade": "일반",
    "created_at": "2025-03-27T00:00:00Z"
  }
}
```

---

### PATCH `/users/me`
내 사업자 정보 수정

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |

**요청 Body** (변경할 필드만 전송)
```json
{
  "company_name": "새로운 카페",
  "business_type": "식당/외식업"
}
```

| 필드 | 타입 | 필수 |
|------|------|------|
| company_name | string | ❌ |
| business_type | string | ❌ |
| owner_name | string | ❌ |
| business_number | string | ❌ |

**성공 응답** `200` — 수정된 전체 유저 정보 (GET /users/me와 동일 형식)

---

## 3. 상품 `/products`

### GET `/products`
상품 목록 조회

| 항목 | 내용 |
|------|------|
| 인증 필요 | ❌ |

**쿼리 파라미터**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| category | string | - | 식자재 / 소모품 / 포장재 / 뷰티용품 / 인테리어 / 기타 |
| sort | string | latest | latest / popular / price_asc / price_desc |
| search | string | - | 상품명 검색 (ILIKE) |
| page | number | 1 | 페이지 번호 (최소 1) |
| limit | number | 20 | 페이지당 개수 (최소 1, 최대 100) |

> `sort=popular`는 PostgreSQL rpc 함수(`get_popular_products`)로 주문 수량 기반 정렬

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "일회용 종이컵 6.5oz 1000개입",
        "category": "소모품",
        "price_per_unit": 28,
        "price_per_box": 27500,
        "moq": 1,
        "image_url": "https://..."
      }
    ],
    "total": 48,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET `/products/:id`
상품 상세 조회

| 항목 | 내용 |
|------|------|
| 인증 필요 | ❌ |

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "일회용 종이컵 6.5oz 1000개입",
    "category": "소모품",
    "price_per_unit": 28,
    "price_per_box": 27500,
    "moq": 1,
    "origin": "대한민국",
    "expiry_info": "제조일로부터 3년",
    "image_url": "https://...",
    "created_at": "2025-03-01T00:00:00Z"
  }
}
```

**에러 응답**
| 상태 코드 | message |
|-----------|---------|
| 404 | 상품을 찾을 수 없습니다 |

---

## 4. 주문 `/orders`

### POST `/orders`
주문 생성 (Mock 결제 포함 — 즉시 완료 처리)

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |
| 상태 코드 | 201 |
| 결제 처리 | Mock — PostgreSQL `create_order` 함수로 트랜잭션 처리, status 즉시 '주문완료' |

**요청 Body**
```json
{
  "items": [
    { "product_id": "uuid", "quantity": 2 },
    { "product_id": "uuid", "quantity": 3 }
  ],
  "delivery_address": "서울특별시 마포구 합정동 123-45",
  "delivery_date": "2025-04-03",
  "is_cold": false
}
```

| 필드 | 타입 | 필수 | 검증 |
|------|------|------|------|
| items | array | ✅ | 최소 1개, 각 항목에 product_id(UUID) + quantity(1 이상) |
| delivery_address | string | ✅ | 비어있으면 안 됨 |
| delivery_date | string | ❌ | YYYY-MM-DD 형식 |
| is_cold | boolean | ❌ | 기본값 false |

> `unit_price`는 주문 시점의 `products.price_per_box` 값으로 자동 설정

**성공 응답** `201`
```json
{
  "statusCode": 201,
  "message": "주문이 완료되었습니다",
  "data": {
    "order_id": "BM-20250325-0063",
    "total_amount": 130100,
    "status": "주문완료"
  }
}
```

**에러 응답**
| 상태 코드 | message |
|-----------|---------|
| 400 | 최소 1개 이상의 상품을 주문해야 합니다 |
| 400 | 상품을 찾을 수 없습니다: {product_id} |

---

### GET `/orders`
내 주문 목록 조회

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |

**쿼리 파라미터**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| status | string | all | all / 주문완료 / 배송준비 / 배송중 / 배송완료 |

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "id": "BM-20250325-0063",
      "status": "주문완료",
      "total_amount": 130100,
      "delivery_date": "2025-04-03",
      "is_cold": false,
      "created_at": "2025-03-25T10:00:00Z"
    }
  ]
}
```

---

### GET `/orders/:id`
주문 상세 / 배송 상태 조회

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |
| :id | 주문번호 (BM-YYYYMMDD-NNNN) |

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "BM-20250325-0063",
    "status": "배송중",
    "total_amount": 130100,
    "delivery_address": "서울특별시 마포구 합정동 123-45",
    "delivery_date": "2025-04-03",
    "is_cold": false,
    "items": [
      {
        "product_id": "uuid",
        "name": "일회용 종이컵 6.5oz 1000개입",
        "quantity": 2,
        "unit_price": 27500
      }
    ],
    "created_at": "2025-03-25T10:00:00Z"
  }
}
```

**에러 응답**
| 상태 코드 | message |
|-----------|---------|
| 404 | 주문을 찾을 수 없습니다 |

---

## 5. 트렌드 `/trend`

### GET `/trend/report`
주간/월간 TOP 상품 랭킹

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |
| 내부 구현 | PostgreSQL `get_trend_report` rpc 함수 |

**쿼리 파라미터**
| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| period | string | weekly | weekly / monthly |
| limit | number | 10 | 랭킹 개수 (최소 1, 최대 50) |

> `change` 필드: 이전 동일 기간 대비 순위 변동 (up / down / same / new)

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "period": "weekly",
    "generated_at": "2025-03-27T00:00:00Z",
    "ranking": [
      {
        "rank": 1,
        "product_id": "uuid",
        "name": "일회용 종이컵 6.5oz 1000개입",
        "category": "소모품",
        "order_count": 1240,
        "change": "up"
      }
    ]
  }
}
```

---

### GET `/trend/best`
업종별 베스트셀러 조회

| 항목 | 내용 |
|------|------|
| 인증 필요 | ✅ |
| 내부 구현 | PostgreSQL `get_trend_best` rpc 함수 |

**쿼리 파라미터**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| type | string | ✅ | 카페/베이커리, 식당/외식업, 미용실/뷰티, 편의점/소매업, 네일샵/피부샵 |
| limit | number | ❌ | 랭킹 개수 (기본 10, 최소 1, 최대 50) |

**성공 응답** `200`
```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "business_type": "카페/베이커리",
    "ranking": [
      {
        "rank": 1,
        "product_id": "uuid",
        "name": "프리미엄 원두커피 1kg",
        "category": "식자재",
        "order_count": 890
      }
    ]
  }
}
```

**에러 응답**
| 상태 코드 | message |
|-----------|---------|
| 400 | 업종(type)을 입력해주세요 |

---

## HTTP 상태 코드 요약

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 (회원가입, 주문 생성) |
| 400 | 잘못된 요청 (입력값 오류, DTO 검증 실패) |
| 401 | 인증 실패 (토큰 없음/만료/잘못된 비밀번호) |
| 404 | 리소스 없음 (상품/주문/유저 미존재) |
| 500 | 서버 오류 |
