import { describe, expect, it } from "vitest";
import { generateDataset } from "./generator";

describe("formula generator", () => {
  it("generates deterministic 2D data", () => {
    const options = {
      dimension: "2d" as const,
      title: "Line",
      expression: "2*x+1",
      seed: 42,
      noiseKind: "gaussian" as const,
      noiseMagnitude: 0.1,
      category: "test",
      xMin: 0,
      xMax: 5,
      pointCount: 6,
      xLabel: "x",
      xUnit: "",
      yLabel: "y",
      yUnit: "",
    };
    expect(generateDataset(options).points).toEqual(generateDataset(options).points);
  });

  it("generates a bounded 3D grid", () => {
    const dataset = generateDataset({
      dimension: "3d",
      title: "Surface",
      expression: "x+y",
      seed: 1,
      noiseKind: "none",
      noiseMagnitude: 0,
      category: "test",
      xMin: -1,
      xMax: 1,
      yMin: -1,
      yMax: 1,
      xCount: 3,
      yCount: 4,
      xLabel: "x",
      xUnit: "",
      yLabel: "y",
      yUnit: "",
      zLabel: "z",
      zUnit: "",
    });
    expect(dataset.points).toHaveLength(12);
  });
});
