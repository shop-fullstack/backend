import { linearRegression, extrapolate } from './linear-regression';

describe('linearRegression', () => {
  it('증가하는 데이터에서 양의 기울기를 반환해야 한다', () => {
    const data = [1, 2, 3, 4, 5];
    const result = linearRegression(data);

    expect(result.slope).toBeCloseTo(1, 5);
    expect(result.intercept).toBeCloseTo(1, 5);
  });

  it('감소하는 데이터에서 음의 기울기를 반환해야 한다', () => {
    const data = [10, 8, 6, 4, 2];
    const result = linearRegression(data);

    expect(result.slope).toBeLessThan(0);
  });

  it('일정한 데이터에서 기울기 0을 반환해야 한다', () => {
    const data = [5, 5, 5, 5, 5];
    const result = linearRegression(data);

    expect(result.slope).toBeCloseTo(0, 5);
    expect(result.intercept).toBeCloseTo(5, 5);
  });

  it('데이터가 1개이면 기울기 0, intercept는 그 값이어야 한다', () => {
    const data = [7];
    const result = linearRegression(data);

    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(7);
  });

  it('빈 배열이면 기울기 0, intercept 0을 반환해야 한다', () => {
    const result = linearRegression([]);

    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(0);
  });

  it('실제 주문 데이터 패턴에서 합리적인 결과를 반환해야 한다', () => {
    // 주 5개 기간 동안 주문량이 증가하는 패턴
    const weeklyOrders = [10, 12, 15, 18, 22];
    const result = linearRegression(weeklyOrders);

    expect(result.slope).toBeGreaterThan(2);
    expect(result.slope).toBeLessThan(4);
  });
});

describe('extrapolate', () => {
  it('증가 추세에서 미래 값이 현재보다 커야 한다', () => {
    const model = { slope: 2, intercept: 10 };
    const predictions = extrapolate(model, 5, 10);

    // x=10부터 5개: y = 2*10+10, 2*11+10, ...
    expect(predictions).toHaveLength(5);
    expect(predictions[0]).toBe(30);
    expect(predictions[4]).toBe(38);
  });

  it('감소 추세에서 미래 값이 현재보다 작아야 한다', () => {
    const model = { slope: -1, intercept: 50 };
    const predictions = extrapolate(model, 3, 50);

    expect(predictions[0]).toBe(0); // 50 - 50 = 0
    expect(predictions[2]).toBe(-2); // raw value (clamp은 서비스 레벨)
  });

  it('steps가 0이면 빈 배열을 반환해야 한다', () => {
    const model = { slope: 1, intercept: 0 };
    const predictions = extrapolate(model, 0, 0);

    expect(predictions).toEqual([]);
  });
});
