import {
  fitLinearRegression,
  mae,
  predictLinear,
  rollingAverage,
  safeMape,
} from './forecast-math.util';

describe('forecast-math.util', () => {
  it('computes rolling average on trailing window', () => {
    expect(rollingAverage([1, 2, 3, 4, 5], 3)).toBe(4);
    expect(rollingAverage([10], 7)).toBe(10);
  });

  it('fits linear trend on increasing series', () => {
    const fit = fitLinearRegression([1, 2, 3, 4, 5]);
    expect(fit.slope).toBeCloseTo(1, 5);
    expect(predictLinear(fit, 5)).toBeCloseTo(6, 5);
  });

  it('detects growth / stable / decline directions via slope', () => {
    const up = fitLinearRegression([1, 2, 3, 4]);
    const flat = fitLinearRegression([5, 5, 5, 5]);
    const down = fitLinearRegression([8, 6, 4, 2]);
    expect(up.slope).toBeGreaterThan(0);
    expect(Math.abs(flat.slope)).toBeLessThan(1e-9);
    expect(down.slope).toBeLessThan(0);
  });

  it('computes MAE', () => {
    expect(mae([1, 2, 3], [1, 3, 5])).toBeCloseTo(1, 5);
  });

  it('safe MAPE skips zero actuals and returns null when all zero', () => {
    expect(safeMape([0, 0], [1, 2])).toBeNull();
    expect(safeMape([100, 0, 50], [110, 5, 40])).toBeCloseTo(0.15, 5);
  });
});
