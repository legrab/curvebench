import { describe, expect, it } from "vitest";
import { calculateMetrics } from "./metrics";

describe("calculateMetrics", () => {
  it("returns zero errors for a perfect fit", () => {
    expect(calculateMetrics([1, 2, 3], [1, 2, 3])).toMatchObject({
      rmse: 0,
      mae: 0,
      r2: 1,
      maxAbsoluteError: 0,
    });
  });

  it("leaves R² undefined for a constant target", () => {
    expect(calculateMetrics([4, 4, 4], [4, 4, 4]).r2).toBeNull();
  });
});
