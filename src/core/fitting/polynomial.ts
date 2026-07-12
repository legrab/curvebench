import { leastSquares } from "./linear-algebra";

export interface PolynomialFit {
  coefficients: number[];
  center: number;
  scale: number;
}

export function fitPolynomial(
  points: Array<{ x: number; y: number }>,
  degree: number,
): PolynomialFit {
  if (!Number.isInteger(degree) || degree < 1 || degree > 10) {
    throw new Error("Polynomial degree must be an integer from 1 through 10.");
  }
  if (degree >= points.length)
    throw new Error("Polynomial degree must be lower than the point count.");
  const xs = points.map((point) => point.x);
  const center = (Math.min(...xs) + Math.max(...xs)) / 2;
  const scale = Math.max((Math.max(...xs) - Math.min(...xs)) / 2, 1);
  const design = points.map((point) => {
    const normalized = (point.x - center) / scale;
    return Array.from({ length: degree + 1 }, (_, power) => normalized ** power);
  });
  return {
    coefficients: leastSquares(
      design,
      points.map((point) => point.y),
    ),
    center,
    scale,
  };
}

export function evaluatePolynomial(x: number, fit: PolynomialFit): number {
  const normalized = (x - fit.center) / fit.scale;
  return fit.coefficients.reduceRight((value, coefficient) => value * normalized + coefficient, 0);
}
