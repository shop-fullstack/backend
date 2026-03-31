# AI 인사이트 연동 가이드 — 프론트엔드용

> 백엔드에서 추가된 AI 인사이트 기능 안내
> 기존 API 스펙은 그대로 유지되며, 응답에 `ai_insight` 필드가 **추가**되었습니다.

---

## 요약

기존에 DB 통계로만 반환하던 4개 API에 **Gemini AI가 분석한 자연어 코멘트**가 추가되었습니다.
프론트에서 숫자 데이터와 AI 해석을 함께 보여줄 수 있습니다.

| API | 기존 | 추가된 것 |
|-----|------|----------|
| `GET /trend/report` | 랭킹 + 순위 변동 | `ai_insight` — 변동 원인 분석 |
| `GET /trend/best` | 업종별 베스트셀러 | `ai_insight` — 업종 특성 연결 분석 |
| `GET /forecast` | 4주 수요 예측 수치 | `ai_insight` — 재고 관리 조언 |
| `GET /recommend` | 추천 상품 + 점수 | `ai_insight` — 추천 이유 설명 |

---

## 변경된 응답 형식

### 1. GET `/trend/report`

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "period": "weekly",
    "generated_at": "2026-03-31T00:00:00Z",
    "ranking": [
      {
        "rank": 1,
        "product_id": "uuid",
        "name": "프리미엄 원두커피 1kg",
        "category": "식자재",
        "order_count": 42,
        "change": "up"
      }
    ],
    "ai_insight": "이번 주 원두커피가 1위로 급상승했습니다. 봄 시즌 카페 매출 증가와 맞물려 원두 수요가 늘어난 것으로 보입니다. 종이컵과 빨대도 함께 상승 중이니, 카페 업종이라면 세트로 재고를 확보해두시는 것을 추천드립니다."
  }
}
```

**`ai_insight` 필드:**
- 타입: `string`
- 내용: 순위 변동 원인 추론 + 사장님에게 실용적 조언
- 길이: 3~4문장 (약 100~200자)

---

### 2. GET `/trend/best?type=카페/베이커리`

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "business_type": "카페/베이커리",
    "ranking": [ ... ],
    "ai_insight": "카페/베이커리 업종에서는 원두커피와 종이컵이 압도적인 1~2위를 차지하고 있습니다. 이는 카페 운영의 핵심 소모품이기 때문입니다. 설탕과 빨대도 꾸준한 수요를 보이고 있어, 함께 대량 구매하시면 비용을 절약할 수 있습니다."
  }
}
```

---

### 3. GET `/forecast?business_type=카페/베이커리`

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "business_type": "카페/베이커리",
    "period": "4주",
    "forecasts": [
      {
        "product_id": "uuid",
        "product_name": "프리미엄 원두커피 1kg",
        "category": "식자재",
        "current_weekly_avg": 15,
        "forecast": [
          {
            "week_label": "4/1~4/7",
            "predicted_orders": 18,
            "confidence_low": 14,
            "confidence_high": 22
          }
        ],
        "trend": "rising",
        "change_percent": 12
      }
    ],
    "ai_insight": "원두커피 수요가 주간 평균 15건에서 18건으로 상승 추세입니다. 4월 초 봄 시즌을 앞두고 수요가 더 증가할 수 있으니, 평소보다 20% 정도 여유 재고를 확보하시길 권합니다. 반면 종이컵은 안정적이라 현재 수준을 유지하셔도 됩니다.",
    "generated_at": "2026-03-31T00:00:00Z"
  }
}
```

---

### 4. GET `/recommend?business_type=카페/베이커리`

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "user_business_type": "카페/베이커리",
    "items": [
      {
        "product": {
          "id": "uuid",
          "name": "프리미엄 원두커피 1kg",
          "category": "식자재",
          "price_per_unit": 0,
          "price_per_box": 25000,
          "moq": 1,
          "image_url": "https://placehold.co/400x400?text=원두커피"
        },
        "reason": "업종 인기 상품",
        "score": 95,
        "reason_type": "business_type"
      }
    ],
    "ai_insight": "카페/베이커리 업종 사장님들이 가장 많이 주문하는 상품 위주로 추천드렸습니다. 원두커피는 전체 카페 업종의 90% 이상이 정기적으로 주문하는 필수 품목입니다. 종이컵과 빨대를 함께 구매하시면 배송비를 절약할 수 있습니다.",
    "generated_at": "2026-03-31T00:00:00Z"
  }
}
```

---

## 프론트엔드 사용 가이드

### 기본 사용법

```typescript
const res = await fetchWithAuth('/trend/report?period=weekly');
const { ranking, ai_insight } = res.data;

// 숫자 데이터: 기존 그대로 사용
ranking.forEach(item => renderRankingCard(item));

// AI 인사이트: 새로 추가된 부분
if (ai_insight) {
  renderAiInsightBox(ai_insight);
}
```

### UI 배치 제안

```
┌─────────────────────────────────────────┐
│  📊 주간 트렌드 리포트                     │
├─────────────────────────────────────────┤
│  1위  원두커피 ▲ 42건                     │
│  2위  종이컵  ● 38건                      │
│  3위  설탕    ▼ 25건                      │
├─────────────────────────────────────────┤
│  🤖 AI 분석                               │
│  "이번 주 원두커피가 1위로 급상승했습니다.   │
│   봄 시즌 카페 매출 증가와 맞물려..."       │
└─────────────────────────────────────────┘
```

### 주의사항

1. **`ai_insight`는 항상 존재합니다** — Gemini API 장애 시에도 fallback 메시지가 반환됩니다
2. **문자열 타입** — 별도 파싱 없이 바로 표시 가능
3. **기존 필드는 변경 없음** — `ranking`, `forecasts`, `items` 등 기존 필드는 그대로
4. **응답 시간** — AI 분석 때문에 기존보다 1~2초 정도 느려질 수 있음. 로딩 UI 권장

### 응답 시간이 걱정된다면

AI 인사이트는 부가 정보이므로, 프론트에서 이렇게 처리할 수 있습니다:

```typescript
// 방법 1: 먼저 데이터를 보여주고, AI 인사이트는 나중에 표시
const { ranking, ai_insight } = res.data;
renderRanking(ranking);           // 즉시 표시
renderAiInsight(ai_insight);      // 같이 표시되지만 스켈레톤 UI 활용 가능

// 방법 2: AI 인사이트 영역에 로딩 애니메이션
<div className="ai-insight">
  {isLoading ? <Skeleton /> : <p>{data.ai_insight}</p>}
</div>
```

---

## 영향받는 API 목록

| API | 추가된 필드 | Breaking Change |
|-----|-----------|----------------|
| `GET /trend/report` | `ai_insight: string` | 없음 (필드 추가만) |
| `GET /trend/best` | `ai_insight: string` | 없음 |
| `GET /forecast` | `ai_insight: string` | 없음 |
| `GET /recommend` | `ai_insight: string` | 없음 |
| `POST /chat` | 변경 없음 | 없음 |

기존 코드를 수정하지 않아도 동작합니다. `ai_insight` 필드를 사용하고 싶을 때만 추가하면 됩니다.
