export interface LinearFit {
  intercept: number;
  slope: number;
  residualStd: number;
}

export function rollingAverage(values: number[], window: number): number {
  if (values.length === 0) {
    return 0;
  }
  const size = Math.max(1, Math.min(window, values.length));
  const slice = values.slice(values.length - size);
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

export function fitLinearRegression(values: number[]): LinearFit {
  const n = values.length;
  if (n === 0) {
    return { intercept: 0, slope: 0, residualStd: 0 };
  }
  if (n === 1) {
    return { intercept: values[0], slope: 0, residualStd: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const residuals = values.map((y, i) => y - (intercept + slope * i));
  const variance =
    residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(n - 2, 1);

  return {
    intercept,
    slope,
    residualStd: Math.sqrt(Math.max(variance, 0)),
  };
}

export function predictLinear(fit: LinearFit, index: number): number {
  return fit.intercept + fit.slope * index;
}

/** Mean absolute error. */
export function mae(actual: number[], predicted: number[]): number | null {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += Math.abs(actual[i] - predicted[i]);
  }
  return sum / n;
}

/**
 * Safe MAPE: skips actuals near zero so division does not explode.
 * Returns null when no eligible points remain.
 */
export function safeMape(
  actual: number[],
  predicted: number[],
  epsilon = 1e-6,
): number | null {
  const n = Math.min(actual.length, predicted.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i += 1) {
    const a = actual[i];
    if (Math.abs(a) < epsilon) {
      continue;
    }
    sum += Math.abs((a - predicted[i]) / a);
    count += 1;
  }
  if (count === 0) {
    return null;
  }
  return sum / count;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
}
