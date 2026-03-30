export interface RegressionModel {
  slope: number;
  intercept: number;
}

/**
 * 단순 선형 회귀 (최소제곱법)
 * y = slope * x + intercept
 * x는 0부터 시작하는 인덱스 (시간 순서)
 */
export function linearRegression(data: number[]): RegressionModel {
  const n = data.length;

  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: data[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;

  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * 회귀 모델로 미래 값 예측
 * @param model - 회귀 모델 (slope, intercept)
 * @param steps - 예측할 기간 수
 * @param startX - 예측 시작 x값 (기존 데이터 길이)
 */
export function extrapolate(
  model: RegressionModel,
  steps: number,
  startX: number,
): number[] {
  const predictions: number[] = [];

  for (let i = 0; i < steps; i++) {
    predictions.push(model.slope * (startX + i) + model.intercept);
  }

  return predictions;
}
