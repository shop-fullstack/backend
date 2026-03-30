# 프론트엔드 연동 가이드 — bizmart-backend

> 프론트엔드 개발자용 빠른 참조 문서
> API 상세 명세는 [API_DOCS.md](./API_DOCS.md) 참조

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

## fetch 예시

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

---

## 에러 처리

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
| 401 | 인증 실패 | 토큰 만료 시 재로그인 |
| 404 | 리소스 없음 | ID 확인 |
| 500 | 서버 오류 | 백엔드 확인 필요 |
