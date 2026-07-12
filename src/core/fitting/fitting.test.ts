import { describe, expect, it } from "vitest";
import { fitPolynomial, evaluatePolynomial } from "./polynomial";
import { nonlinearLeastSquares } from "./linear-algebra";

describe("fitting", () => {
  it("recovers a quadratic polynomial", () => {
    const points = [-3, -2, -1, 0, 1, 2, 3].map((x) => ({ x, y: 2 + 3 * x - 0.5 * x * x }));
    const fit = fitPolynomial(points, 2);
    for (const point of points) expect(evaluatePolynomial(point.x, fit)).toBeCloseTo(point.y, 8);
  });

  it("converges on a simple exponential", () => {
    const inputs = Array.from({ length: 20 }, (_, index) => [index / 4]);
    const targets = inputs.map(([x]) => 1.2 + 3.4 * Math.exp(-0.7 * x!));
    const result = nonlinearLeastSquares(
      inputs,
      targets,
      { c: 1, a: 3, b: -0.5 },
      (input, p) => p.c! + p.a! * Math.exp(p.b! * input[0]!),
      {
        bounds: { c: { min: -10, max: 10 }, a: { min: -10, max: 10 }, b: { min: -5, max: 5 } },
      },
    );
    expect(result.converged).toBe(true);
    expect(result.params.b).toBeCloseTo(-0.7, 3);
  });
});
