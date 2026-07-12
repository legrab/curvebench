import type { Point2D } from "../datasets/types";

export type Predictor = (x: number) => number;

export function sortedUnique(points: Point2D[]): Point2D[] {
  const sorted = [...points].sort((left, right) => left.x - right.x);
  for (let index = 1; index < sorted.length; index += 1) {
    if (Math.abs(sorted[index]!.x - sorted[index - 1]!.x) <= Number.EPSILON) {
      throw new Error("Interpolation requires unique x-values.");
    }
  }
  return sorted;
}

export function linearInterpolation(points: Point2D[]): Predictor {
  const sorted = sortedUnique(points);
  return (x) => {
    if (x <= sorted[0]!.x) return sorted[0]!.y;
    if (x >= sorted.at(-1)!.x) return sorted.at(-1)!.y;
    let high = 1;
    while (sorted[high]!.x < x) high += 1;
    const left = sorted[high - 1]!;
    const right = sorted[high]!;
    const ratio = (x - left.x) / (right.x - left.x);
    return left.y + ratio * (right.y - left.y);
  };
}

export function lagrangeInterpolation(points: Point2D[]): Predictor {
  const sorted = sortedUnique(points);
  const weights = sorted.map((point, index) => {
    let product = 1;
    for (let other = 0; other < sorted.length; other += 1) {
      if (other !== index) product *= point.x - sorted[other]!.x;
    }
    return 1 / product;
  });
  return (x) => {
    for (const point of sorted) {
      if (Math.abs(x - point.x) < 1e-12) return point.y;
    }
    let numerator = 0;
    let denominator = 0;
    sorted.forEach((point, index) => {
      const term = weights[index]! / (x - point.x);
      numerator += term * point.y;
      denominator += term;
    });
    return numerator / denominator;
  };
}

export function newtonInterpolation(points: Point2D[]): Predictor {
  const sorted = sortedUnique(points);
  const coefficients = sorted.map((point) => point.y);
  for (let order = 1; order < sorted.length; order += 1) {
    for (let index = sorted.length - 1; index >= order; index -= 1) {
      coefficients[index] =
        (coefficients[index]! - coefficients[index - 1]!) /
        (sorted[index]!.x - sorted[index - order]!.x);
    }
  }
  return (x) => {
    let result = coefficients.at(-1)!;
    for (let index = coefficients.length - 2; index >= 0; index -= 1) {
      result = result * (x - sorted[index]!.x) + coefficients[index]!;
    }
    return result;
  };
}

export function naturalCubicSpline(points: Point2D[]): Predictor {
  const sorted = sortedUnique(points);
  const n = sorted.length;
  if (n === 2) return linearInterpolation(sorted);
  const a = sorted.map((point) => point.y);
  const h = Array.from({ length: n - 1 }, (_, index) => sorted[index + 1]!.x - sorted[index]!.x);
  const alpha = new Array<number>(n).fill(0);
  for (let index = 1; index < n - 1; index += 1) {
    alpha[index] =
      (3 / h[index]!) * (a[index + 1]! - a[index]!) -
      (3 / h[index - 1]!) * (a[index]! - a[index - 1]!);
  }
  const l = new Array<number>(n).fill(0);
  const mu = new Array<number>(n).fill(0);
  const z = new Array<number>(n).fill(0);
  l[0] = 1;
  for (let index = 1; index < n - 1; index += 1) {
    l[index] = 2 * (sorted[index + 1]!.x - sorted[index - 1]!.x) - h[index - 1]! * mu[index - 1]!;
    mu[index] = h[index]! / l[index]!;
    z[index] = (alpha[index]! - h[index - 1]! * z[index - 1]!) / l[index]!;
  }
  l[n - 1] = 1;
  const b = new Array<number>(n - 1).fill(0);
  const c = new Array<number>(n).fill(0);
  const d = new Array<number>(n - 1).fill(0);
  for (let index = n - 2; index >= 0; index -= 1) {
    c[index] = z[index]! - mu[index]! * c[index + 1]!;
    b[index] =
      (a[index + 1]! - a[index]!) / h[index]! - (h[index]! * (c[index + 1]! + 2 * c[index]!)) / 3;
    d[index] = (c[index + 1]! - c[index]!) / (3 * h[index]!);
  }
  return (x) => {
    let interval = n - 2;
    if (x <= sorted[0]!.x) interval = 0;
    else if (x < sorted.at(-1)!.x) {
      interval = 0;
      while (interval < n - 2 && x > sorted[interval + 1]!.x) interval += 1;
    }
    const dx = x - sorted[interval]!.x;
    return a[interval]! + b[interval]! * dx + c[interval]! * dx ** 2 + d[interval]! * dx ** 3;
  };
}
