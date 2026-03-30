/**
 * 단순 이동평균 (SMA)
 * 윈도우 크기만큼의 연속 구간 평균을 계산
 */
export function movingAverage(data: number[], window: number): number[] {
  if (data.length < window || data.length === 0) return [];

  const result: number[] = [];

  for (let i = 0; i <= data.length - window; i++) {
    let sum = 0;
    for (let j = 0; j < window; j++) {
      sum += data[i + j];
    }
    result.push(sum / window);
  }

  return result;
}

/**
 * 가중 이동평균 (WMA)
 * 최근 데이터에 더 높은 가중치를 부여
 * 가중치: 1, 2, 3, ..., window (최근일수록 높음)
 */
export function weightedMovingAverage(
  data: number[],
  window: number,
): number[] {
  if (data.length < window || data.length === 0) return [];

  const result: number[] = [];
  const weightSum = (window * (window + 1)) / 2;

  for (let i = 0; i <= data.length - window; i++) {
    let weightedSum = 0;
    for (let j = 0; j < window; j++) {
      weightedSum += data[i + j] * (j + 1);
    }
    result.push(weightedSum / weightSum);
  }

  return result;
}
