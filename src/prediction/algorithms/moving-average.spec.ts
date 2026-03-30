import { movingAverage, weightedMovingAverage } from './moving-average';

describe('movingAverage', () => {
  it('윈도우 크기 3으로 이동평균을 계산해야 한다', () => {
    const data = [10, 20, 30, 40, 50];
    const result = movingAverage(data, 3);

    // [avg(10,20,30), avg(20,30,40), avg(30,40,50)]
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(20, 5);
    expect(result[1]).toBeCloseTo(30, 5);
    expect(result[2]).toBeCloseTo(40, 5);
  });

  it('윈도우 크기가 데이터 길이와 같으면 하나의 평균만 반환', () => {
    const data = [10, 20, 30];
    const result = movingAverage(data, 3);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(20, 5);
  });

  it('윈도우 크기가 데이터 길이보다 크면 빈 배열 반환', () => {
    const data = [10, 20];
    const result = movingAverage(data, 5);

    expect(result).toEqual([]);
  });

  it('빈 배열이면 빈 배열 반환', () => {
    expect(movingAverage([], 3)).toEqual([]);
  });

  it('일정한 데이터에서 이동평균도 일정해야 한다', () => {
    const data = [5, 5, 5, 5, 5];
    const result = movingAverage(data, 3);

    result.forEach((v) => expect(v).toBeCloseTo(5, 5));
  });
});

describe('weightedMovingAverage', () => {
  it('최근 데이터에 더 높은 가중치를 줘야 한다', () => {
    const data = [10, 10, 10, 10, 100];
    const sma = movingAverage(data, 5);
    const wma = weightedMovingAverage(data, 5);

    // WMA는 최근 값(100)에 가중치를 더 주므로 SMA보다 커야 함
    expect(wma[0]).toBeGreaterThan(sma[0]);
  });

  it('일정한 데이터에서 SMA와 WMA가 같아야 한다', () => {
    const data = [5, 5, 5, 5, 5];
    const sma = movingAverage(data, 5);
    const wma = weightedMovingAverage(data, 5);

    expect(wma[0]).toBeCloseTo(sma[0], 5);
  });

  it('빈 배열이면 빈 배열 반환', () => {
    expect(weightedMovingAverage([], 3)).toEqual([]);
  });

  it('윈도우 크기가 데이터보다 크면 빈 배열 반환', () => {
    expect(weightedMovingAverage([1, 2], 5)).toEqual([]);
  });
});
