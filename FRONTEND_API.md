# BizMart 프론트엔드 API 연동 가이드

> 프론트엔드 개발자용 — 백엔드 API 빠른 참조 문서

---

## 서버 정보

```
개발: http://localhost:3001
운영: https://bizmart-backend.onrender.com
```

---

## 인증 방식

JWT 토큰을 `Authorization` 헤더에 넣어 요청합니다.

```typescript
// 로그인 후 받은 토큰 저장
const token = response.data.access_token;
localStorage.setItem('token', token);

// API 요청 시 헤더에 포함
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
};
```

---

## 테스트 계정

| 이메일 | 비밀번호 | 업종 | 등급 |
|--------|----------|------|------|
| `cafe@bizmart.com` | `password123` | 카페/베이커리 | 일반 |
| `restaurant@bizmart.com` | `password123` | 식당/외식업 | 프리미엄 |
| `salon@bizmart.com` | `password123` | 미용실/뷰티 | VIP |
| `mart@bizmart.com` | `password123` | 편의점/소매업 | 일반 |
| `nail@bizmart.com` | `password123` | 네일샵/피부샵 | 프리미엄 |

---

## API 목록

### 1. 인증 (Auth)

#### 회원가입
```
POST /auth/register
```
```json
// Body
{
  "email": "test@bizmart.com",
  "password": "password123",
  "business_number": "123-45-67890",
  "business_type": "카페/베이커리",
  "company_name": "테스트 카페",
  "owner_name": "홍길동"
}

// Response 201
{
  "statusCode": 201,
  "message": "회원가입이 완료되었습니다",
  "data": {
    "access_token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "test@bizmart.com",
      "business_type": "카페/베이커리",
      "grade": "일반"
    }
  }
}
```

#### 로그인
```
POST /auth/login
```
```json
// Body
{
  "email": "cafe@bizmart.com",
  "password": "password123"
}

// Response 200
{
  "statusCode": 200,
  "message": "로그인 되었습니다",
  "data": {
    "access_token": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "cafe@bizmart.com",
      "company_name": "하늘빛 카페",
      "business_type": "카페/베이커리",
      "grade": "일반"
    }
  }
}
```

#### 로그아웃
```
POST /auth/logout        🔒 인증 필요
```
```json
// Response 200
{
  "statusCode": 200,
  "message": "로그아웃 되었습니다",
  "data": null
}
```

---

### 2. 유저 (Users)

#### 내 정보 조회
```
GET /users/me            🔒 인증 필요
```
```json
// Response 200
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "email": "cafe@bizmart.com",
    "business_number": "123-45-67890",
    "business_type": "카페/베이커리",
    "company_name": "하늘빛 카페",
    "owner_name": "김민준",
    "grade": "일반",
    "created_at": "2026-02-27T00:00:00Z"
  }
}
```

#### 내 정보 수정
```
PATCH /users/me          🔒 인증 필요
```
```json
// Body (변경할 필드만)
{
  "company_name": "새로운 카페",
  "business_type": "식당/외식업"
}
```

---

### 3. 상품 (Products)

#### 상품 목록 조회
```
GET /products
GET /products?category=식자재
GET /products?sort=popular
GET /products?search=커피
GET /products?category=소모품&sort=price_asc&page=1&limit=10
```

| 파라미터 | 값 | 기본값 |
|---------|-----|--------|
| `category` | 식자재, 소모품, 포장재, 뷰티용품, 인테리어, 기타 | 전체 |
| `sort` | latest, popular, price_asc, price_desc | latest |
| `search` | 검색어 | - |
| `page` | 1~ | 1 |
| `limit` | 1~100 | 20 |

```json
// Response 200
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "프리미엄 원두커피 1kg",
        "category": "식자재",
        "price_per_unit": 25000,
        "price_per_box": 25000,
        "moq": 1,
        "image_url": "https://placehold.co/400x400?text=원두커피"
      }
    ],
    "total": 28,
    "page": 1,
    "limit": 20
  }
}
```

#### 상품 상세 조회
```
GET /products/:id
```
```json
// Response 200
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "프리미엄 원두커피 1kg",
    "category": "식자재",
    "price_per_unit": 25000,
    "price_per_box": 25000,
    "moq": 1,
    "origin": "콜롬비아",
    "expiry_info": "제조일로부터 12개월",
    "image_url": "https://placehold.co/400x400?text=원두커피",
    "created_at": "2026-03-29T..."
  }
}
```

---

### 4. 주문 (Orders)

#### 주문 생성
```
POST /orders             🔒 인증 필요
```
```json
// Body
{
  "items": [
    { "product_id": "상품uuid", "quantity": 2 },
    { "product_id": "상품uuid", "quantity": 1 }
  ],
  "delivery_address": "서울특별시 마포구 합정동 123-45",
  "delivery_date": "2026-04-05",
  "is_cold": false
}

// Response 201
{
  "statusCode": 201,
  "message": "주문이 완료되었습니다",
  "data": {
    "order_id": "BM-20260329-0001",
    "total_amount": 77500,
    "status": "주문완료"
  }
}
```

#### 내 주문 목록
```
GET /orders              🔒 인증 필요
GET /orders?status=주문완료
GET /orders?status=배송중
```

| 파라미터 | 값 | 기본값 |
|---------|-----|--------|
| `status` | all, 주문완료, 배송준비, 배송중, 배송완료 | all |

```json
// Response 200
{
  "statusCode": 200,
  "message": "success",
  "data": [
    {
      "id": "BM-20260328-0001",
      "status": "주문완료",
      "total_amount": 80000,
      "delivery_date": "2026-04-02",
      "is_cold": false,
      "created_at": "2026-03-28T02:00:00Z"
    }
  ]
}
```

#### 주문 상세 조회
```
GET /orders/:id          🔒 인증 필요
```
> `:id`는 주문번호 (예: `BM-20260328-0001`)

```json
// Response 200
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "BM-20260328-0001",
    "status": "주문완료",
    "total_amount": 80000,
    "delivery_address": "서울특별시 마포구 합정동 123-45",
    "delivery_date": "2026-04-02",
    "is_cold": false,
    "items": [
      {
        "product_id": "uuid",
        "name": "프리미엄 원두커피 1kg",
        "quantity": 2,
        "unit_price": 25000
      }
    ],
    "created_at": "2026-03-28T02:00:00Z"
  }
}
```

---

### 5. 트렌드 (Trend)

#### 인기 상품 랭킹
```
GET /trend/report                    🔒 인증 필요
GET /trend/report?period=weekly
GET /trend/report?period=monthly&limit=5
```

| 파라미터 | 값 | 기본값 |
|---------|-----|--------|
| `period` | weekly, monthly | weekly |
| `limit` | 1~50 | 10 |

```json
// Response 200
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "period": "weekly",
    "generated_at": "2026-03-29T...",
    "ranking": [
      {
        "rank": 1,
        "product_id": "uuid",
        "name": "프리미엄 원두커피 1kg",
        "category": "식자재",
        "order_count": 7,
        "change": "up"
      }
    ]
  }
}
```

> `change`: `up` (순위 상승), `down` (하락), `same` (유지), `new` (신규 진입)

#### 업종별 베스트셀러
```
GET /trend/best?type=카페/베이커리    🔒 인증 필요
GET /trend/best?type=식당/외식업&limit=5
```

| 파라미터 | 값 | 필수 |
|---------|-----|------|
| `type` | 카페/베이커리, 식당/외식업, 미용실/뷰티, 편의점/소매업, 네일샵/피부샵 | ✅ |
| `limit` | 1~50 | ❌ (기본 10) |

```json
// Response 200
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
        "order_count": 7
      }
    ]
  }
}
```

---

## 에러 응답 형식

모든 에러는 동일한 형식입니다:

```json
{
  "statusCode": 400,
  "message": "에러 메시지",
  "error": "Bad Request"
}
```

| 코드 | 의미 | 대처 |
|------|------|------|
| 400 | 입력값 오류 | `message` 확인 후 입력값 수정 |
| 401 | 인증 실패 | 토큰 만료 → 재로그인 |
| 404 | 리소스 없음 | ID 확인 |
| 500 | 서버 오류 | 백엔드 확인 필요 |

---

## fetch 예시 (프론트엔드)

```typescript
const API_URL = 'http://localhost:3001';

// 로그인
const login = async (email: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  localStorage.setItem('token', data.data.access_token);
  return data;
};

// 인증 필요한 요청
const fetchWithAuth = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
};

// 사용 예시
const products = await fetch(`${API_URL}/products`).then(r => r.json());
const myInfo = await fetchWithAuth('/users/me');
const orders = await fetchWithAuth('/orders');
const trend = await fetchWithAuth('/trend/report?period=weekly');
```

---

## 더미 데이터 현황

| 데이터 | 수량 | 비고 |
|--------|------|------|
| 유저 | 5명 | 업종별 1명씩, 비밀번호 모두 `password123` |
| 상품 | 28개 | 6개 카테고리 (식자재 6, 소모품 5, 포장재 5, 뷰티 5, 인테리어 4, 기타 3) |
| 주문 | 15건 | 주문완료 4, 배송준비 2, 배송중 3, 배송완료 6 |
| 주문 항목 | 30+건 | 주문당 2~3개 상품 |
