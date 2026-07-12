import { compileSafeExpression } from "../expressions/safe-expression";
import { createRandom, gaussianNoise } from "../random/seeded";
import type { Dataset2D, Dataset3D } from "./types";
import { sanitizeId } from "./csv";

export type NoiseKind = "none" | "gaussian" | "uniform";

interface GeneratorBase {
  title: string;
  expression: string;
  seed: number;
  noiseKind: NoiseKind;
  noiseMagnitude: number;
  category: string;
}

export interface Generator2DOptions extends GeneratorBase {
  dimension: "2d";
  xMin: number;
  xMax: number;
  pointCount: number;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
}

export interface Generator3DOptions extends GeneratorBase {
  dimension: "3d";
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xCount: number;
  yCount: number;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  zLabel: string;
  zUnit: string;
}

export function generateDataset(
  options: Generator2DOptions | Generator3DOptions,
): Dataset2D | Dataset3D {
  validateRange(options.xMin, options.xMax, "x");
  const random = createRandom(options.seed);
  const noise = () => {
    if (options.noiseKind === "none") return 0;
    const sample = options.noiseKind === "gaussian" ? gaussianNoise(random) : random() * 2 - 1;
    return sample * options.noiseMagnitude;
  };
  const common = {
    schemaVersion: 1 as const,
    id: sanitizeId(options.title),
    title: options.title.trim() || "Generated dataset",
    shortDescription: `Generated from ${options.expression}`.slice(0, 200),
    description: `Generated locally from the expression ${options.expression}.`,
    category: options.category.trim() || "generated",
    tags: ["generated", "formula"],
    synthetic: true,
    sourceNote: "Generated in Curvebench. Not reference data.",
    recommendedModels: [],
    generation: {
      seed: options.seed,
      noiseDescription: `${options.noiseKind} noise, magnitude ${options.noiseMagnitude}`,
      formulaNote: options.expression,
    },
  };

  if (options.dimension === "2d") {
    if (
      !Number.isInteger(options.pointCount) ||
      options.pointCount < 2 ||
      options.pointCount > 150
    ) {
      throw new Error("2D point count must be an integer from 2 through 150.");
    }
    const compiled = compileSafeExpression(options.expression, ["x"]);
    const points = Array.from({ length: options.pointCount }, (_, index) => {
      const x = interpolate(options.xMin, options.xMax, index, options.pointCount);
      return { x, y: compiled.evaluate({ x }) + noise() };
    });
    return {
      ...common,
      dimension: "2d",
      axes: {
        x: { key: "x", label: options.xLabel || "x", unit: options.xUnit },
        y: { key: "y", label: options.yLabel || "y", unit: options.yUnit },
      },
      points,
    };
  }

  validateRange(options.yMin, options.yMax, "y");
  if (
    !Number.isInteger(options.xCount) ||
    !Number.isInteger(options.yCount) ||
    options.xCount < 2 ||
    options.yCount < 2 ||
    options.xCount > 35 ||
    options.yCount > 35 ||
    options.xCount * options.yCount > 1225
  ) {
    throw new Error(
      "3D grid dimensions must be integers from 2 through 35, with at most 1,225 points.",
    );
  }
  const compiled = compileSafeExpression(options.expression, ["x", "y"]);
  const points = [];
  for (let yIndex = 0; yIndex < options.yCount; yIndex += 1) {
    const y = interpolate(options.yMin, options.yMax, yIndex, options.yCount);
    for (let xIndex = 0; xIndex < options.xCount; xIndex += 1) {
      const x = interpolate(options.xMin, options.xMax, xIndex, options.xCount);
      points.push({ x, y, z: compiled.evaluate({ x, y }) + noise() });
    }
  }
  return {
    ...common,
    dimension: "3d",
    axes: {
      x: { key: "x", label: options.xLabel || "x", unit: options.xUnit },
      y: { key: "y", label: options.yLabel || "y", unit: options.yUnit },
      z: { key: "z", label: options.zLabel || "z", unit: options.zUnit },
    },
    points,
  };
}

function interpolate(min: number, max: number, index: number, count: number): number {
  return min + ((max - min) * index) / (count - 1);
}

function validateRange(min: number, max: number, axis: string): void {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    throw new Error(`${axis} minimum must be finite and lower than its maximum.`);
  }
}
