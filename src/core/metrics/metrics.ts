export interface ModelMetrics {
  rmse: number;
  mae: number;
  r2: number | null;
  maxAbsoluteError: number;
  residuals: number[];
}

export function calculateMetrics(observed: number[], predicted: number[]): ModelMetrics {
  if (observed.length !== predicted.length || observed.length === 0) {
    throw new Error("Observed and predicted values must have the same non-zero length.");
  }
  const residuals = observed.map((value, index) => value - predicted[index]!);
  if (residuals.some((value) => !Number.isFinite(value))) {
    throw new Error("Metrics cannot be calculated from non-finite predictions.");
  }
  const squared = residuals.map((value) => value * value);
  const rmse = Math.sqrt(sum(squared) / residuals.length);
  const mae = sum(residuals.map(Math.abs)) / residuals.length;
  const maxAbsoluteError = Math.max(...residuals.map(Math.abs));
  const mean = sum(observed) / observed.length;
  const total = sum(observed.map((value) => (value - mean) ** 2));
  const r2 = total <= Number.EPSILON ? null : 1 - sum(squared) / total;
  return { rmse, mae, r2, maxAbsoluteError, residuals };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function formatNumber(value: number | null, digits = 5): string {
  if (value === null) return "undefined";
  if (!Number.isFinite(value)) return "invalid";
  const absolute = Math.abs(value);
  if ((absolute > 0 && absolute < 0.0001) || absolute >= 1_000_000) {
    return value.toExponential(3);
  }
  return Number(value.toPrecision(digits)).toString();
}
