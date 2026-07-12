import { describe, expect, it } from "vitest";
import {
  lagrangeInterpolation,
  linearInterpolation,
  naturalCubicSpline,
  newtonInterpolation,
  sortedUnique,
} from "./interpolation";

const points = [
  { x: 0, y: 1 },
  { x: 1, y: 3 },
  { x: 2, y: 9 },
  { x: 3, y: 19 },
];

describe("interpolation", () => {
  it.each([
    ["linear", linearInterpolation],
    ["Lagrange", lagrangeInterpolation],
    ["Newton", newtonInterpolation],
    ["spline", naturalCubicSpline],
  ])("%s passes through source points", (_name, factory) => {
    const predictor = factory(points);
    for (const point of points) expect(predictor(point.x)).toBeCloseTo(point.y, 9);
  });

  it("Lagrange and Newton agree between nodes", () => {
    expect(lagrangeInterpolation(points)(1.5)).toBeCloseTo(newtonInterpolation(points)(1.5), 9);
  });

  it("rejects duplicate x values", () => {
    expect(() =>
      sortedUnique([
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ]),
    ).toThrow(/unique/i);
  });
});
