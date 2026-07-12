import { describe, expect, it } from "vitest";
import { compileSafeExpression } from "./safe-expression";

describe("safe expressions", () => {
  it("evaluates approved mathematical syntax", () => {
    const expression = compileSafeExpression("2*x + sin(pi/2)", ["x"]);
    expect(expression.evaluate({ x: 3 })).toBeCloseTo(7);
  });

  it("extracts custom parameters", () => {
    const expression = compileSafeExpression("a*sin(b*x)+c", ["x"], true);
    expect(expression.parameters).toEqual(["a", "b", "c"]);
  });

  it("rejects assignments and unknown symbols", () => {
    expect(() => compileSafeExpression("x = 4", ["x"])).toThrow(/not allowed/i);
    expect(() => compileSafeExpression("secret + x", ["x"])).toThrow(/unknown symbol/i);
  });
});
