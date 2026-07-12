import { describe, expect, it } from "vitest";
import { csvToDataset, datasetToCsv, parseCsv } from "./csv";

describe("CSV import", () => {
  it("parses 2D and 3D inputs", () => {
    expect(parseCsv("x,y\n0,1\n1,3")).toEqual({
      dimension: "2d",
      points: [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
      ],
    });
    expect(parseCsv("X;Y;Z\n0;1;2\n1;2;4").dimension).toBe("3d");
  });

  it("reports invalid rows", () => {
    expect(() => parseCsv("x,y\n0,1\n1,nope")).toThrow(/row 3/i);
  });

  it("round-trips canonical CSV values", () => {
    const parsed = parseCsv("x,y\n0,1\n1,3");
    const dataset = csvToDataset(parsed, {
      id: "line",
      title: "Line",
      description: "Imported line.",
      category: "test",
      xLabel: "x",
      xUnit: "",
      yLabel: "y",
      yUnit: "",
    });
    expect(datasetToCsv(dataset)).toBe("x,y\n0,1\n1,3");
  });
});
