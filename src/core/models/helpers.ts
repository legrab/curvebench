import type { Dataset, Dataset2D, Dataset3D } from "../datasets/types";
import { calculateMetrics } from "../metrics/metrics";
import type {
  ActiveModel,
  EvaluatedModel,
  ModelDefinition,
  ParameterBound,
  ParameterSpec,
  ParameterValues,
  TraceLike,
} from "./types";

export function datasetRange(
  dataset: Dataset,
  key: "x" | "y" | "z",
): { min: number; max: number; span: number } {
  const values = dataset.points.map((point) => point[key as keyof typeof point] as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, span: Math.max(max - min, 1e-9) };
}

export function spec(
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step?: number,
  options: { integer?: boolean; hidden?: boolean } = {},
): ParameterSpec & { value: number } {
  return {
    key,
    label,
    value,
    min,
    max,
    step: step ?? Math.max((max - min) / 500, 1e-6),
    ...options,
  };
}

export function boundsFromSpecs(specs: ParameterSpec[]): Record<string, ParameterBound> {
  return Object.fromEntries(specs.map(({ key, min, max, step }) => [key, { min, max, step }]));
}

export function createActiveModel(
  definition: ModelDefinition,
  dataset: Dataset,
  expression?: string,
): ActiveModel {
  const params = definition.createInitialParams(dataset);
  return {
    id: crypto.randomUUID(),
    type: definition.id,
    name: definition.label,
    visible: true,
    params,
    bounds: boundsFromSpecs(definition.getParameterSpecs(dataset, params)),
    fitStatus: "idle",
    expression,
  };
}

export function createLineTrace(
  dataset: Dataset2D,
  predictor: (x: number) => number,
  name: string,
  options: { samples?: number; dash?: string } = {},
): TraceLike {
  const { min, max } = datasetRange(dataset, "x");
  const samples = options.samples ?? 240;
  const x = Array.from(
    { length: samples },
    (_, index) => min + ((max - min) * index) / (samples - 1),
  );
  const y = x.map(predictor);
  if (y.some((value) => !Number.isFinite(value)))
    throw new Error("Model produced a non-finite value in the graph range.");
  return {
    type: "scatter",
    mode: "lines",
    name,
    x,
    y,
    line: { width: 2.2, dash: options.dash ?? "solid" },
    hovertemplate: "%{x:.5g}, %{y:.5g}<extra>%{fullData.name}</extra>",
  };
}

export function createSurfaceTrace(
  dataset: Dataset3D,
  predictor: (x: number, y: number) => number,
  name: string,
): TraceLike {
  const xRange = datasetRange(dataset, "x");
  const yRange = datasetRange(dataset, "y");
  const count = 28;
  const xs = Array.from(
    { length: count },
    (_, index) => xRange.min + (xRange.span * index) / (count - 1),
  );
  const ys = Array.from(
    { length: count },
    (_, index) => yRange.min + (yRange.span * index) / (count - 1),
  );
  const z = ys.map((y) => xs.map((x) => predictor(x, y)));
  if (z.flat().some((value) => !Number.isFinite(value)))
    throw new Error("Model produced a non-finite surface value.");
  return {
    type: "surface",
    name,
    x: xs,
    y: ys,
    z,
    opacity: 0.58,
    showscale: false,
    hovertemplate: "x=%{x:.4g}<br>y=%{y:.4g}<br>z=%{z:.4g}<extra>%{fullData.name}</extra>",
  };
}

export function evaluateActiveModel(
  active: ActiveModel,
  definition: ModelDefinition,
  dataset: Dataset,
): EvaluatedModel {
  try {
    const validation = definition.validate?.(dataset, active.params);
    if (validation) throw new Error(validation);
    let traces: TraceLike[];
    if (definition.createTrace) {
      traces = definition.createTrace(dataset, active.params, active.name, active.expression);
    } else if (dataset.dimension === "2d" && definition.predict2D) {
      traces = [
        createLineTrace(
          dataset,
          (x) => definition.predict2D!(x, active.params, dataset, active.expression),
          active.name,
        ),
      ];
    } else if (dataset.dimension === "3d" && definition.predict3D) {
      traces = [
        createSurfaceTrace(
          dataset,
          (x, y) => definition.predict3D!(x, y, active.params, dataset, active.expression),
          active.name,
        ),
      ];
    } else {
      throw new Error("This model cannot be evaluated for the current dataset.");
    }

    let metrics;
    if (dataset.dimension === "2d" && definition.predict2D) {
      const predicted = dataset.points.map((point) =>
        definition.predict2D!(point.x, active.params, dataset, active.expression),
      );
      metrics = calculateMetrics(
        dataset.points.map((point) => point.y),
        predicted,
      );
    } else if (dataset.dimension === "3d" && definition.predict3D) {
      const predicted = dataset.points.map((point) =>
        definition.predict3D!(point.x, point.y, active.params, dataset, active.expression),
      );
      metrics = calculateMetrics(
        dataset.points.map((point) => point.z),
        predicted,
      );
    }
    return { active, definition, traces, metrics };
  } catch (error) {
    return {
      active,
      definition,
      traces: [],
      error: error instanceof Error ? error.message : "Model evaluation failed.",
    };
  }
}

export function axisLabel(label: string, unit: string): string {
  return unit ? `${label} (${unit})` : label;
}

export function parameterValue(params: ParameterValues, key: string): number {
  const value = params[key];
  if (!Number.isFinite(value)) throw new Error(`Parameter '${key}' is invalid.`);
  return value!;
}
